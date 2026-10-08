# Security policy

Security fixes target the latest Sloy UI release. Update older installations before reporting a problem when practical.

Report vulnerabilities through [GitHub private vulnerability reporting](https://github.com/davidyich/sloyui/security/advisories/new). Include affected versions, a minimal reproduction and expected impact. Do not disclose credentials or exploitable details in a public issue.

The local instruction editor is a development feature bound to loopback. Do not expose the development server publicly. Built catalogue pages contain read-only core documentation; local instruction drafts are excluded from the build and package.

The public repository enables secret scanning and push protection. CI uses read-only permissions and does not run privileged pull-request workflows. These controls supplement code review; they do not guarantee absence of vulnerabilities.
