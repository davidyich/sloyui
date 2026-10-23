#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
target=${1:-devos}
channel=${2:-develop}
[[ "$target" =~ ^[a-zA-Z0-9._@-]+$ ]] || { echo 'Invalid SSH target' >&2; exit 1; }
[[ "$channel" == develop || "$channel" == bootstrap ]] || { echo 'Use develop; bootstrap installs publication infrastructure.' >&2; exit 1; }
version=$(node -p 'JSON.parse(require("fs").readFileSync("package.json")).version')
package="artifacts/sloyui-${version}.tgz"
test -f site/index.html && test -f "$package"
node scripts/verify-site-module-graph.mjs site
mkdir -p site/downloads artifacts/deployment
cp "$package" site/downloads/
digest=$(shasum -a 256 site/index.html | cut -c1-12)
release="$(date -u +%Y%m%dT%H%M%SZ)-${digest}"
metadata="artifacts/deployment/release.json"
node -e 'require("fs").writeFileSync(process.argv[1],JSON.stringify({version:process.argv[2],release:process.argv[3]})+"\n")' "$metadata" "$version" "$release"
archive="artifacts/deployment/${release}.tar.gz"
COPYFILE_DISABLE=1 tar --no-xattrs --exclude=node_modules --exclude='.env*' -czf "$archive" site server scripts/develop-admin-link.js scripts/verify-site-module-graph.mjs source/component-registry.json source/catalog-settings.json source/component-history.json
# Metadata is supplied separately so the public root never contains server state.
ssh_options=(-o UseKeychain=yes -o BatchMode=yes)
scp "${ssh_options[@]}" "$archive" "$target:/tmp/sloyui-${release}.tar.gz"
ssh "${ssh_options[@]}" "$target" bash -s -- "$release" "$channel" "$version" <<'REMOTE'
set -euo pipefail
release=$1
channel=$2
version=$3
base=/srv/sloyui
node=/home/linuxbrew/.linuxbrew/opt/node@24/bin/node
export PATH="$(dirname "$node"):$PATH"
sudo -n install -d -o "$(id -un)" -g "$(id -gn)" -m 755 "$base" "$base/releases" "$base/backups"
exec 9>"$base/.release.lock"
flock -w 60 9
install -d -m 700 "$base/private" "$base/data" "$base/publication"
if [ "$channel" = develop ]; then
 test -L "$base/current" || { echo 'Install bootstrap first' >&2; exit 1; }
 pointer=develop; data="$base/data/develop-source"; service=sloyui-develop; port=4319
else
 pointer=current; data="$base/data/source"; service=sloyui-admin; port=4318
fi
if [ ! -f "$base/private/oidc-client.json" ]; then
 sudo -n install -o "$(id -un)" -g "$(id -gn)" -m 600 /home/devos/projects/devos-auth/state/sloy-client.json "$base/private/oidc-client.json"
fi
mkdir "$base/releases/$release"
tar -xzf "/tmp/sloyui-${release}.tar.gz" -C "$base/releases/$release"
node -e 'require("fs").writeFileSync(process.argv[1],JSON.stringify({version:process.argv[2],release:process.argv[3]})+"\n")' "$base/releases/$release/release.json" "$version" "$release"
find "$base/releases/$release/site" -type d -exec chmod 755 {} +
find "$base/releases/$release/site" -type f -exec chmod 644 {} +
# Bootstrap adds only the administrator link to the existing public build.
# Feature code/data stays on Develop until the owner's confirmation.
if [ "$channel" = bootstrap ] && [ -L "$base/current" ]; then
 existing=$(readlink "$base/current")
 mv "$base/releases/$release/site" "$base/releases/$release/develop-site-draft"
 cp -a "$existing/site" "$base/releases/$release/site"
 cp "$base/releases/$release/scripts/develop-admin-link.js" "$base/releases/$release/site/assets/develop-admin-link-$release.js"
 python3 - "$base/releases/$release/site/index.html" "$release" <<'PY_BOOTSTRAP'
from pathlib import Path
import sys
path=Path(sys.argv[1]);html=path.read_text()
html=html.replace('</body>',f'<script type="module" src="/assets/develop-admin-link-{sys.argv[2]}.js"></script></body>')
path.write_text(html)
PY_BOOTSTRAP
 existing_version=$(find "$existing/site/downloads" -name 'sloyui-*.tgz' -printf '%f\n' | head -1 | sed -E 's/^sloyui-(.*)\.tgz$/\1/')
 test -n "$existing_version"
 node -e 'require("fs").writeFileSync(process.argv[1],JSON.stringify({version:process.argv[2],release:process.argv[3]})+"\n")' "$base/releases/$release/release.json" "$existing_version" "$release"
 "$node" "$base/releases/$release/scripts/verify-site-module-graph.mjs" "$base/releases/$release/site"
fi
cp "$base/releases/$release/site/documents.json" "$base/releases/$release/source/documents-seed.json"
unzip -t "$base/releases/$release/site/figma-tokens/"*.zip >/dev/null
tar -tzf "$base/releases/$release/site/downloads/"*.tgz >/dev/null
(cd "$base/releases/$release/server" && npm ci --omit=dev --ignore-scripts --no-audit --no-fund)
previous=$(readlink "$base/$pointer" || true)
printf '%s\n' "$previous" > "$base/backups/$release.$pointer.previous"
config="$base/backups/$release.Caddyfile"
sudo -n cat /etc/caddy/Caddyfile > "$config"
config_digest=$(sha256sum "$config" | cut -d' ' -f1)
api_was_active=false; data_ready=false; switched=false; installed_config_digest=''
if sudo -n systemctl is-active --quiet "$service"; then api_was_active=true; fi
rollback(){
 local failure=$1
 trap - ERR; set +e
 sudo -n systemctl stop "$service"
 if "$switched"; then
  if [ -n "$previous" ]; then ln -sfn "$previous" "$base/$pointer.next" && mv -Tf "$base/$pointer.next" "$base/$pointer"; else rm -f "$base/$pointer"; fi
 fi
 if "$data_ready"; then mv "$data" "$base/backups/$release.failed-source"; cp -a "$base/backups/$release.source" "$data"; fi
 if [ -n "$installed_config_digest" ] && [ "$(sudo -n sha256sum /etc/caddy/Caddyfile | cut -d' ' -f1)" = "$installed_config_digest" ]; then
  sudo -n install -m 644 "$config" /etc/caddy/Caddyfile; sudo -n systemctl reload caddy
 fi
 if "$api_was_active"; then sudo -n systemctl restart "$service"; fi
 exit "$failure"
}
trap 'rollback "$?"' ERR
if "$api_was_active"; then sudo -n systemctl stop "$service"; fi
if [ ! -d "$data" ]; then install -d -m 700 "$data"; fi
cp -a "$data" "$base/backups/$release.source"; data_ready=true
if [ "$channel" = develop ] || [ ! -f "$data/catalog.sqlite" ]; then
 "$node" "$base/releases/$release/server/sync-catalog.mjs" "$base/releases/$release/source" "$data"
fi
if [ "$channel" = bootstrap ] && [ ! -d "$base/data/develop-source" ]; then cp -a "$data" "$base/data/develop-source"; fi
if [ "$channel" = bootstrap ] && [ ! -L "$base/develop" ]; then ln -s "$base/releases/$release" "$base/develop"; fi
for entry in 'current sloyui-admin 4318 source production' 'develop sloyui-develop 4319 develop-source develop'; do
 read -r name unit listen source appearance <<< "$entry"
 cat > "$base/private/$unit.env" <<ENV
SLOY_ORIGIN=https://sloyui.com
PORT=$listen
CATALOG_DATA=$base/data/$source
OIDC_CLIENT_FILE=$base/private/oidc-client.json
SESSION_DATA=$base/private
SLOY_BASE=$base
SLOY_CHANNEL=$appearance
ENV
 chmod 600 "$base/private/$unit.env"
 cat > "$base/backups/$release.$unit.service" <<UNIT
[Unit]
Description=Sloy UI $appearance catalogue API
After=network-online.target
Wants=network-online.target
[Service]
Type=simple
User=devos
Group=devos
WorkingDirectory=$base/$name/server
ExecStart=$node --env-file=$base/private/$unit.env $base/$name/server/catalog-server.mjs
Restart=on-failure
RestartSec=3
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=$base/data $base/private $base/publication
[Install]
WantedBy=multi-user.target
UNIT
 sudo -n install -m 644 "$base/backups/$release.$unit.service" "/etc/systemd/system/$unit.service"
done
sudo -n install -d -m 755 "$base/manager"
sudo -n install -m 644 "$base/releases/$release/server/publication.mjs" "$base/releases/$release/server/publish-worker.mjs" "$base/manager/"
cat > "$base/backups/$release.publish.service" <<UNIT
[Unit]
Description=Publish the confirmed Sloy UI Develop release
After=network-online.target
[Service]
Type=oneshot
User=devos
Group=devos
Environment=SLOY_BASE=$base
ExecStart=$node $base/manager/publish-worker.mjs
UMask=0077
TimeoutStartSec=120
UNIT
cat > "$base/backups/$release.publish.path" <<UNIT
[Unit]
Description=Watch confirmed Sloy UI publication requests
[Path]
PathExists=$base/publication/request.json
Unit=sloyui-publish.service
[Install]
WantedBy=multi-user.target
UNIT
sudo -n install -m 644 "$base/backups/$release.publish.service" /etc/systemd/system/sloyui-publish.service
sudo -n install -m 644 "$base/backups/$release.publish.path" /etc/systemd/system/sloyui-publish.path
sudo -n systemctl daemon-reload
sudo -n systemctl enable sloyui-admin sloyui-develop sloyui-publish.path >/dev/null
python3 - "$config" "$config.next" <<'PY'
from pathlib import Path
import sys
lines=Path(sys.argv[1]).read_text().splitlines(keepends=True)
start=next(i for i,line in enumerate(lines) if line.strip()=='sloyui.com {')
depth=0
for end in range(start,len(lines)):
 depth+=lines[end].count('{')-lines[end].count('}')
 if depth==0:break
block='''sloyui.com {
  encode zstd gzip
  redir /develop /develop/ 308
  handle /develop/api/admin/auth/* {
    uri strip_prefix /develop
    reverse_proxy 127.0.0.1:4318
  }
  handle /develop/api/* {
    uri strip_prefix /develop
    request_body {
      max_size 160KB
    }
    reverse_proxy 127.0.0.1:4319
  }
  handle /api/* {
    request_body {
      max_size 160KB
    }
    reverse_proxy 127.0.0.1:4318
  }
  handle_path /develop/* {
    root * /srv/sloyui/develop/site
    @assets path /assets/*
    header @assets Cache-Control "public, max-age=31536000, immutable"
    @downloads path /figma-tokens/* /downloads/*
    header @downloads Content-Disposition "attachment"
    header @downloads Cache-Control "no-cache"
    @html path / /index.html
    header @html Cache-Control "no-cache"
    file_server
  }
  handle {
    root * /srv/sloyui/current/site
    @assets path /assets/*
    header @assets Cache-Control "public, max-age=31536000, immutable"
    @downloads path /figma-tokens/* /downloads/*
    header @downloads Content-Disposition "attachment"
    header @downloads Cache-Control "no-cache"
    @html path / /index.html
    header @html Cache-Control "no-cache"
    file_server
  }
}
'''
Path(sys.argv[2]).write_text(''.join(lines[:start])+block+''.join(lines[end+1:]))
PY
sudo -n caddy validate --config "$config.next" --adapter caddyfile
test "$(sudo -n sha256sum /etc/caddy/Caddyfile | cut -d' ' -f1)" = "$config_digest"
ln -s "$base/releases/$release" "$base/$pointer.next"; mv -Tf "$base/$pointer.next" "$base/$pointer"; switched=true
sudo -n systemctl restart "$service"
if [ "$channel" = bootstrap ]; then sudo -n systemctl restart sloyui-develop; fi
for attempt in $(seq 1 15); do if curl -fsS "http://127.0.0.1:$port/api/catalog/health" >/dev/null 2>&1; then break; fi; sleep 1; done
curl -fsS "http://127.0.0.1:$port/api/catalog/health"
test "$(sudo -n sha256sum /etc/caddy/Caddyfile | cut -d' ' -f1)" = "$config_digest"
installed_config_digest=$(sha256sum "$config.next" | cut -d' ' -f1)
sudo -n install -m 644 "$config.next" "/etc/caddy/.Caddyfile.sloyui-$release"; sudo -n mv -f "/etc/caddy/.Caddyfile.sloyui-$release" /etc/caddy/Caddyfile
sudo -n systemctl reload caddy
sudo -n systemctl start sloyui-publish.path
sudo -n systemctl is-active caddy sloyui-admin sloyui-develop sloyui-publish.path
trap - ERR
sha256sum "$base/$pointer/site/index.html"
rm "/tmp/sloyui-${release}.tar.gz"
printf 'Channel: %s\nRelease: %s\nPrevious: %s\n' "$channel" "$release" "$previous"
REMOTE
printf 'Saved upload archive: %s\n' "$archive"
