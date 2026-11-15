#!/usr/bin/env bash
# Выкладка Ликса на свой сервер: собирает приложение (VITE_BACKEND=server) и сервер,
# кладёт их в /opt/liks и перезапускает API. Первый раз — с --setup, он ставит всё на чистую машину.
#   HOST=root@<ip> ./deploy/deploy.sh --setup     # первый раз
#   HOST=root@<ip> ./deploy/deploy.sh             # обновление
# Свой домен: DOMAIN=liks.ru ./deploy/deploy.sh --setup (DNS уже должен смотреть на сервер).
set -euo pipefail
cd "$(dirname "$0")/.."
: "${HOST:?нужен HOST=root@<ip>}"
KEY=${KEY:-$HOME/.ssh/id_ed25519_chas}
SSH=(ssh -i "$KEY" -o IdentitiesOnly=yes -o ServerAliveInterval=15)

echo "== Сборка"
npx tsc -b
VITE_BACKEND=server npx vite build --outDir dist-server-app --emptyOutDir >/dev/null
npx vite build --config vite.server.config.ts >/dev/null
# На сервер едут только пакеты сервера, ровно тех версий, что стоят здесь.
node -e '
const deps = {};
for (const p of ["hono", "@hono/node-server", "postgres"]) deps[p] = require("./node_modules/" + p + "/package.json").version;
require("fs").writeFileSync("server-dist/package.json", JSON.stringify({name: "liks-api", private: true, type: "module", dependencies: deps}, null, 2));'

if [[ ${1:-} == --setup ]]; then
  echo "== Настройка сервера"
  "${SSH[@]}" "$HOST" 'cat > /root/liks-setup.sh' < deploy/server-setup.sh
  "${SSH[@]}" "$HOST" "DOMAIN=${DOMAIN:-} bash /root/liks-setup.sh"
fi

echo "== Файлы"
rsync -az --delete -e "${SSH[*]}" dist-server-app/ "$HOST:/opt/liks/www/"
rsync -az -e "${SSH[*]}" server-dist/main.js server-dist/package.json "$HOST:/opt/liks/api/"

echo "== Пакеты и перезапуск"
"${SSH[@]}" "$HOST" 'set -e
chown -R liks:liks /opt/liks
cd /opt/liks/api && sudo -u liks HOME=/opt/liks npm install --omit=dev --no-audit --no-fund --silent
systemctl restart liks-api
for i in 1 2 3 4 5 6 7 8 9 10; do curl -fsS 127.0.0.1:8787/api/health >/dev/null 2>&1 && break; sleep 1; done
curl -fsS 127.0.0.1:8787/api/health && echo
grep -E "^[a-z0-9.-]+ \{" /etc/caddy/Caddyfile | head -1'
