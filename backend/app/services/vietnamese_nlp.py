"""Vietnamese NLP singleton using underthesea for text tokenization."""

import logging
import threading

logger = logging.getLogger(__name__)

# Common Vietnamese stopwords (function words, particles, connectors)
VIETNAMESE_STOPWORDS = frozenset([
    "và", "của", "các", "có", "được", "cho", "là", "trong", "với",
    "để", "không", "này", "từ", "đã", "một", "những", "về", "theo",
    "cũng", "như", "tại", "đến", "còn", "khi", "sẽ", "hoặc",
    "bởi", "trên", "đó", "nếu", "hay", "người", "thì", "làm",
    "nhưng", "sau", "vì", "rất", "tất", "cả", "bị", "nên",
    "đang", "mà", "do", "ra", "lên", "chỉ", "hơn", "qua",
    "lại", "đây", "thêm", "vào", "phải", "nào", "nhiều", "đều",
    "bạn", "chúng", "tôi", "anh", "chị", "em", "ông", "bà",
    "họ", "ai", "gì", "sao", "thế", "ấy", "ở", "rồi",
    "vậy", "mỗi", "cùng", "lúc", "luôn", "ngoài", "trước",
    "dưới", "giữa", "cần", "biết", "thấy", "việc", "năm",
    "ngày", "tháng", "tuần",
])


class VietnameseNLP:
    """Singleton NLP processor for Vietnamese text using underthesea."""

    _instance = None
    _lock = threading.Lock()
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def _ensure_init(self):
        """Lazy-load underthesea on first use."""
        if not self._initialized:
            with self._lock:
                if not self._initialized:
                    try:
                        from underthesea import word_tokenize
                        self._word_tokenize = word_tokenize
                        self._initialized = True
                        logger.info("underthesea initialized successfully")
                    except ImportError:
                        logger.warning(
                            "underthesea not installed, falling back to simple split"
                        )
                        self._word_tokenize = None
                        self._initialized = True

    def tokenize(self, text: str) -> list[str]:
        """Tokenize Vietnamese text into words, filtering stopwords.

        Returns lowercased tokens with stopwords and short tokens removed.
        """
        if not text or not text.strip():
            return []

        self._ensure_init()

        if self._word_tokenize:
            tokens = self._word_tokenize(text)
        else:
            # Fallback: simple whitespace split
            tokens = text.split()

        # Normalize: lowercase, strip, filter stopwords and short tokens
        result = []
        for token in tokens:
            t = token.lower().strip()
            if len(t) < 2:
                continue
            if t in VIETNAMESE_STOPWORDS:
                continue
            # Skip pure numbers and punctuation
            if t.isdigit() or all(c in ".,;:!?-_/\\()[]{}\"'" for c in t):
                continue
            result.append(t)

        return result

    def extract_keywords(self, text: str) -> set[str]:
        """Extract unique keyword set from text."""
        return set(self.tokenize(text))


def get_nlp() -> VietnameseNLP:
    """Get the singleton NLP instance."""
    return VietnameseNLP()
