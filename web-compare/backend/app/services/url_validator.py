"""URL validation and security checks."""
import ipaddress
import socket
from urllib.parse import urlparse

from app.config import settings

BLOCKED_HOSTS = {
    "localhost",
    "127.0.0.1",
    "::1",
    "0.0.0.0",
    "metadata.google.internal",
    "169.254.169.254",
}

BLOCKED_NETWORKS = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("100.64.0.0/10"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("::ffff:127.0.0.0/104"),  # IPv6-mapped IPv4 loopback
]


def validate_url(url: str) -> tuple[bool, str]:
    """Validate URL safety. Returns (is_valid, error_message)."""
    parsed = urlparse(url)

    if parsed.scheme not in ("http", "https"):
        return False, "Only http and https protocols are supported"

    host = parsed.hostname
    if not host:
        return False, "Unable to resolve hostname"

    if host.lower() in BLOCKED_HOSTS:
        return False, "Access to this address is not allowed"

    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        pass
    else:
        for net in BLOCKED_NETWORKS:
            if ip in net:
                return False, "Access to internal network addresses is not allowed"

    try:
        resolved = socket.getaddrinfo(host, None, 0, socket.SOCK_STREAM, socket.IPPROTO_TCP)
        for _, _, _, _, sockaddr in resolved:
            ip_str = sockaddr[0]
            try:
                resolved_ip = ipaddress.ip_address(ip_str)
            except ValueError:
                continue
            for net in BLOCKED_NETWORKS:
                if resolved_ip in net:
                    return False, f"Domain resolves to internal address, access denied"
    except socket.gaierror:
        pass

    if settings.allowed_domains:
        if host not in settings.allowed_domains and not any(
            host.endswith("." + d) for d in settings.allowed_domains
        ):
            return False, f"Domain {host} is not in the allowed list"

    return True, ""
