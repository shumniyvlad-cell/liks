#!/usr/bin/env bash
# Ликс: чистый Ubuntu 24.04/26.04 → Postgres 16, Node 22, Caddy с HTTPS, юнит API, бэкапы.
# Запускать от root: DOMAIN=liks.example.ru TEST_PHONES=+79001234567 bash server-setup.sh (без DOMAIN — <ip>.sslip.io).
# Повторный запуск безопасен: каждый шаг проверяет, сделан ли он. Секреты пишутся в /etc/liks/server.env
# и в чат не выводятся.
set -euo pipefail

log() { echo "== $*"; }
IP=$(curl -4 -fsS --max-time 10 https://ipv4.icanhazip.com 2>/dev/null || hostname -I | awk '{print $1}')
SSLIP=${IP//./-}.sslip.io
DOMAIN=${DOMAIN:-$SSLIP}
export DEBIAN_FRONTEND=noninteractive

log "Пакеты"
apt-get update -q
apt-get install -y -q curl ca-certificates gnupg ufw fail2ban postgresql unattended-upgrades

log "Часовой пояс кофейни и своп"
timedatectl set-timezone Europe/Moscow
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 1G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q /swapfile /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

log "Node 22 из репозитория NodeSource"
install -d -m 0755 /etc/apt/keyrings
if ! command -v node >/dev/null || [[ $(node -v) != v22* ]]; then
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg
  echo 'deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main' > /etc/apt/sources.list.d/nodesource.list
  apt-get update -q && apt-get install -y -q nodejs
fi

log "Caddy из официального репозитория"
if ! command -v caddy >/dev/null; then
  curl -fsSL 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -fsSL 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -q && apt-get install -y -q caddy
fi

log "Файрвол: SSH и веб"
ufw allow OpenSSH >/dev/null
ufw allow 80,443/tcp >/dev/null
ufw allow 443/udp >/dev/null
ufw --force enable >/dev/null

log "SSH только по ключу"
printf 'PasswordAuthentication no\nKbdInteractiveAuthentication no\nPermitRootLogin prohibit-password\n' > /etc/ssh/sshd_config.d/00-keys-only.conf
sshd -t && systemctl reload ssh

log "Пользователь и папки"
id liks >/dev/null 2>&1 || useradd --system --home /opt/liks --shell /usr/sbin/nologin liks
install -d -o liks -g liks -m 0755 /opt/liks /opt/liks/api /opt/liks/www
install -d -o root -g liks -m 0750 /etc/liks
install -d -o postgres -g postgres -m 0700 /var/backups/liks

log "Секреты (только при первом запуске)"
ENV=/etc/liks/server.env
if [[ ! -f $ENV ]]; then
  DBPASS=$(openssl rand -hex 24)
  umask 077
  cat > $ENV <<EOF
DATABASE_URL=postgres://liks:${DBPASS}@127.0.0.1:5432/liks
SECRET=$(openssl rand -hex 32)
STAFF_KEY=$(openssl rand -hex 12)
# Стенд: пока СМС не подключены, входят только номера из TEST_PHONES (через запятую) с любым кодом,
# остальным вход закрыт. На бой: SMS_PROVIDER=smsru, SMSRU_API_ID=..., AUTH_TEST=0.
AUTH_TEST=1
TEST_PHONES=${TEST_PHONES:-}
SMS_PROVIDER=
SMSRU_API_ID=
# Стенд: онлайн-оплата засчитывается сразу. На бой — 0 и подтверждение от банка.
PAY_TEST=1
PORT=8787
EOF
  chown root:liks $ENV && chmod 0640 $ENV
  sudo -u postgres psql -qc "do \$\$ begin if not exists (select from pg_roles where rolname='liks') then create role liks login password '${DBPASS}'; end if; end \$\$;"
  sudo -u postgres psql -qtAc "select 1 from pg_database where datname='liks'" | grep -q 1 || sudo -u postgres createdb -O liks liks
fi

log "Касса SIGMA: ключи в окружении (значения вписываются руками, см. deploy/sigma-relay.mjs)"
grep -q '^SIGMA_COMPANY=' $ENV || cat >> $ENV <<'EOF'
# Касса SIGMA (облако АТОЛ): компания, меню, точка продаж и ключ приложения их кабинета.
SIGMA_COMPANY=
SIGMA_MENU=
SIGMA_SELLPOINT=
SIGMA_BASIC=
MEDIA_DIR=/var/lib/liks/media
EOF

log "Юнит API"
cat > /etc/systemd/system/liks-api.service <<'EOF'
[Unit]
Description=Ликс API
After=network-online.target postgresql.service
Wants=network-online.target

[Service]
User=liks
Group=liks
WorkingDirectory=/opt/liks/api
EnvironmentFile=/etc/liks/server.env
Environment=NODE_ENV=production
ExecStart=/usr/bin/node /opt/liks/api/main.js
Restart=always
RestartSec=3
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadOnlyPaths=/opt/liks
# Фото блюд из админки: /var/lib/liks/media, Caddy отдаёт их по /media/.
StateDirectory=liks
StateDirectoryMode=0755

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable liks-api >/dev/null 2>&1 || true

log "Caddy: $DOMAIN"
cat > /etc/caddy/Caddyfile <<EOF
${DOMAIN} {
	encode zstd gzip
	header {
		Strict-Transport-Security "max-age=31536000"
		X-Content-Type-Options nosniff
		X-Frame-Options DENY
		Referrer-Policy strict-origin-when-cross-origin
		-Server
	}
	handle /api/* {
		reverse_proxy 127.0.0.1:8787
	}
	handle /media/* {
		root * /var/lib/liks
		header Cache-Control "public, max-age=31536000, immutable"
		file_server
	}
	# Админка: одна страница по /admin, ассеты у неё относительные — без слеша на конце.
	redir /admin/ /admin
	handle /admin {
		root * /opt/liks/www
		header X-Robots-Tag "noindex, nofollow"
		header Cache-Control "no-cache"
		rewrite * /admin.html
		file_server
	}
	handle {
		root * /opt/liks/www
		@hashed path /assets/*
		header @hashed Cache-Control "public, max-age=31536000, immutable"
		@page path / /index.html
		header @page Cache-Control "no-cache"
		try_files {path} /index.html
		file_server
	}
}
EOF
# Свой домен: www и временный адрес <ip>.sslip.io ведут на него, чтобы у сайта был один адрес.
if [[ $DOMAIN != "$SSLIP" ]]; then
  cat >> /etc/caddy/Caddyfile <<EOF

www.${DOMAIN}, ${SSLIP} {
	redir https://${DOMAIN}{uri} permanent
}
EOF
fi
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null
systemctl reload caddy || systemctl restart caddy

log "Бэкап базы каждую ночь, храним 14 дней"
cat > /etc/cron.daily/liks-backup <<'EOF'
#!/bin/sh
f=/var/backups/liks/liks-$(date +%F).dump
sudo -u postgres pg_dump -Fc liks > "$f" && chmod 600 "$f"
find /var/backups/liks -name 'liks-*.dump' -mtime +14 -delete
EOF
chmod 755 /etc/cron.daily/liks-backup

echo "OK: https://${DOMAIN}"
