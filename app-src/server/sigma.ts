// Касса SIGMA (АТОЛ). Открытого API нет: ходим туда же, куда их кабинет cloud.sigma.ru.
//   id.atol.ru (Keycloak)  — офлайн-токен владельца → токен ATOL на 5 суток;
//   api-s03.sigma.ru       — обмен на токен SIGMA (12 ч), справочники, меню, склад, запись цен;
//   chs.sigma.ru           — отчёты: чеки с позициями.
// Пароль владельца не храним. Офлайн-токен выдаётся один раз из сессии владельца в браузере
// (deploy/sigma-connect.cjs). id.atol.ru отдаёт серверу Ликса в Москве проверку для ботов вместо ответа,
// поэтому токен ATOL на 5 суток продлевает рабочий сервер (deploy/sigma-relay.mjs, раз в 6 часов) и
// присылает сюда командой sigma-atol. Если сервер Ликса сможет сам — продлит сам офлайн-токеном.
// Токены лежат в kv зашифрованными ключом из SECRET.
// Сломалось у SIGMA — админка пишет «нет связи с кассой», приложение живёт на последней копии.

import {createCipheriv, createDecipheriv, createHash, randomBytes} from 'node:crypto';
import {sql} from './db';

const env = process.env;
const KC = 'https://id.atol.ru/auth/realms/ATOL-ID-External/protocol/openid-connect';
const API = 'https://api-s03.sigma.ru/';
const CHS = 'https://chs.sigma.ru/';
export const C = env.SIGMA_COMPANY ?? '';
export const MENU_ID = env.SIGMA_MENU ?? '';
const SELL_POINT = env.SIGMA_SELLPOINT ?? '';
export const sigmaOn = !!(C && MENU_ID && env.SIGMA_BASIC);

/* ── шифрование токена в базе ── */
const key = () => createHash('sha256').update('sigma-token:' + (env.SECRET ?? '')).digest();
function seal(s: string) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key(), iv);
  const body = Buffer.concat([c.update(s, 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), body]).toString('base64');
}
function open(s: string) {
  const b = Buffer.from(s, 'base64');
  const d = createDecipheriv('aes-256-gcm', key(), b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8');
}

export async function saveOfflineToken(token: string) {
  await sql`insert into kv (key, value) values ('sigma_offline', ${seal(token)})
    on conflict (key) do update set value = excluded.value, updated_at = now()`;
}
async function offlineToken() {
  const [r] = await sql<{value: string}[]>`select value from kv where key = 'sigma_offline'`;
  return r ? open(r.value) : null;
}

/** Токен ATOL, присланный рабочим сервером: {token, until}. */
export async function saveAtolToken(token: string, expiresIn: number) {
  const v = seal(JSON.stringify({token, until: Date.now() + expiresIn * 1000}));
  await sql`insert into kv (key, value) values ('sigma_atol', ${v})
    on conflict (key) do update set value = excluded.value, updated_at = now()`;
}
async function atolToken(): Promise<{token: string; until: number} | null> {
  const [r] = await sql<{value: string}[]>`select value from kv where key = 'sigma_atol'`;
  return r ? JSON.parse(open(r.value)) : null;
}

/* ── токен ── */
let access: {token: string; until: number} | null = null;

class SigmaError extends Error {}

/** Сами продлеваем офлайн-токен в ATOL ID. Защита от ботов отвечает HTML — тогда ждём рабочий сервер. */
async function refreshSelf(): Promise<{token: string; until: number} | null> {
  const off = await offlineToken();
  if (!off) return null;
  const r = await fetch(KC + '/token', {
    method: 'POST',
    headers: {'content-type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({grant_type: 'refresh_token', client_id: 'sigma_cloud_client', refresh_token: off}),
    signal: AbortSignal.timeout(20e3),
  });
  if (!(r.headers.get('content-type') ?? '').includes('json')) return null;
  const j = (await r.json().catch(() => ({}))) as {access_token?: string; refresh_token?: string; expires_in?: number; error?: string};
  if (!r.ok || !j.access_token) throw new SigmaError(`Вход в SIGMA истёк (${j.error ?? r.status}): владельцу нужно войти заново.`);
  if (j.refresh_token && j.refresh_token !== off) await saveOfflineToken(j.refresh_token);
  await saveAtolToken(j.access_token, j.expires_in ?? 3600);
  return {token: j.access_token, until: Date.now() + (j.expires_in ?? 3600) * 1000};
}

async function token() {
  if (access && access.until > Date.now() + 60e3) return access.token;
  let atol = await atolToken();
  if (!atol || atol.until < Date.now() + 3600e3) atol = (await refreshSelf().catch((e) => (atol ? null : Promise.reject(e)))) ?? atol;
  if (!atol || atol.until < Date.now() + 60e3)
    throw new SigmaError('Доступ к SIGMA не продлён: рабочий сервер давно не присылал токен. Владельцу, возможно, нужно войти в SIGMA заново.');
  const s = await fetch(API + 'oauth/token', {
    method: 'POST',
    headers: {authorization: 'Basic ' + env.SIGMA_BASIC, 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json'},
    body: new URLSearchParams({grant_type: 'atol_id', scope: 'read write', token: atol.token}),
  });
  const t = (await s.json().catch(() => ({}))) as {access_token?: string; expires_in?: number};
  if (!s.ok || !t.access_token) throw new SigmaError(`SIGMA не пустила (${s.status}).`);
  access = {token: t.access_token, until: Math.min(atol.until, Date.now() + (t.expires_in ?? 3600) * 1000)};
  return access.token;
}

async function call<T>(base: string, path: string, init: {method?: string; body?: unknown} = {}): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await fetch(base + path, {
      method: init.method ?? 'GET',
      headers: {authorization: 'Bearer ' + (await token()), accept: 'application/json', 'content-type': 'application/json'},
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(30e3),
    });
    if (r.status === 401 && attempt === 0) {
      access = null;
      continue;
    }
    const text = await r.text();
    if (!r.ok) throw new SigmaError(`SIGMA ответила ${r.status} на ${path.split('?')[0].replace(C, '{C}')}`);
    return (text ? JSON.parse(text) : null) as T;
  }
  throw new SigmaError('SIGMA не пускает.');
}
const api = <T>(path: string, init?: {method?: string; body?: unknown}) => call<T>(API, path, init);
const chs = <T>(path: string) => call<T>(CHS, path);

/* ── меню: позиции с ценами ── */
type MatrixRow = {
  id: string;
  name: string;
  productUnits: {shortName: string}[];
  variations: {id: string; price: number; variationUnit: {shortName: string}; menuProduct?: {id: string; name: string} | null; menu?: {id: string} | null}[];
};

async function syncItems() {
  const rows: MatrixRow[] = [];
  for (let page = 0; page < 20; page++) {
    const r = await api<{rows: MatrixRow[]}>(`rest/v2/companies/${C}/menu-matrix?page=${page}&size=200&menuId=${MENU_ID}`);
    rows.push(...r.rows);
    if (r.rows.length < 200) break;
  }
  const seen: string[] = [];
  for (const p of rows)
    for (const v of p.variations) {
      if (!v.menuProduct || (v.menu && v.menu.id !== MENU_ID)) continue;
      seen.push(v.menuProduct.id);
      await sql`
        insert into sigma_items (id, product_id, variation_id, name, price, unit, seen_at)
        values (${v.menuProduct.id}, ${p.id}, ${v.id}, ${p.name.replace(/\s+/g, ' ').trim()}, ${v.price ?? 0}, ${v.variationUnit?.shortName ?? ''}, now())
        on conflict (id) do update set product_id = excluded.product_id, variation_id = excluded.variation_id,
          name = excluded.name, price = excluded.price, unit = excluded.unit, seen_at = now()`;
    }
  // Удалённые из кассы позиции убираем: приложение их тоже скроет.
  if (seen.length) await sql`delete from sigma_items where not (id = any(${seen}))`;
  return seen.length;
}

/** Выход и себестоимость по техкарте: сумма нетто в граммах и брутто × закупочная цена. */
type Product = {techSpec: {netto: number; brutto: number; avgPrice: number | null; productUnitName: string}[]};
async function syncTechSpecs() {
  const items = await sql<{id: string; product_id: string}[]>`select id, product_id from sigma_items`;
  for (const it of items) {
    const p = await api<Product>(`rest/v2/companies/${C}/products/${it.product_id}`).catch(() => null);
    if (!p) continue;
    let g = 0;
    let cost = 0;
    for (const t of p.techSpec ?? []) {
      const k = t.productUnitName === 'кг' || t.productUnitName === 'л' ? 1000 : t.productUnitName === 'г' || t.productUnitName === 'мл' ? 1 : 0;
      g += (t.netto ?? 0) * k;
      cost += (t.brutto ?? 0) * (t.avgPrice ?? 0);
    }
    await sql`update sigma_items set weight = ${g ? Math.round(g) : null}, cost = ${cost || null} where id = ${it.id}`;
  }
}

/* ── чеки ── */
type Op = {
  id: string;
  paymentScriptMethod: string;
  transactionType: string;
  operationTime: string;
  cashierName: string | null;
  discount: number | null;
  sum: number;
  orderDetails: {productName: string; quantity: number; unitShortName: string}[];
};

async function syncOps() {
  // Берём от последнего сохранённого чека минус сутки (на случай поздней выгрузки с кассы), не раньше 1 ноября 2026.
  const [last] = await sql<{at: Date | null}[]>`select max(at) as at from sigma_ops`;
  const begin = new Date(Math.max(Date.parse('2026-11-01T00:00:00Z'), (last?.at?.getTime() ?? 0) - 86400e3)).toISOString();
  let end = new Date(Date.now() + 3600e3).toISOString();
  let fromId: string | null = null;
  let n = 0;
  for (let page = 0; page < 200; page++) {
    const q = new URLSearchParams({typeOperations: 'PAYMENTS', begin, end});
    q.append('typeOperations', 'REFUNDS');
    if (fromId) q.set('fromId', fromId);
    const r = await chs<{paymentOperations: Op[]}>(`companies/${C}/sales/payment-operations?${q}`);
    const ops = r.paymentOperations ?? [];
    for (const o of ops) {
      await sql`
        insert into sigma_ops (id, at, method, kind, sum, discount, cashier, lines)
        values (${o.id}, ${o.operationTime}, ${o.paymentScriptMethod ?? ''}, ${o.transactionType ?? ''}, ${o.sum ?? 0},
          ${o.discount ?? 0}, ${o.cashierName ?? ''},
          ${sql.json(o.orderDetails.map((d) => ({name: d.productName.replace(/\s+/g, ' ').trim(), qty: d.quantity, unit: d.unitShortName})))})
        on conflict (id) do nothing`;
      n++;
    }
    if (!ops.length) break;
    const tail = ops[ops.length - 1];
    if (tail.id === fromId) break;
    fromId = tail.id;
    end = tail.operationTime;
  }
  return n;
}

/* ── склад, приходы, смены ── */
type Remainder = {id: string; name: string; unitName: string; remainder: number; buyingPrice: number | null; buyingAmount: number | null};
async function syncStock() {
  for (let page = 0; page < 20; page++) {
    const r = await api<{products: Remainder[]}>(`rest/v5/companies/${C}/products/remainders?page=${page}&size=200`);
    for (const p of r.products)
      await sql`
        insert into sigma_stock (id, name, unit, remainder, buy_price, buy_amount, seen_at)
        values (${p.id}, ${p.name.replace(/\s+/g, ' ').trim()}, ${p.unitName ?? ''}, ${p.remainder ?? 0}, ${p.buyingPrice ?? 0}, ${p.buyingAmount ?? 0}, now())
        on conflict (id) do update set name = excluded.name, unit = excluded.unit, remainder = excluded.remainder,
          buy_price = excluded.buy_price, buy_amount = excluded.buy_amount, seen_at = now()`;
    if (r.products.length < 200) break;
  }
}

type Waybill = Record<string, unknown> & {id: string};
const pick = (o: Record<string, unknown>, keys: string[]) => {
  for (const k of keys) if (o[k] != null) return o[k];
  return null;
};
async function syncWaybills() {
  for (let page = 0; page < 20; page++) {
    const r = await api<{waybills: Waybill[]}>(`waybills/find?page=${page}&size=50`, {method: 'POST', body: {}});
    for (const w of r.waybills) {
      const sup = pick(w, ['supplier', 'supplierName']);
      const at = pick(w, ['date', 'documentDate', 'createdDate', 'creationDate']);
      await sql`
        insert into sigma_waybills (id, at, sum, supplier, status, data)
        values (${w.id}, ${at ? new Date(String(at)) : null},
          ${Number(pick(w, ['purchasePriceAmount', 'totalAmount', 'amount', 'sum']) ?? 0) || 0},
          ${typeof sup === 'object' && sup ? String((sup as {name?: string}).name ?? '') : String(sup ?? '')},
          ${String(pick(w, ['status']) ?? '')}, ${sql.json(w as never)})
        on conflict (id) do update set at = excluded.at, sum = excluded.sum, supplier = excluded.supplier, status = excluded.status, data = excluded.data`;
    }
    if (r.waybills.length < 50) break;
  }
}

type Pay = {receiptsTotal: number; receiptsNum: number; refundsTotal: number; refundsNum: number};
type Shift = {id: string; number: string; openTime: string | null; closeTime: string | null; cashierName: string | null; total: number;
  openAmount: number; cashInTotal: number; collectionsTotal: number; registerCash: number; cashPayments: Pay; cardPayments: Pay};
// Время смен касса отдаёт в UTC без пояса: «2026-11-22 09:47:46.000» — это 12:47 по Москве.
const utc = (s: string | null) => (s ? new Date(s.replace(' ', 'T') + 'Z') : null);
async function syncShifts() {
  for (let page = 0; page < 40; page++) {
    const r = await api<{shifts: Shift[]}>(`rest/v3/sales/shifts?page=${page}&size=50`);
    for (const s of r.shifts) {
      const c = s.cashPayments ?? ({} as Pay), k = s.cardPayments ?? ({} as Pay);
      await sql`
        insert into sigma_shifts (id, no, opened, closed, total, cash, card, drawer, cashier, open_amount, cash_in, collections, refunds, checks, raw)
        values (${s.id}, ${s.number}, ${utc(s.openTime)}, ${utc(s.closeTime)}, ${s.total ?? 0},
          ${c.receiptsTotal ?? 0}, ${k.receiptsTotal ?? 0}, ${s.registerCash ?? 0}, ${s.cashierName ?? ''}, ${s.openAmount ?? 0},
          ${s.cashInTotal ?? 0}, ${s.collectionsTotal ?? 0}, ${(c.refundsTotal ?? 0) + (k.refundsTotal ?? 0)},
          ${(c.receiptsNum ?? 0) + (k.receiptsNum ?? 0)}, ${sql.json(s as never)})
        on conflict (id) do update set opened = excluded.opened, closed = excluded.closed, total = excluded.total, cash = excluded.cash,
          card = excluded.card, drawer = excluded.drawer, cashier = excluded.cashier, open_amount = excluded.open_amount,
          cash_in = excluded.cash_in, collections = excluded.collections, refunds = excluded.refunds, checks = excluded.checks, raw = excluded.raw`;
    }
    if (r.shifts.length < 50) break;
  }
}

/* ── чек целиком: номер и цены строк ── */
type Detail = {number?: string; totalDiscount?: number;
  operationDetails?: {products?: {name: string; quantity: number; unitName: string; salePrice?: {value: number}; discount?: {value: number; type: string}; gift?: boolean}[]}};
async function syncDetails() {
  const ops = await sql<{id: string}[]>`select id from sigma_ops where full_at is null order by at desc limit 300`;
  for (const o of ops) {
    const d = await api<Detail>(`rest/v2/companies/${C}/payment-operations/sales/${o.id}`).catch(() => null);
    if (!d) {
      await sql`update sigma_ops set full_at = now() where id = ${o.id}`; // не отдаётся — не дёргаем снова
      continue;
    }
    const lines = (d.operationDetails?.products ?? []).map((p) => {
      const price = p.salePrice?.value ?? 0;
      const disc = p.discount ? (p.discount.type === 'Absolute' ? p.discount.value : (price * p.quantity * p.discount.value) / 100) : 0;
      return {name: p.name.replace(/\s+/g, ' ').trim(), qty: p.quantity, unit: p.unitName, price, discount: disc, gift: !!p.gift};
    });
    await sql`update sigma_ops set number = ${d.number ?? ''}, full_at = now()${lines.length ? sql`, lines = ${sql.json(lines)}` : sql``} where id = ${o.id}`;
  }
}

/* ── запись: цена позиции меню ── */
type MenuProduct = {variations: {id: string; price: {value: number; type: string}}[]} & Record<string, unknown>;
export async function setPrice(menuProductId: string, price: number) {
  const path = `rest/v2/companies/${C}/menus/${MENU_ID}/menu-products/${menuProductId}`;
  const mp = await api<MenuProduct>(path);
  if (mp.variations.length !== 1) throw new SigmaError('У позиции в кассе несколько вариантов, цену меняйте в SIGMA.');
  mp.variations[0].price = {...mp.variations[0].price, value: price};
  await api(path, {method: 'PUT', body: mp});
  const back = await api<MenuProduct>(path);
  if (back.variations[0].price.value !== price) throw new SigmaError('SIGMA не сохранила цену.');
  await sql`update sigma_items set price = ${price} where id = ${menuProductId}`;
}

/* ── синхронизация ── */
export type SyncState = {at: number; ok: boolean; error?: string; full?: number; running?: boolean};
let state: SyncState = {at: 0, ok: false, error: 'Ещё не синхронизировали'};
let running: Promise<SyncState> | null = null;
let onChange: () => Promise<void> = async () => {};
export const syncState = (): SyncState => ({...state, running: !!running});
export function onMenuChange(f: () => Promise<void>) {
  onChange = f;
}

/** Быстрая часть — каждые 5 минут (чеки, смены, цены); полная (склад, приходы, техкарты) — раз в час и по кнопке. */
export function sync(full = false): Promise<SyncState> {
  if (!sigmaOn) return Promise.resolve({at: Date.now(), ok: false, error: 'Касса не настроена на сервере.'});
  if (running) return running;
  running = (async () => {
    try {
      await syncItems();
      await syncOps();
      await syncShifts();
      await syncDetails();
      if (full || Date.now() - (state.full ?? 0) > 3600e3) {
        await syncStock();
        await syncWaybills();
        await syncTechSpecs();
        state.full = Date.now();
      }
      await onChange();
      state = {at: Date.now(), ok: true, full: state.full};
    } catch (e) {
      console.error('sigma sync', e);
      state = {at: Date.now(), ok: false, error: e instanceof SigmaError ? e.message : 'Нет связи с кассой.', full: state.full};
    } finally {
      running = null;
    }
    return state;
  })();
  return running;
}

export {SigmaError, SELL_POINT};
