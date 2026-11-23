// Рабочий сервер → сервер Ликса: продлевает доступ к кассе SIGMA.
// id.atol.ru не отвечает серверу Ликса (проверка для ботов), поэтому офлайн-токен владельца живёт здесь,
// а на сервер Ликса уходит только токен ATOL на 5 суток. Запускает таймер liks-sigma-relay раз в 6 часов.
//   node deploy/sigma-relay.mjs            — бой (/opt/liks)
//   TARGETS=prod,stage node deploy/sigma-relay.mjs
import {execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync} from 'node:fs';
import {homedir} from 'node:os';

const KC = 'https://id.atol.ru/auth/realms/ATOL-ID-External/protocol/openid-connect';
const FILE = process.env.TOKEN_FILE ?? `${homedir()}/.config/liks-sigma-offline.json`;
const HOST = process.env.LIKS_HOST ?? 'root@83.141.94.212';
const KEY = process.env.KEY ?? `${homedir()}/.ssh/id_ed25519_chas`;
const DIRS = {prod: ['/opt/liks/api', '/etc/liks/server.env'], stage: ['/opt/liks-stage/api', '/etc/liks/stage.env']};

const off = JSON.parse(readFileSync(FILE, 'utf8')).refresh_token;
const r = await fetch(KC + '/token', {
  method: 'POST',
  headers: {'content-type': 'application/x-www-form-urlencoded'},
  body: new URLSearchParams({grant_type: 'refresh_token', client_id: 'sigma_cloud_client', refresh_token: off}),
});
const j = await r.json().catch(() => ({}));
if (!r.ok || !j.access_token) {
  console.error(`ATOL ID: ${r.status} ${j.error ?? ''} — владельцу нужно заново войти в SIGMA и запустить deploy/sigma-connect.cjs`);
  process.exit(1);
}
if (j.refresh_token) writeFileSync(FILE, JSON.stringify({refresh_token: j.refresh_token}), {mode: 0o600});
const payload = JSON.stringify({access_token: j.access_token, expires_in: j.expires_in});
for (const t of (process.env.TARGETS ?? 'prod').split(',')) {
  const [dir, env] = DIRS[t];
  execFileSync('ssh', ['-i', KEY, '-o', 'IdentitiesOnly=yes', '-o', 'ConnectTimeout=20', HOST,
    `cd ${dir} && sudo -u liks node --env-file=${env} main.js sigma-atol`], {input: payload, stdio: ['pipe', 'inherit', 'inherit']});
}
