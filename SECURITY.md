# Security Policy

## Supported version

Security and privacy fixes are applied to the latest release of GroupRail.

## Reporting a vulnerability

Please use GitHub's private vulnerability-reporting or security-advisory flow for this repository when it is available. If private reporting is unavailable, open a minimal GitHub issue asking for a private contact channel; do not include passwords, cookies, private URLs, browser-profile data, or exploit details in a public issue.

GroupRail is a local Manifest V3 extension. A useful report should identify the affected GroupRail version, the relevant browser version, the exact action that triggers the issue, and whether the behavior occurs in a clean browser profile.

## Security design

- No content scripts, host permissions, external messaging surface, analytics, telemetry, or remote application service.
- Tab and group changes use Edge's supported `tabs` and `tabGroups` APIs.
- Favicons are rendered through Edge's browser-local extension favicon resource; direct remote favicon URLs are rejected and extension images are restricted to local or embedded sources.
- Group matching stores privacy-minimized URL keys locally. Credentials, query strings, fragments, invalid URLs, and local file paths are not retained, and records for groups that no longer exist are pruned.
- Untrusted titles and group names are rendered as text, never executable HTML.
