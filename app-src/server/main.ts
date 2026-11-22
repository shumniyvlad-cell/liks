// Сервер Ликса: вход по номеру, гость с баллами и чашками, заказы. Postgres, Hono.
// Статику отдаёт Caddy, сюда приходит только /api. Цены и скидки считаем здесь,
// из браузера берём только что и сколько заказано.

import {createHash, randomBytes, randomInt, timingSafeEqual} from 'node:crypto';
import {serve} from '@hono/node-server';
import {Hono, type Context} from 'hono';
import {bodyLimit} from 'hono/body-limit';
import {deleteCookie, getCookie, setCookie} from 'hono/cookie';
import {byId, cafe, MENU, MODES, SUB, type Item, type ModeId, type OptKey} from '../src/business';
import {buildOrder, totals, unitPrice, type Calc, type Choice, type Line, type PastOrder, type User} from '../src/pricing';
import type postgres from 'postgres';
import {migrate, sql} from './db';
import {sendSms} from './sms';
import {Bad} from './bad';

const env = process.env;
const SECRET = env.SECRET ?? '';
const AUTH_TEST = env.AUTH_TEST === '1';
// Тестовый вход (любой код, СМС не шлём) — только для номеров из TEST_PHONES. Остальным вход закрыт,
// пока не подключены СМС: иначе любой зашёл бы под чужим номером и увидел чужие баллы и заказы.
const TEST_PHONES = new Set((env.TEST_PHONES ?? '').split(',').map((p) => p.replace(/\D/g, '').replace(/^8/, '7')).filter((p) => p.length === 11).map((p) => '+' + p));
// Тестовая оплата: заказ онлайн считается оплаченным сразу. Только для стенда, на бою — подтверждение банка.
const PAY_TEST = env.PAY_TEST === '1';
const STAFF_KEY = env.STAFF_KEY ?? '';
const COOKIE = 'liks_s';
const SESSION_DAYS = 180;
if (SECRET.length < 32) throw new Error('SECRET в окружении короче 32 символов');

const hash = (s: string) => createHash('sha256').update(SECRET + s).digest('hex');
const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));


/* ── телефон и время ── */
function normPhone(p: unknown) {
  let d = String(p ?? '').replace(/\D/g, '');
  if (d.length === 11 && d[0] === '8') d = '7' + d.slice(1);
  if (d.length !== 11 || d[0] !== '7') throw new Bad('Номер из 10 цифр после +7.', 400, 'phone');
  return '+' + d;
}
const showPhone = (p: string) => `+7 ${p.slice(2, 5)} ${p.slice(5, 8)}-${p.slice(8, 10)}-${p.slice(10, 12)}`;

/** Час в Вологде (московское время) с минутами: 15.5 — это 15:30. */
function cafeHour() {
  const parts = new Intl.DateTimeFormat('ru-RU', {timeZone: 'Europe/Moscow', hour: 'numeric', minute: 'numeric', hourCycle: 'h23'}).formatToParts(new Date());
  const v = (t: string) => Number(parts.find((x) => x.type === t)?.value ?? 0);
  return v('hour') + v('minute') / 60;
}

/* ── ограничение частоты: в памяти процесса, его хватает на одну кофейню ── */
// Окно хранится с ключом: уборка удаляет запись только когда истекло её собственное окно
// (иначе суточный лимит на номер сбрасывался бы через час).
const hits = new Map<string, {win: number; ts: number[]}>();
function limit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  key += '@' + windowMs; // у каждого окна своя история, лимиты не мешают друг другу
  const ts = (hits.get(key)?.ts ?? []).filter((t) => now - t < windowMs);
  if (ts.length >= max) throw new Bad('Слишком много попыток. Подождите немного и попробуйте снова.', 429);
  ts.push(now);
  hits.set(key, {win: windowMs, ts});
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of hits) if (v.ts.every((t) => now - t > v.win)) hits.delete(k);
}, 600e3).unref();

// Перед сервером только свой Caddy: он сам ставит адрес клиента последним в X-Forwarded-For, берём его.
const ip = (c: Context) => (c.req.header('x-forwarded-for') ?? '').split(',').pop()!.trim() || 'local';

/* ── гость ── */
type Row = {id: string; phone: string; name: string; bday: Date | null; points: number; stamps: number; sub: number; card: string};

async function loadUser(id: string): Promise<User> {
  const [u] = await sql<Row[]>`select * from users where id = ${id}`;
  const rows = await sql<{no: number; created_at: Date; total: number; items: string[]; lines: PastOrder['lines']}[]>`
    select no, created_at, total, items, lines from orders where user_id = ${id} order by created_at desc limit 20`;
  const [{n}] = await sql<{n: number}[]>`select count(*)::int as n from orders where user_id = ${id}`;
  const d = u.bday;
  return {
    name: u.name,
    phone: showPhone(u.phone),
    points: u.points,
    stamps: u.stamps,
    sub: u.sub,
    code: u.card,
    bday: d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '',
    orders: rows.map((r) => ({no: r.no, at: r.created_at.getTime(), total: r.total, items: r.items, lines: r.lines})),
    count: n,
  };
}

async function sessionUser(c: Context): Promise<string | null> {
  const t = getCookie(c, COOKIE);
  if (!t) return null;
  const [s] = await sql<{user_id: string}[]>`select user_id from sessions where token_hash = ${hash(t)} and expires_at > now()`;
  return s?.user_id ?? null;
}
async function needUser(c: Context) {
  const id = await sessionUser(c);
  if (!id) throw new Bad('Войдите по номеру ещё раз.', 401);
  return id;
}

const newCard = () => 'LX' + Array.from({length: 6}, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[randomInt(32)]).join('');

/** Начисление за оплаченный заказ — ровно один раз. */
async function credit(tx: postgres.TransactionSql, orderId: string) {
  const [o] = await tx<{user_id: string; credit: {points: number; stamps: number; sub: number}}[]>`
    update orders set credited = true where id = ${orderId} and paid and not credited returning user_id, credit`;
  if (!o) return;
  await tx`update users set points = points + ${o.credit.points ?? 0}, stamps = least(5, stamps + ${o.credit.stamps ?? 0}), sub = sub + ${o.credit.sub ?? 0} where id = ${o.user_id}`;
}

/* ── заказ: проверка того, что пришло из браузера ── */
const PLATE = /^[АВЕКМНОРСТУХ]\d{3}[АВЕКМНОРСТУХ]{2}$/;
const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

function readLine(raw: unknown): Line {
  const r = (raw ?? {}) as {id?: unknown; o?: unknown; qty?: unknown};
  const id = String(r.id ?? '');
  const item: Item | undefined = id === SUB.id ? SUB : MENU.find((m) => m.id === id);
  if (!item) throw new Bad('В корзине есть позиция, которой больше нет в меню. Обновите страницу.');
  if (item.soon) throw new Bad(`«${item.name}» пока нельзя заказать: кофейня уточняет цену.`);
  const qty = Number(r.qty);
  if (!Number.isInteger(qty) || qty < 1 || qty > 20) throw new Bad('Количество от 1 до 20.');
  const o: Choice = {};
  for (const [k, v] of Object.entries((r.o ?? {}) as Record<string, unknown>)) {
    if (k === 'shot' || k === 'warm') {
      if (v === true) o[k] = true;
      continue;
    }
    const list = item.opts?.[k as OptKey];
    if (!Array.isArray(list) || !Number.isInteger(v) || (v as number) < 0 || (v as number) >= list.length)
      throw new Bad(`У «${item.name}» нет такого варианта. Обновите страницу.`);
    o[k as OptKey] = v as number;
  }
  if (o.shot && !item.opts?.shot) delete o.shot;
  if (o.warm && !item.opts?.warm) delete o.warm;
  return {key: id + '|' + JSON.stringify(o), id, o, qty, price: unitPrice(item, o)};
}

/* ── приложение ── */
const app = new Hono().basePath('/api');
app.use('*', bodyLimit({maxSize: 32 * 1024}));
// Запросы, меняющие данные, — только JSON и только со своего адреса.
app.use('*', async (c, next) => {
  if (c.req.method !== 'GET') {
    if (!(c.req.header('content-type') ?? '').startsWith('application/json')) throw new Bad('Ожидаем JSON.', 415);
    const origin = c.req.header('origin');
    if (origin && new URL(origin).host !== c.req.header('host')) throw new Bad('Чужой адрес.', 403);
  }
  await next();
  c.header('Cache-Control', 'no-store');
});
app.onError((e, c) => {
  if (e instanceof Bad) return c.json({error: e.message, field: e.field}, e.status as 400);
  console.error(e);
  return c.json({error: 'У нас что-то сломалось. Попробуйте ещё раз через минуту.'}, 500);
});

app.get('/health', async (c) => {
  await sql`select 1`;
  return c.json({ok: true});
});

app.post('/auth/code', async (c) => {
  const {phone: raw} = await c.req.json<{phone?: string}>();
  const phone = normPhone(raw);
  if (AUTH_TEST && !TEST_PHONES.has(phone)) throw new Bad('Вход пока открыт только для тестовых номеров: кофейня подключает СМС.', 403, 'phone');
  limit('code-ip:' + ip(c), 10, 3600e3);
  limit('code-phone:' + phone, 5, 3600e3);
  const [prev] = await sql<{sent_at: Date}[]>`select sent_at from auth_codes where phone = ${phone}`;
  if (prev && Date.now() - prev.sent_at.getTime() < 60e3) throw new Bad('Код уже отправлен. Новый можно запросить через минуту.', 429);
  const code = String(randomInt(10000)).padStart(4, '0');
  await sql`
    insert into auth_codes (phone, code_hash, expires_at, attempts, sent_at)
    values (${phone}, ${hash(phone + code)}, now() + interval '10 minutes', 0, now())
    on conflict (phone) do update set code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0, sent_at = now()`;
  if (!AUTH_TEST) await sendSms(phone, `Ликс: код для входа ${code}`);
  return c.json({ok: true});
});

app.post('/auth/verify', async (c) => {
  const b = await c.req.json<{phone?: string; code?: string; name?: string}>();
  const phone = normPhone(b.phone);
  const code = String(b.code ?? '');
  if (!/^\d{4}$/.test(code)) throw new Bad('Код из четырёх цифр.');
  if (AUTH_TEST && !TEST_PHONES.has(phone)) throw new Bad('Вход пока открыт только для тестовых номеров.', 403);
  limit('verify-ip:' + ip(c), 30, 3600e3);
  limit('verify-phone:' + phone, 15, 86400e3);
  // Попытку засчитываем атомарно до сравнения: параллельные запросы не обойдут лимит в пять.
  const [row] = await sql<{code_hash: string}[]>`
    update auth_codes set attempts = attempts + 1
    where phone = ${phone} and attempts < 5 and expires_at > now()
    returning code_hash`;
  if (!row) throw new Bad('Код устарел или введён неверно пять раз. Нажмите «Изменить номер» и запросите новый.', 429);
  if (!AUTH_TEST && !same(row.code_hash, hash(phone + code))) throw new Bad('Код не подошёл. Проверьте СМС и введите ещё раз.');
  // Код одноразовый: удалить может только один запрос, второй с тем же кодом не войдёт.
  const used = await sql`delete from auth_codes where phone = ${phone} and code_hash = ${row.code_hash}`;
  if (!used.count) throw new Bad('Код уже использован. Запросите новый.');
  const name = str(b.name, 30);
  const [u] = await sql<{id: string}[]>`
    insert into users (phone, name, card) values (${phone}, ${name}, ${newCard()})
    on conflict (phone) do update set name = case when users.name = '' then excluded.name else users.name end
    returning id`;
  const token = randomBytes(32).toString('base64url');
  await sql`insert into sessions (token_hash, user_id, expires_at) values (${hash(token)}, ${u.id}, now() + make_interval(days => ${SESSION_DAYS}))`;
  setCookie(c, COOKIE, token, {httpOnly: true, secure: env.COOKIE_INSECURE !== '1', sameSite: 'Lax', path: '/', maxAge: SESSION_DAYS * 86400});
  return c.json({user: await loadUser(u.id)});
});

app.post('/auth/logout', async (c) => {
  const t = getCookie(c, COOKIE);
  if (t) await sql`delete from sessions where token_hash = ${hash(t)}`;
  deleteCookie(c, COOKIE, {path: '/'});
  return c.json({ok: true});
});

app.get('/me', async (c) => {
  const id = await sessionUser(c);
  return c.json({user: id ? await loadUser(id) : null});
});

app.patch('/me', async (c) => {
  const id = await needUser(c);
  const b = await c.req.json<{bday?: string; name?: string}>();
  if (b.name !== undefined) await sql`update users set name = ${str(b.name, 30)} where id = ${id}`;
  if (b.bday !== undefined) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(b.bday));
    const d = m && new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    if (!d || d.getUTCDate() !== +m![3] || +m![1] < 1920 || d.getTime() > Date.now()) throw new Bad('Проверьте дату рождения.', 400, 'bday');
    const r = await sql`update users set bday = ${String(b.bday)} where id = ${id} and bday is null`;
    if (!r.count) throw new Bad('Дата уже сохранена. Поменять её можно на кассе.');
  }
  return c.json({user: await loadUser(id)});
});

app.post('/orders', async (c) => {
  const id = await needUser(c);
  limit('order-user:' + id, 20, 3600e3);
  const b = await c.req.json<Record<string, unknown>>();
  if (!Array.isArray(b.cart) || !b.cart.length) throw new Bad('Корзина пустая.');
  if (b.cart.length > 30) throw new Bad('Слишком много позиций в одном заказе.');
  const cart = b.cart.map(readLine);
  const mode = String(b.mode) as ModeId;
  if (!(mode in MODES)) throw new Bad('Выберите, как забрать заказ.');
  const pay = String(b.pay);
  if (!['sbp', 'card', 'cash'].includes(pay)) throw new Bad('Выберите способ оплаты.');
  if (pay === 'cash' && (mode === 'car' || mode === 'delivery')) throw new Bad('К машине и с доставкой — только оплата онлайн.');
  const s: Omit<Calc, 'user'> = {
    mode, cart,
    table: str(b.table, 3), plate: str(b.plate, 6).toUpperCase(), region: str(b.region, 3),
    cutlery: b.cutlery == null ? null : Math.max(0, Math.min(20, Math.floor(Number(b.cutlery)) || 0)),
    napkins: b.napkins === true, carrier: b.carrier === true, sticks: b.sticks === true,
    comment: str(b.comment, 200), usePoints: b.usePoints === true, useGift: b.useGift === true, useSub: b.useSub === true,
  };
  const address = str(b.address, 200), flat = str(b.flat, 20), when = str(b.when, 10);
  if (mode === 'hall' && !/^\d{1,3}$/.test(s.table)) throw new Bad('Впишите номер столика.', 400, 'table');
  if (mode === 'car' && !PLATE.test(s.plate)) throw new Bad('Номер в формате А123ВС, чтобы бариста нашёл машину.', 400, 'plate');
  if (mode === 'car' && !/^\d{2,3}$/.test(s.region)) throw new Bad('Регион: две или три цифры.', 400, 'region');
  if (mode === 'delivery' && address.length < 5) throw new Bad('Впишите улицу и дом.', 400, 'address');
  const h = cafeHour();
  if (!cafe.testMode && (h < cafe.open || h >= cafe.close - 0.25))
    throw new Bad(`Принимаем заказы с ${cafe.open}:00 до ${cafe.close - 1}:45.`);

  const result = await sql.begin(async (tx) => {
    const [u] = await tx<Row[]>`select * from users where id = ${id} for update`;
    const [{n}] = await tx<{n: number}[]>`select count(*)::int as n from orders where user_id = ${id}`;
    const calc: Calc = {...s, user: {name: u.name, phone: u.phone, points: u.points, stamps: u.stamps, sub: u.sub, orders: [], code: u.card, bday: '', count: n}};
    const t = totals(calc);
    const [{next}] = await tx<{next: string}[]>`select nextval('orders_id_seq') as next`;
    const no = 100 + (Number(next) % 900);
    const how = str(b.how, 40) || (pay === 'cash' ? 'на кассе' : 'онлайн');
    const r = buildOrder(calc, t, how, no, Date.now());
    const details = {table: s.table, plate: s.plate, region: s.region, address, flat, when, extras: r.order.extras, comment: s.comment};
    const lines = cart.map(({id: i, o, qty, price}) => ({id: i, o, qty, price, name: byId(i).name}));
    // Онлайн-оплату пока подтверждает только тестовый режим стенда; наличные — бариста, когда отдаст заказ.
    const paid = pay !== 'cash' && PAY_TEST;
    await tx`
      insert into orders (id, no, user_id, mode, how, pay, paid, items, lines, details, totals, total, spend, credit)
      values (${next}, ${no}, ${id}, ${mode}, ${how}, ${pay}, ${paid},
        ${tx.json(r.order.items)}, ${tx.json(lines)}, ${tx.json(details)}, ${tx.json(t as never)}, ${t.total},
        ${tx.json(r.spend)}, ${tx.json(r.credit)})`;
    // Списываем сразу, чтобы одни баллы нельзя было потратить в двух заказах; начисляем только оплаченное.
    await tx`update users set points = points - ${r.spend.points}, stamps = stamps - ${r.spend.stamps}, sub = sub - ${r.spend.sub} where id = ${id}`;
    if (paid) await credit(tx, next);
    return r.order;
  });
  return c.json({order: result, user: await loadUser(id)});
});

/* ── экран бариста: заказы за сегодня и смена статуса, по ключу из окружения ── */
const staff = (c: Context) => {
  const k = c.req.header('x-staff-key') ?? '';
  if (!STAFF_KEY || !same(hash(k), hash(STAFF_KEY))) throw new Bad('Нужен ключ бариста.', 401);
};
app.get('/staff/orders', async (c) => {
  staff(c);
  const rows = await sql`
    select o.id, o.no, o.created_at, o.mode, o.how, o.pay, o.paid, o.status, o.items, o.lines, o.details, o.total, u.name, u.phone
    from orders o join users u on u.id = o.user_id
    where o.created_at > now() - interval '18 hours' order by o.created_at desc`;
  return c.json({orders: rows});
});
app.post('/staff/orders/:id', async (c) => {
  staff(c);
  const {status} = await c.req.json<{status?: string}>();
  const st = String(status);
  if (!['new', 'cooking', 'ready', 'done', 'cancelled'].includes(st)) throw new Bad('Неизвестный статус.');
  const oid = c.req.param('id');
  if (!/^\d+$/.test(oid)) throw new Bad('Нет такого заказа.', 404);
  await sql.begin(async (tx) => {
    const [o] = await tx<{status: string; credited: boolean; user_id: string; spend: {points: number; stamps: number; sub: number}}[]>`
      select status, credited, user_id, spend from orders where id = ${oid} for update`;
    if (!o) throw new Bad('Нет такого заказа.', 404);
    if (o.status === 'cancelled') throw new Bad('Заказ уже отменён.', 409);
    if (st === 'cancelled') {
      if (o.credited) throw new Bad('Заказ уже оплачен и закрыт, отменить его можно только возвратом.', 409);
      // Отмена возвращает то, что списали при заказе.
      await tx`update users set points = points + ${o.spend.points ?? 0}, stamps = least(5, stamps + ${o.spend.stamps ?? 0}), sub = sub + ${o.spend.sub ?? 0} where id = ${o.user_id}`;
    }
    // Отдал заказ — значит, на кассе оплачен: начисляем баллы и чашки.
    if (st === 'done') {
      await tx`update orders set paid = true where id = ${oid}`;
      await credit(tx, oid);
    }
    await tx`update orders set status = ${st} where id = ${oid}`;
  });
  return c.json({ok: true});
});

await migrate();
// Старые сессии и коды подчищаем раз в час.
setInterval(() => {
  sql`delete from sessions where expires_at < now()`.catch(() => {});
  sql`delete from auth_codes where expires_at < now() - interval '1 day'`.catch(() => {});
}, 3600e3).unref();

const port = Number(env.PORT ?? 8787);
serve({fetch: app.fetch, port, hostname: env.HOST ?? '127.0.0.1'}, () => console.log(`Ликс API на :${port}`));
