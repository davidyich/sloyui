# Devos deployment

The catalogue is served at https://sloyui.com by Caddy on `devos` (`138.124.123.40`). Vercel remains the DNS provider. The explicit root A record has TTL 60 and overrides the protected default ALIAS record.

## Develop and publication

CI and the deployed catalogue service use Node 24. Keep the workflow runtime aligned with the service: server integration tests import the built-in `node:sqlite` module.

Normal additional development goes to https://sloyui.com/develop/. Run `npm run release:develop`, or run check, pack:kit, verify:package and `bash scripts/deploy-devos.sh devos`. The script defaults to Develop and changes only `/srv/sloyui/develop` and `/srv/sloyui/data/develop-source`; the main release and data stay unchanged.

The main site uses `/srv/sloyui/current`, `/srv/sloyui/data/source` and port 4318. Develop uses its own pointer, SQLite/mirrors and port 4319. Both share the existing owner identity and session cookie; login always runs on the main callback and safely returns to Develop when requested. Production assets use relative URLs so the exact same verified build can run under /develop/ and / without rebuilding. Caddy strips /develop only for its own API/static routes; downloads and document reads resolve within the selected channel.

Authenticated owners see Publish in the Develop settings dock. The confirmation loads the exact Develop release/version and a revision of both releases and their complete SQLite contents. Guests do not see the action, and the API rejects anonymous or cross-origin requests. Only the confirmed revision can enqueue a publication; duplicate and stale requests return 409.

`sloyui-publish.path` watches the private request directory. Its worker serializes with deployments, stops both APIs, checks the reviewed revision again, backs up production code/data, copies the consistent Develop data snapshot and atomically points production to the exact Develop release. Health failure restores production code and data. Develop remains a separate editable store after publication. The worker writes its result so the dialog can report completion after API restarts. Saved Develop data replaces production data; the confirmation says so explicitly, and changes made to either channel after review invalidate that confirmation.

`bash scripts/deploy-devos.sh devos bootstrap` performs the one-time infrastructure installation (both API services, Caddy routes, publication watcher, main-site Develop link). It retains the already published frontend/data and adds a small owner-only link bridge to its settings; feature code is still staged separately. The bridge disappears when a complete Develop build is promoted. Use this only when maintaining the publishing infrastructure, not for normal feature delivery. Services and manager files remain outside the public web roots; neither catalogue API can write release pointers or execute systemctl. Publication runs through the separate worker under the existing deployment account.

Releases include site/, server/, source seeds and private release.json metadata. Uploads are kept in ignored artifacts/deployment/. Deploys validate the JavaScript module graph, archives and Caddy, back up the selected channel data/configuration, import seeds while preserving owner edits and switch its pointer atomically. Both deploys and publication use /srv/sloyui/.release.lock.

## Identity and persistent source

Sloy UI uses the existing Devos Auth OIDC provider at `https://auth.devos.run/api/auth`. Devos Auth owns the preserved Refletica password and second factor. Sloy UI does not copy its identity database or encryption key. The registered confidential client `sloyui-admin` requires PKCE and has one callback: `https://sloyui.com/api/admin/auth/callback`.

The protected provider export `/home/devos/projects/devos-auth/state/sloy-client.json` is installed once as `/srv/sloyui/private/oidc-client.json` (0600). Never print or commit it. Changing provider credentials requires coordinated rotation; deployments do not rotate them.

Login verifies the signed ID token, issuer, audience, nonce, state, exact owner subject and `sloyui:admin` role. The browser receives an opaque HttpOnly, Secure, SameSite=Lax cookie. Sessions last eight hours and persist in the private directory. Mutations require an authenticated owner session, the exact site Origin and a current catalogue revision. Logout invalidates the local session and opens the provider's registered end-session flow.

The authoritative production store is `/srv/sloyui/data/source/catalog.sqlite`; `component-registry.json` and `catalog-settings.json` in the same directory are repairable source mirrors. Status changes update registry records by stable `cp-*` ID; groups and memberships are preserved. The announcement editor saves `message`, `actionLabel` and `href`; `[text]` renders a highlighted Tag without brackets, and remaining content is plain text. Links accept a site fragment/path or HTTPS. Legacy version/title/description/tag fields remain for already-open older catalogue clients; `message` is the current content source. A three-way merge with the previous deployment baseline preserves status and editable announcement fields on later releases while applying incoming source changes. To bring production edits back into Git, copy these source files deliberately and review the diff before committing.

Hold the sidebar logo continuously for five seconds to enter. The authenticated footer settings action beside the language switch opens `#admin`; it contains the Announcement Bar switch and sign-out. Announcement visibility is global; dismissing an announcement affects only the visitor's browser. Theme/accent/surface/surface-scheme/borders/radius remain local preview preferences. The surface picker opens a direct Select list. The independent Standard/Dimmed scheme control remains available in both Light and Dark; it selects full reference contexts, including Shell. Saved `inverted` preferences migrate to `dimmed`; the `inverted` runtime name remains a compatibility alias. The catalogue announcement establishes Overlay while inheriting the other independent axes.

Local Vite serves public catalogue state from source and sends login to production. Set `CATALOG_API_URL` only for an explicitly isolated local API fixture. Production never enables the loopback-only QA identity option.

SQLite persistence is `/srv/sloyui/data/source/catalog.sqlite` with WAL and schema version 1. The server imports status/announcement JSON and versioned release/document seeds, preserves owner edits and writes production document mirrors under `/srv/sloyui/data/source/documents/`. Kit and component histories are public reads; document, history, status and announcement mutations require the same owner session and revision checks. The deploy script stops the API before copying the complete persistent directory, imports new seeds and restores the corresponding data snapshot on failure. See `docs/catalog-maintenance.md` for editing and version rules.

## Verify

```sh
curl -fsS https://sloyui.com/api/catalog/health
curl -fsS https://sloyui.com/api/catalog/session
curl -I https://sloyui.com/
curl -I https://sloyui.com/figma-tokens/sloyui-0.11.3-figma-tokens.zip
curl -I https://sloyui.com/downloads/sloyui-0.11.3.tgz
```

Check normal TLS, public asset hashes, anonymous mutation rejection and the browser's search/download actions. Complete the owner login through the real UI; automated QA credentials never authenticate production. After Caddy changes verify `devos.run`, the stopped Refletica host (HTTP 503) and `auth.devos.run`. Actual checked scope belongs in `docs/verification.md`.

The isolated `server/tests/oidc-smoke.mjs` checks the full callback and catalogue session against the existing disposable Devos Auth QA account. It accepts only its explicit loopback origin and `qa-owner` subject, does not print credentials, and writes catalogue edits into a temporary directory. Restore the QA service's initial stopped state after testing.

## Roll back

Read `/srv/sloyui/backups/<release>.<channel-pointer>.previous` (`current` or `develop`). Before switching back, preserve any admin edits made since deployment. Restore the saved configuration only after comparing and retaining subsequent changes to other Caddy hosts. Repoint `current`, restart `sloyui-admin` when the target includes `server/`, validate Caddy and reload it. Older static releases use `/srv/sloyui/current` directly; the matching pre-API Caddy configuration must accompany that rollback.

The deployment script saves data and the prior Caddy configuration in `/srv/sloyui/backups/`. It does not reset Devos Auth, restore old identity sessions, restart Refletica or change DNS. Reverting domain routing requires removing the explicit root A record in Vercel.

First static release: `20261008T130323Z-7b61d480a900` on 2026-10-08.
