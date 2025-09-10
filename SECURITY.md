# Security Policy

## Supported Versions

This project currently supports the latest version with security updates.

## Reporting a Vulnerability

If you discover a security vulnerability, please report it by creating an issue or contacting the maintainers directly.

## Security Measures Implemented

### Input Validation
- Environment variable validation on startup
- Request parameter sanitization
- Mongoose schema validation with strict limits
- URL validation for voice recordings

### Rate Limiting
- Basic rate limiting: 50 requests per minute per IP
- Configurable rate limiting windows

### Security Headers
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- Content-Security-Policy: default-src 'self'
- Strict-Transport-Security for HTTPS

### Data Protection
- Request size limits (10MB)
- MongoDB connection error handling
- Graceful shutdown procedures
- Enhanced error logging without sensitive data exposure

### Dependencies
- Regular dependency updates for security patches
- Removal of deprecated packages where possible
- Use of official package sources only

## Known Issues

### Critical Dependencies
Some dependencies have known vulnerabilities that require major version updates:
- mongoose: Very old version (4.x) with multiple vulnerabilities
- node-telegram-bot-api: Uses deprecated request library
- stripe: Old version with qs vulnerability

These require careful migration planning due to breaking changes.

## Recommendations for Production

1. Set up proper HTTPS/TLS
2. Use a reverse proxy (nginx/Apache) with additional security headers
3. Implement proper logging and monitoring
4. Use environment-specific configuration
5. Regular security audits and dependency updates
6. Database connection encryption
7. Implement proper authentication if needed