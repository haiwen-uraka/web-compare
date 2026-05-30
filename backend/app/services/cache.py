"""Simple LRU cache for comparison results."""
from collections import OrderedDict
from datetime import datetime, timedelta, timezone
import hashlib
import logging

logger = logging.getLogger(__name__)


class LRUComparisonCache:
    """In-memory LRU cache keyed by (url_a, url_b) hash.

    Stores the most recent completed ComparisonResult for a URL pair.
    Entries expire after cache_ttl_hours.
    """

    def __init__(self, maxsize: int = 32, ttl_hours: int = 1):
        self._cache: OrderedDict[str, dict] = OrderedDict()
        self._maxsize = maxsize
        self._ttl = timedelta(hours=ttl_hours)

    def _make_key(self, url_a: str, url_b: str) -> str:
        # Sort URLs so (A,B) and (B,A) produce the same key
        pair = tuple(sorted([url_a.strip().lower(), url_b.strip().lower()]))
        raw = f"{pair[0]}||{pair[1]}"
        return hashlib.sha256(raw.encode()).hexdigest()[:16]

    def get(self, url_a: str, url_b: str):
        """Return cached result if exists and not expired, else None."""
        key = self._make_key(url_a, url_b)
        if key not in self._cache:
            return None
        entry = self._cache[key]
        # Check expiry
        if datetime.now(timezone.utc) - entry["cached_at"] > self._ttl:
            del self._cache[key]
            logger.info("Cache entry expired for %s vs %s", url_a, url_b)
            return None
        # Move to end (most recently used)
        self._cache.move_to_end(key)
        logger.info("Cache hit for %s vs %s", url_a, url_b)
        return entry["result"]

    def put(self, url_a: str, url_b: str, result):
        """Store a result in cache."""
        key = self._make_key(url_a, url_b)
        self._cache[key] = {
            "result": result,
            "cached_at": datetime.now(timezone.utc),
        }
        self._cache.move_to_end(key)
        # Evict oldest if over maxsize
        while len(self._cache) > self._maxsize:
            self._cache.popitem(last=False)
        logger.info("Cached result for %s vs %s", url_a, url_b)

    def invalidate(self, url_a: str, url_b: str):
        """Remove a cached entry."""
        key = self._make_key(url_a, url_b)
        if key in self._cache:
            del self._cache[key]

    @property
    def size(self) -> int:
        return len(self._cache)

    @property
    def keys(self) -> list[str]:
        return list(self._cache.keys())


# Global cache instance
comparison_cache = LRUComparisonCache(maxsize=32, ttl_hours=1)
