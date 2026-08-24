"""Production-safe cache envelope with schema versioning, compression, and anti-zip-bomb protection."""

from __future__ import annotations

import base64
import json
import logging
import time
import zlib
from dataclasses import dataclass

from pydantic import ValidationError

from src.models.cv_fingerprint import PARSER_VERSION, CVFingerprint

logger = logging.getLogger(__name__)

CURRENT_SCHEMA_VERSION = "v1"
DEFAULT_COMPRESSION_THRESHOLD_BYTES = 1024  # 1 KB compression threshold
MAX_ENVELOPE_SIZE_BYTES = 5 * 1024 * 1024   # 5 MB maximum envelope payload size
MAX_DECOMPRESSED_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB maximum decompressed size (anti-zip bomb)


class CacheEnvelopeError(Exception):
    """Base exception for envelope deserialization or validation errors."""
    pass


class OversizedPayloadError(CacheEnvelopeError):
    """Payload exceeds safety thresholds."""
    pass


class SchemaVersionMismatchError(CacheEnvelopeError):
    """Envelope schema version does not match expected version."""
    pass


class ParserVersionMismatchError(CacheEnvelopeError):
    """Parser version does not match requested version."""
    pass


@dataclass
class CacheEnvelope:
    """Versioned envelope wrapping cached CVFingerprint payload."""
    schema_version: str
    parser_version: str
    compression: str  # "none" | "zlib"
    payload: str      # JSON string or base64-encoded compressed JSON string
    created_at: float

    def to_json_bytes(self) -> bytes:
        """Convert envelope to JSON-encoded bytes."""
        data = {
            "schema_version": self.schema_version,
            "parser_version": self.parser_version,
            "compression": self.compression,
            "payload": self.payload,
            "created_at": self.created_at,
        }
        return json.dumps(data).encode("utf-8")

    @classmethod
    def wrap_fingerprint(
        cls,
        fingerprint: CVFingerprint,
        schema_version: str = CURRENT_SCHEMA_VERSION,
        parser_version: str | None = None,
        compression_threshold_bytes: int = DEFAULT_COMPRESSION_THRESHOLD_BYTES,
    ) -> bytes:
        """Serialize CVFingerprint into safe versioned & compressed CacheEnvelope bytes."""
        p_ver = parser_version or fingerprint.parser_version or PARSER_VERSION
        # Copy fingerprint without dynamic durations to keep parse cache purely structural
        fp_copy = fingerprint.model_copy(deep=True)
        fp_copy.skill_durations = {}
        fp_copy.calculated_as_of = None

        raw_json_str = fp_copy.model_dump_json()
        raw_json_bytes = raw_json_str.encode("utf-8")

        if len(raw_json_bytes) > MAX_DECOMPRESSED_SIZE_BYTES:
            raise OversizedPayloadError(f"Fingerprint JSON size ({len(raw_json_bytes)} B) exceeds limit")

        if len(raw_json_bytes) > compression_threshold_bytes:
            compressed = zlib.compress(raw_json_bytes, level=6)
            b64_str = base64.b64encode(compressed).decode("ascii")
            compression_type = "zlib"
            payload_str = b64_str
        else:
            compression_type = "none"
            payload_str = raw_json_str

        envelope = cls(
            schema_version=schema_version,
            parser_version=p_ver,
            compression=compression_type,
            payload=payload_str,
            created_at=time.time(),
        )
        envelope_bytes = envelope.to_json_bytes()
        if len(envelope_bytes) > MAX_ENVELOPE_SIZE_BYTES:
            raise OversizedPayloadError(f"Envelope size ({len(envelope_bytes)} B) exceeds limit")
        return envelope_bytes

    @classmethod
    def unwrap_fingerprint(
        cls,
        raw_bytes: bytes,
        expected_parser_version: str = PARSER_VERSION,
        expected_schema_version: str = CURRENT_SCHEMA_VERSION,
        max_envelope_size_bytes: int = MAX_ENVELOPE_SIZE_BYTES,
        max_decompressed_size_bytes: int = MAX_DECOMPRESSED_SIZE_BYTES,
    ) -> CVFingerprint:
        """Safely deserialize, decompress, and validate CVFingerprint from CacheEnvelope bytes."""
        if len(raw_bytes) > max_envelope_size_bytes:
            raise OversizedPayloadError(
                f"Envelope raw bytes ({len(raw_bytes)} B) exceed limit ({max_envelope_size_bytes} B)"
            )

        try:
            data = json.loads(raw_bytes.decode("utf-8"))
        except Exception as exc:
            raise CacheEnvelopeError(f"Malformed JSON in cache envelope: {exc}") from exc

        if not isinstance(data, dict):
            raise CacheEnvelopeError("Cache data is not a JSON object")

        # Backward compatibility: Check if raw data is legacy un-enveloped CVFingerprint JSON
        if "schema_version" not in data and "content_hash" in data:
            logger.info("Detected legacy un-enveloped CVFingerprint. Attempting backward-compatible load.")
            try:
                fp = CVFingerprint.model_validate(data)
                if fp.parser_version != expected_parser_version:
                    raise ParserVersionMismatchError(
                        f"Legacy parser_version '{fp.parser_version}' != '{expected_parser_version}'"
                    )
                return fp
            except ValidationError as exc:
                raise CacheEnvelopeError(f"Legacy CVFingerprint validation failed: {exc}") from exc

        # Envelope Validation
        schema_ver = data.get("schema_version")
        if schema_ver != expected_schema_version:
            raise SchemaVersionMismatchError(
                f"Schema version mismatch: got '{schema_ver}', expected '{expected_schema_version}'"
            )

        parser_ver = data.get("parser_version")
        if parser_ver != expected_parser_version:
            raise ParserVersionMismatchError(
                f"Parser version mismatch: got '{parser_ver}', expected '{expected_parser_version}'"
            )

        compression = data.get("compression", "none")
        payload = data.get("payload")
        if not isinstance(payload, str):
            raise CacheEnvelopeError("Missing or invalid payload in envelope")

        if compression == "none":
            json_str = payload
            if len(json_str.encode("utf-8")) > max_decompressed_size_bytes:
                raise OversizedPayloadError("Payload exceeds max decompressed size")
        elif compression == "zlib":
            try:
                compressed_bytes = base64.b64decode(payload.encode("ascii"), validate=True)
            except Exception as exc:
                raise CacheEnvelopeError(f"Invalid base64 payload: {exc}") from exc

            # Anti-Decompression Bomb safe decompression
            decompressor = zlib.decompressobj()
            decompressed_bytes = decompressor.decompress(compressed_bytes, max_decompressed_size_bytes + 1)
            if len(decompressed_bytes) > max_decompressed_size_bytes or decompressor.unconsumed_tail:
                raise OversizedPayloadError("Decompressed payload exceeds safety threshold (potential zip bomb)")
            json_str = decompressed_bytes.decode("utf-8")
        else:
            raise CacheEnvelopeError(f"Unsupported compression algorithm: {compression}")

        # Pydantic re-validation
        try:
            return CVFingerprint.model_validate_json(json_str)
        except ValidationError as exc:
            raise CacheEnvelopeError(f"Pydantic validation failed for cached CVFingerprint: {exc}") from exc
