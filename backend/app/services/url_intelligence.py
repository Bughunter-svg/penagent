import re
from urllib.parse import urlparse, parse_qs

class URLIntelligence:
    """Classifies URLs and extracts interesting patterns."""

    API_PATTERNS = ['/api/', '/v1/', '/v2/', '/v3/', '/graphql', '/rest/']
    AUTH_PATTERNS = ['/login', '/signin', '/auth', '/oauth', '/sso', '/token', '/session']
    ADMIN_PATTERNS = ['/admin', '/dashboard', '/manage', '/panel', '/console']
    UPLOAD_PATTERNS = ['/upload', '/file', '/import', '/attachment']
    GRAPHQL_PATTERNS = ['/graphql', '/gql']
    OAUTH_PATTERNS = ['/oauth', '/callback', '/authorize', '/token']
    REDIRECT_PATTERNS = ['/redirect', '/return', '/callback', '/next=', '/url=']
    SENSITIVE_PATTERNS = ['/debug', '/test', '/staging', '/internal', '/backup', '/.env', '/.git', '/config']

    @classmethod
    def classify_url(cls, url: str) -> str:
        url_lower = url.lower()
        if any(p in url_lower for p in cls.AUTH_PATTERNS): return 'auth'
        if any(p in url_lower for p in cls.ADMIN_PATTERNS): return 'admin'
        if any(p in url_lower for p in cls.API_PATTERNS): return 'api'
        if any(p in url_lower for p in cls.UPLOAD_PATTERNS): return 'upload'
        if any(p in url_lower for p in cls.GRAPHQL_PATTERNS): return 'graphql'
        if any(p in url_lower for p in cls.OAUTH_PATTERNS): return 'oauth'
        if any(p in url_lower for p in cls.REDIRECT_PATTERNS): return 'redirect'
        if any(p in url_lower for p in cls.SENSITIVE_PATTERNS): return 'sensitive'
        
        # Static asset detection
        ext = cls.get_file_extension(url_lower)
        if ext in ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf']:
            return 'static'
            
        return 'unknown'

    @classmethod
    def extract_parameters(cls, url: str) -> list[dict]:
        params = []
        try:
            parsed = urlparse(url)
            qs = parse_qs(parsed.query)
            for name, values in qs.items():
                params.append({
                    "name": name,
                    "param_type": "query",
                    "sample_value": values[0] if values else ""
                })
        except Exception:
            pass
        return params

    @classmethod
    def extract_paths(cls, url: str) -> list[str]:
        try:
            parsed = urlparse(url)
            return [p for p in parsed.path.split('/') if p]
        except Exception:
            return []

    @classmethod
    def get_file_extension(cls, url: str) -> str | None:
        try:
            parsed = urlparse(url)
            path = parsed.path
            if '.' in path:
                ext = '.' + path.split('.')[-1].lower()
                # Basic check to ensure it's not a weird route mapping
                if len(ext) <= 5 and ext.isalpha() or ext[1:].isalnum():
                    return ext
        except Exception:
            pass
        return None
