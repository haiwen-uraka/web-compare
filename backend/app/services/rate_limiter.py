"""Simple in-memory rate limiter."""
import time
from collections import defaultdict

from app.config import settings


class RateLimiter:
    """Sliding-window rate limiter keyed by client IP."""

    def __init__(self, requests_per_minute: int = 10):
        self._rate = requests_per_minute
        self._window = 60  # 1 minute
        self._clients: dict[str, list[float]] = defaultdict(list)

    def is_allowed(self, client_key: str) -> bool:
        """Check if a client is within rate limit. Returns True if allowed."""
        now = time.time()
        cutoff = now - self._window

        # Clean old entries
        self._clients[client_key] = [
            t for t in self._clients[client_key] if t > cutoff
        ]

        if len(self._clients[client_key]) >= self._rate:
            return False

        self._clients[client_key].append(now)
        return True

    def remaining(self, client_key: str) -> int:
        """Return remaining allowed requests in current window."""
        now = time.time()
        cutoff = now - self._window
        self._clients[client_key] = [
            t for t in self._clients[client_key] if t > cutoff
        ]
        return max(0, self._rate - len(self._clients[client_key]))

    def cleanup(self):
        """Remove expired entries to free memory."""
        now = time.time()
        cutoff = now - self._window
        expired = []
        for key, timestamps in self._clients.items():
            self._clients[key] = [t for t in timestamps if t > cutoff]
            if not self._clients[key]:
                expired.append(key)
        for key in expired:
            del self._clients[key]


rate_limiter = RateLimiter(requests_per_minute=settings.rate_limit_per_minute)
