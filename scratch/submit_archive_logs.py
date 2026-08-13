#!/usr/bin/env python3
"""Submit all archived AI logs in .ai-log/archive/ to grading server."""
import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path

def load_env():
    env_file = Path(__file__).resolve().parent.parent / ".env"
    if not env_file.is_file():
        return
    for raw_line in env_file.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        if line.startswith("export "):
            line = line[7:].lstrip()
        key, value = line.split("=", 1)
        key, value = key.strip(), value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        os.environ.setdefault(key, value)

load_env()

SERVER_URL = os.environ.get("AI_LOG_SERVER", "")
API_KEY = os.environ.get("AI_LOG_API_KEY", "")
ARCHIVE_DIR = Path(".ai-log/archive")

if not SERVER_URL:
    print("AI_LOG_SERVER not configured in .env", file=sys.stderr)
    sys.exit(1)

if not ARCHIVE_DIR.exists():
    print("No archive directory found.", file=sys.stderr)
    sys.exit(0)

archive_files = sorted(ARCHIVE_DIR.glob("*.jsonl"))
print(f"Found {len(archive_files)} archive file(s) in {ARCHIVE_DIR}")

total_submitted = 0
for archive_file in archive_files:
    entries = []
    with open(archive_file, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entries.append(json.loads(line))
            except json.JSONDecodeError:
                pass

    if not entries:
        print(f"Skipping empty archive file: {archive_file.name}")
        continue

    # Batch submit in chunks of 500
    batch_size = 500
    for i in range(0, len(entries), batch_size):
        chunk = entries[i:i + batch_size]
        payload = json.dumps({"entries": chunk}, ensure_ascii=False).encode("utf-8")
        headers = {"Content-Type": "application/json"}
        if API_KEY:
            headers["Authorization"] = f"Bearer {API_KEY}"
        
        req = urllib.request.Request(SERVER_URL, data=payload, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                print(f"[{archive_file.name}] Submitted batch {i//batch_size + 1} ({len(chunk)} entries) -> HTTP {resp.status}")
                total_submitted += len(chunk)
        except urllib.error.URLError as e:
            print(f"[{archive_file.name}] Failed to submit batch: {e}", file=sys.stderr)

print(f"Finished! Total archived entries submitted to Phoenix: {total_submitted}")
