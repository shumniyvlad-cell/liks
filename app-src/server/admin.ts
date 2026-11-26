// Админка Ликса: вход по логину и паролю, сводка по кассе SIGMA и приложению, меню, склад и поставки.
// Всё под /api/admin, кука liks_a только для этого пути.

import {createHash, randomBytes, scryptSync, timingSafeEqual} from 'node:crypto';
import {mkdir, writeFile} from 'node:fs/promises';
import type {Context, Hono} from 'hono';
import {deleteCookie, getCookie, setCookie} from 'hono/cookie';
import {CATS} from '../src/business';
import {Bad} from './bad';
import {sql} from './db';
import {loadRows, rebuildMenu, resolve, sigmaItems, type Card} from './menu';
import {setPrice, sigmaOn, sync, syncState, SigmaError} from './sigma';

const env = process.env;
const COOKIE = 'liks_a';
const DAYS = 30;
const MEDIA = env.MEDIA_DIR ?? '/var/lib/liks/media';
const tokenHash = (t: string) => createHash('sha256').update('admin:' + (env.SECRET ?? '') + t).digest('hex');

/* ── пароли ── */
export function hashPassword(p: string) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString('base64')}$${scryptSync(p, salt, 64).toString('base64')}`;
}
function checkPassword(p: string, stored: string) {
  const [kind, salt, h] = stored.split('$');
  if (kind !== 'scrypt' || !salt || !h) return false;
  const got = scryptSync(p, Buffer.from(salt, 'base64'), 64);
  const want = Buffer.from(h, 'base64');
  return got.length === want.length && timingSafeEqual(got, want);
}
// Чтобы по времени ответа нельзя было понять, есть ли такой логин.
const DUMMY = hashPassword(randomBytes(12).toString('hex'));

export async function addAdmin(login: string, name: string) {
  const pass = randomBytes(9).toString('base64url');
  await sql`insert into admins (login, name, pass_hash) values (${login.toLowerCase()}, ${name}, ${hashPassword(pass)})
    on conflict (login) do update set pass_hash = excluded.pass_hash, name = excluded.name`;
  await sql`delete from admin_sessions where admin_id = (select id from admins where login = ${login.toLowerCase()})`;
  return pass;
}

type Limit = (key: string, max: number, windowMs: number) => void;

async function needAdmin(c: Context) {
  const t = getCookie(c, COOKIE);
  if (t) {
    const [a] = await sql<{id: string; login: string; name: string}[]>`
      select a.id, a.login, a.name from admin_sessions s join admins a on a.id = s.admin_id
      where s.token_hash = ${tokenHash(t)} and s.expires_at > now()`;
    if (a) return a;
  }
  throw new Bad('Войдите в админку.', 401);
}

/* ── даты: всё считаем по Москве ── */
const DAY = /^\d{4}-\d{2}-\d{2}$/;
function mskToday() {
  return new Intl.DateTimeFormat('en-CA', {timeZone: 'Europe/Moscow'}).format(new Date());
}
const addDays = (d: string, n: number) => new Date(Date.parse(d + 'T00:00:00Z') + n * 86400e3).toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400e3) + 1;
const num = (v: unknown) => Number(v ?? 0) || 0;
const rub = (n: number) => new Intl.NumberFormat('ru-RU').format(Math.round(n)) + ' ₽';

type Totals = {revenue: number; refunds: number; checks: number; cash: number; card: number};
async function totalsFor(from: string, to: string): Promise<Totals> {
  const [r] = await sql`
    select
      coalesce(sum(sum) filter (where kind = 'Payment'), 0) as pay,
      coalesce(sum(sum) filter (where kind <> 'Payment'), 0) as refunds,
      count(*) filter (where kind = 'Payment') as checks,
      coalesce(sum(case when kind = 'Payment' then sum else -sum end) filter (where method = 'Cash'), 0) as cash,
      coalesce(sum(case when kind = 'Payment' then sum else -sum end) filter (where method <> 'Cash'), 0) as card
    from sigma_ops
    where (at at time zone 'Europe/Moscow')::date between ${from}::date and ${to}::date`;
  return {revenue: num(r.pay) - num(r.refunds), refunds: num(r.refunds), checks: num(r.checks), cash: num(r.cash), card: num(r.card)};
}


/* ── прибыль: выручка − себестоимость по техкартам − эквайринг − расходы ── */
export const EXPENSE_CATS = ['Аренда', 'Зарплата', 'Продукты и упаковка вне кассы', 'Коммуналка и связь', 'Налоги и патент', 'Реклама', 'Ремонт и техника', 'Прочее'];

async function acquiringPct() {
  const [r] = await sql<{value: string}[]>`select value from kv where key = 'acquiring_pct'`;
  return r ? Number(r.value) : null;
}

const daysInMonth = (d: string) => new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7), 0)).getUTCDate();

async function expensesFor(from: string, to: string) {
  const rows = await sql<{id: string; day: Date; category: string; amount: string; monthly: boolean; until: Date | null}[]>`
    select id, day, category, amount, monthly, until from expenses
    where (not monthly and day between ${from}::date and ${to}::date)
       or (monthly and day <= ${to}::date and (until is null or until >= ${from}::date))`;
  const byCat = new Map<string, number>();
  for (const e of rows) {
    let sum = Number(e.amount);
    if (e.monthly) {
      // Ежемесячный расход размазываем по дням: за неделю попадёт четверть аренды, за месяц — вся.
      const start = [from, e.day.toISOString().slice(0, 10)].sort()[1];
      const end = [to, e.until ? e.until.toISOString().slice(0, 10) : to].sort()[0];
      sum = 0;
      for (let d = start; d <= end; d = addDays(d, 1)) sum += Number(e.amount) / daysInMonth(d);
    }
    byCat.set(e.category, (byCat.get(e.category) ?? 0) + sum);
  }
  return [...byCat].map(([category, amount]) => ({category, amount})).sort((a, b) => b.amount - a.amount);
}

async function profitFor(from: string, to: string, t: Totals) {
  const items = await sigmaItems();
  const cost = new Map([...items.values()].filter((x) => x.unit === 'шт' && x.cost).map((x) => [x.name.toLowerCase(), x.cost!]));
  const lines = await sql<{name: string; qty: string; price: string | null; discount: string | null; kind: string}[]>`
    select l->>'name' as name, (l->>'qty') as qty, (l->>'price') as price, (l->>'discount') as discount, o.kind
    from sigma_ops o, jsonb_array_elements(o.lines) l
    where (o.at at time zone 'Europe/Moscow')::date between ${from}::date and ${to}::date`;
  let cogs = 0, covered = 0, linesRevenue = 0;
  for (const l of lines) {
    const sign = l.kind === 'Payment' ? 1 : -1;
    const rev = (num(l.price) * num(l.qty) - num(l.discount)) * sign;
    linesRevenue += rev;
    const c = cost.get(l.name.toLowerCase());
    if (c) {
      cogs += c * num(l.qty) * sign;
      covered += rev;
    }
  }
  const pct = await acquiringPct();
  const acquiring = pct ? (t.card * pct) / 100 : 0;
  const expenses = await expensesFor(from, to);
  const exp = expenses.reduce((a, b) => a + b.amount, 0);
  return {
    revenue: t.revenue, cost: cogs, coverage: linesRevenue > 0 ? covered / linesRevenue : 0,
    acquiring, acquiringPct: pct, expenses, expensesTotal: exp, net: t.revenue - cogs - acquiring - exp,
  };
}

export function mountAdmin(app: Hono, h: {limit: Limit; ip: (c: Context) => string}) {
  const {limit, ip} = h;

  app.post('/admin/login', async (c) => {
    const b = await c.req.json<{login?: string; password?: string}>();
    const login = String(b.login ?? '').trim().toLowerCase().slice(0, 40);
    const pass = String(b.password ?? '').slice(0, 200);
    if (!login) throw new Bad('Впишите логин.', 400, 'login');
    if (!pass) throw new Bad('Впишите пароль.', 400, 'password');
    limit('admin-ip:' + ip(c), 10, 900e3);
    limit('admin-login:' + login, 10, 900e3);
    const [a] = await sql<{id: string; pass_hash: string}[]>`select id, pass_hash from admins where login = ${login}`;
    const ok = checkPassword(pass, a?.pass_hash ?? DUMMY);
    if (!a || !ok) throw new Bad('Логин или пароль не подошли.', 401, 'password');
    const t = randomBytes(32).toString('base64url');
    await sql`insert into admin_sessions (token_hash, admin_id, expires_at) values (${tokenHash(t)}, ${a.id}, now() + make_interval(days => ${DAYS}))`;
    setCookie(c, COOKIE, t, {httpOnly: true, secure: env.COOKIE_INSECURE !== '1', sameSite: 'Strict', path: '/api/admin', maxAge: DAYS * 86400});
    return c.json({ok: true});
  });

  app.post('/admin/logout', async (c) => {
    const t = getCookie(c, COOKIE);
    if (t) await sql`delete from admin_sessions where token_hash = ${tokenHash(t)}`;
    deleteCookie(c, COOKIE, {path: '/api/admin'});
    return c.json({ok: true});
  });

  app.post('/admin/password', async (c) => {
    const a = await needAdmin(c);
    const b = await c.req.json<{old?: string; next?: string}>();
    const next = String(b.next ?? '');
    if (next.length < 10) throw new Bad('Новый пароль — не короче 10 символов.', 400, 'next');
    limit('admin-pass:' + a.id, 10, 900e3);
    const [r] = await sql<{pass_hash: string}[]>`select pass_hash from admins where id = ${a.id}`;
    if (!checkPassword(String(b.old ?? ''), r.pass_hash)) throw new Bad('Старый пароль не подошёл.', 400, 'old');
    await sql`update admins set pass_hash = ${hashPassword(next)} where id = ${a.id}`;
    const t = getCookie(c, COOKIE) ?? '';
    await sql`delete from admin_sessions where admin_id = ${a.id} and token_hash <> ${tokenHash(t)}`;
    return c.json({ok: true});
  });

  app.get('/admin/me', async (c) => {
    const a = await needAdmin(c);
    return c.json({admin: {login: a.login, name: a.name}, sync: syncState(), sigma: sigmaOn});
  });

  app.post('/admin/sync', async (c) => {
    await needAdmin(c);
    limit('admin-sync', 6, 60e3);
    const s = await sync(true);
    return c.json({sync: s});
  });

  /* ── сводка ── */
  app.get('/admin/summary', async (c) => {
    await needAdmin(c);
    const today = mskToday();
    const from = DAY.test(c.req.query('from') ?? '') ? c.req.query('from')! : today.slice(0, 8) + '01';
    const to = DAY.test(c.req.query('to') ?? '') ? c.req.query('to')! : today;
    if (from > to || daysBetween(from, to) > 400) throw new Bad('Проверьте даты периода.');
    const len = daysBetween(from, to);
    const prevTo = addDays(from, -1), prevFrom = addDays(from, -len);

    const cur = await totalsFor(from, to);
    const prev = await totalsFor(prevFrom, prevTo);
    const profit = await profitFor(from, to, cur);
    const prevProfit = await profitFor(prevFrom, prevTo, prev);

    const days = await sql<{d: string; revenue: string; checks: string}[]>`
      select to_char((at at time zone 'Europe/Moscow')::date, 'YYYY-MM-DD') as d,
        sum(case when kind = 'Payment' then sum else -sum end) as revenue, count(*) filter (where kind = 'Payment') as checks
      from sigma_ops where (at at time zone 'Europe/Moscow')::date between ${from}::date and ${to}::date
      group by 1 order by 1`;
    const byDay = new Map(days.map((d) => [d.d, {revenue: num(d.revenue), checks: num(d.checks)}]));
    const series = Array.from({length: len}, (_, i) => {
      const d = addDays(from, i);
      return {d, ...(byDay.get(d) ?? {revenue: 0, checks: 0})};
    });

    const hours = await sql<{h: number; checks: string; revenue: string}[]>`
      select extract(hour from at at time zone 'Europe/Moscow')::int as h, count(*) as checks, sum(sum) as revenue
      from sigma_ops where kind = 'Payment' and (at at time zone 'Europe/Moscow')::date between ${from}::date and ${to}::date
      group by 1 order by 1`;

    // Позиции из чеков: штучные — по количеству, весовые («пф» в граммах) — по числу чеков.
    const items = await sigmaItems();
    const priceByName = new Map([...items.values()].map((s) => [s.name.toLowerCase(), s]));
    const lines = await sql<{name: string; unit: string; qty: string; checks: string}[]>`
      select l->>'name' as name, l->>'unit' as unit, sum((l->>'qty')::numeric) as qty, count(*) as checks
      from sigma_ops o, jsonb_array_elements(o.lines) l
      where o.kind = 'Payment' and (o.at at time zone 'Europe/Moscow')::date between ${from}::date and ${to}::date
      group by 1, 2`;
    let costKnown = 0, costSum = 0, costRevenue = 0;
    const top = lines.map((l) => {
      const s = priceByName.get(l.name.toLowerCase());
      const qty = l.unit === 'шт' ? num(l.qty) : num(l.checks);
      const revenue = s && s.unit === 'шт' ? s.price * qty : 0;
      if (s?.cost && s.unit === 'шт') {
        costKnown++;
        costSum += s.cost * qty;
        costRevenue += revenue;
      }
      return {name: l.name, qty, unit: l.unit, revenue, semi: / пф$/i.test(l.name) || l.unit !== 'шт'};
    }).sort((a, b) => b.qty - a.qty || b.revenue - a.revenue);

    const [app] = await sql`
      select count(*) as n, coalesce(sum(total), 0) as total, count(*) filter (where paid) as paid
      from orders where status <> 'cancelled' and (created_at at time zone 'Europe/Moscow')::date between ${from}::date and ${to}::date`;

    // Прогноз на текущий месяц: сколько уже есть + средний день за последние 14 дней с продажами × оставшиеся дни.
    const monthFrom = today.slice(0, 8) + '01';
    const monthEnd = addDays(addDays(monthFrom, 32).slice(0, 8) + '01', -1);
    const mtd = await totalsFor(monthFrom, today);
    const [avg] = await sql`
      select count(*) as days, coalesce(avg(r), 0) as avg from (
        select (at at time zone 'Europe/Moscow')::date as d, sum(case when kind = 'Payment' then sum else -sum end) as r
        from sigma_ops where at > now() - interval '14 days' group by 1) x`;
    const left = daysBetween(today, monthEnd) - 1;
    const forecast = num(avg.days) >= 3
      ? {ready: true, month: monthFrom.slice(0, 7), toDate: mtd.revenue, avgDay: num(avg.avg), projected: mtd.revenue + num(avg.avg) * left, daysLeft: left}
      : {ready: false, month: monthFrom.slice(0, 7), toDate: mtd.revenue, avgDay: num(avg.avg), projected: 0, daysLeft: left, days: num(avg.days)};

    const [stock] = await sql`
      select coalesce(sum(greatest(remainder, 0) * buy_price), 0) as value, count(*) as items,
        count(*) filter (where remainder < 0) as negative, count(*) filter (where buy_price > 0) as priced
      from sigma_stock`;
    const [wb] = await sql`
      select count(*) as n, coalesce(sum(sum), 0) as total from sigma_waybills
      where data->>'type' = 'INCOME' and status = 'SAVED' and (at at time zone 'Europe/Moscow')::date between ${from}::date and ${to}::date`;
    const [shift] = await sql`select no, opened, closed, drawer, total from sigma_shifts order by opened desc nulls last limit 1`;

    /* ── советы: только по фактам из кассы ── */
    const advice: {tone: 'warn' | 'info' | 'good'; title: string; text: string}[] = [];
    if (!num(stock.priced) && !num(wb.n))
      advice.push({tone: 'warn', title: 'Себестоимость пока не считается',
        text: 'В SIGMA нет ни одного прихода, закупочные цены у всех ингредиентов 0. Проведите поставки в разделе «Документы → Приходы», и здесь появятся маржа и фудкост по каждому блюду.'});
    const semi = top.filter((t) => / пф$/i.test(t.name));
    if (semi.length)
      advice.push({tone: 'warn', title: 'На кассе пробивают полуфабрикаты',
        text: `${semi.map((s) => `«${s.name}»`).join(', ')} пробиты вместо готового блюда. Продажи и остатки из-за этого считаются неверно: пробивайте блюдо из меню, например «${semi[0].name.replace(/ пф$/i, '')}».`});
    const zero = [...items.values()].filter((s) => !(s.price > 0) && !/ пф$/i.test(s.name));
    if (zero.length)
      advice.push({tone: 'info', title: 'Позиции без цены в кассе',
        text: `${zero.map((s) => `«${s.name}»`).join(', ')}: цена 0. В приложении такие блюда показываются с подписью «Цена скоро», заказать их нельзя.`});
    if (profit.acquiringPct == null && cur.card > 0)
      advice.push({tone: 'info', title: 'Укажите комиссию эквайринга',
        text: 'Альфа-Банк берёт процент с каждой оплаты картой. Впишите ставку в разделе «Расходы», и она вычтется из прибыли.'});
    if (!profit.expensesTotal)
      advice.push({tone: 'info', title: 'Расходов пока нет',
        text: 'Чтобы видеть чистую прибыль, внесите аренду, зарплату, коммуналку и патент в разделе «Расходы». Ежемесячные достаточно внести один раз.'});
    if (num(stock.negative))
      advice.push({tone: 'warn', title: 'Остатки ушли в минус',
        text: `У ${num(stock.negative)} товаров на складе остаток меньше нуля: продали больше, чем пришло. Проведите приход или инвентаризацию.`});
    if (costKnown && costRevenue > 0) {
      const fc = costSum / costRevenue;
      advice.push({tone: fc > 0.35 ? 'warn' : 'good', title: `Фудкост ${Math.round(fc * 100)}%`,
        text: fc > 0.35 ? 'Выше 35%: проверьте цены у блюд с самой дорогой техкартой.' : 'В норме для кофейни (до 30–35%).'});
    }
    const peak = [...hours].sort((a, b) => num(b.checks) - num(a.checks))[0];
    if (peak && cur.checks >= 30)
      advice.push({tone: 'info', title: `Пик с ${peak.h}:00 до ${peak.h + 1}:00`,
        text: `В этот час ${num(peak.checks)} чеков за период. Держите на это время второго бариста и заготовки.`});
    if (cur.checks >= 30 && num(app.n) / cur.checks < 0.1)
      advice.push({tone: 'info', title: 'Приложением пользуются мало',
        text: `Через приложение ${num(app.n)} заказов из ${cur.checks + num(app.n)}. Поставьте QR на кассу и столы и говорите гостям про −20% на первый заказ.`});
    if (cur.checks && cur.checks < 30)
      advice.push({tone: 'info', title: 'Пока мало продаж для выводов',
        text: `За период ${cur.checks} ${cur.checks === 1 ? 'чек' : cur.checks < 5 ? 'чека' : 'чеков'}. Пики по часам, прогноз и сравнение блюд появятся, когда наберётся хотя бы неделя работы.`});
    if (prev.revenue > 0 && cur.revenue < prev.revenue * 0.85 && len >= 7)
      advice.push({tone: 'warn', title: 'Выручка ниже прошлого периода',
        text: `${rub(cur.revenue)} против ${rub(prev.revenue)} (${Math.round((cur.revenue / prev.revenue - 1) * 100)}%). Посмотрите, какие дни и блюда просели.`});

    return c.json({
      period: {from, to, prevFrom, prevTo},
      cur, prev, series,
      hours: hours.map((x) => ({h: x.h, checks: num(x.checks), revenue: num(x.revenue)})),
      top: top.slice(0, 12),
      app: {orders: num(app.n), total: num(app.total), paid: num(app.paid)},
      forecast,
      stock: {value: num(stock.value), items: num(stock.items), negative: num(stock.negative), priced: num(stock.priced)},
      supplies: {count: num(wb.n), total: num(wb.total)},
      shift: shift ? {no: shift.no, opened: shift.opened, closed: shift.closed, drawer: num(shift.drawer), total: num(shift.total)} : null,
      foodcost: costKnown && costRevenue ? costSum / costRevenue : null,
      profit, prevNet: prevProfit.net,
      advice,
      sync: syncState(),
    });
  });


  /* ── смены ── */
  app.get('/admin/shifts', async (c) => {
    await needAdmin(c);
    const today = mskToday();
    const from = DAY.test(c.req.query('from') ?? '') ? c.req.query('from')! : addDays(today, -30);
    const to = DAY.test(c.req.query('to') ?? '') ? c.req.query('to')! : today;
    const rows = await sql`
      select s.id, s.no, s.opened, s.closed, s.cashier, s.open_amount::float as "openAmount", s.cash::float as cash, s.card::float as card,
        s.refunds::float as refunds, s.cash_in::float as "cashIn", s.collections::float as collections, s.drawer::float as drawer,
        s.total::float as total, s.checks,
        (select count(*) from sigma_ops o where o.kind = 'Payment' and o.at >= s.opened and (s.closed is null or o.at <= s.closed))::int as "opsChecks"
      from sigma_shifts s
      where (s.opened at time zone 'Europe/Moscow')::date <= ${to}::date
        and (s.closed is null or (s.closed at time zone 'Europe/Moscow')::date >= ${from}::date)
      order by s.opened desc nulls last`;
    return c.json({from, to, shifts: rows});
  });

  /* ── чеки ── */
  app.get('/admin/checks', async (c) => {
    await needAdmin(c);
    const today = mskToday();
    const from = DAY.test(c.req.query('from') ?? '') ? c.req.query('from')! : today;
    const to = DAY.test(c.req.query('to') ?? '') ? c.req.query('to')! : today;
    const shift = c.req.query('shift') ?? '';
    const method = c.req.query('method') ?? '';
    const q = (c.req.query('q') ?? '').trim().toLowerCase().slice(0, 60);
    let opened: Date | null = null, closed: Date | null = null;
    if (shift) {
      const [s] = await sql<{opened: Date; closed: Date | null}[]>`select opened, closed from sigma_shifts where id = ${shift}`;
      if (!s) throw new Bad('Нет такой смены.', 404);
      opened = s.opened;
      closed = s.closed;
    }
    const rows = await sql`
      select id, at, number, method, kind, sum::float as sum, discount::float as discount, cashier, lines
      from sigma_ops
      where ${shift ? sql`at >= ${opened} and (${closed}::timestamptz is null or at <= ${closed})` : sql`(at at time zone 'Europe/Moscow')::date between ${from}::date and ${to}::date`}
        ${method === 'cash' ? sql`and method = 'Cash'` : method === 'card' ? sql`and method <> 'Cash'` : sql``}
        ${q ? sql`and exists (select 1 from jsonb_array_elements(lines) l where lower(l->>'name') like ${'%' + q + '%'})` : sql``}
      order by at desc limit 1000`;
    return c.json({from, to, checks: rows});
  });

  /* ── расходы и комиссия ── */
  app.get('/admin/expenses', async (c) => {
    await needAdmin(c);
    const rows = await sql`select id, to_char(day, 'YYYY-MM-DD') as day, category, amount::float as amount, comment, monthly,
      to_char(until, 'YYYY-MM-DD') as until, created_by as "createdBy" from expenses order by monthly desc, day desc, id desc limit 500`;
    return c.json({expenses: rows, cats: EXPENSE_CATS, acquiringPct: await acquiringPct()});
  });
  app.post('/admin/expenses', async (c) => {
    const a = await needAdmin(c);
    const b = await c.req.json<{day?: string; category?: string; amount?: number; comment?: string; monthly?: boolean}>();
    const day = String(b.day ?? '');
    if (!DAY.test(day) || Number.isNaN(Date.parse(day))) throw new Bad('Выберите дату.', 400, 'day');
    if (!EXPENSE_CATS.includes(String(b.category))) throw new Bad('Выберите статью.', 400, 'category');
    const amount = Number(b.amount);
    if (!(amount > 0) || amount > 10_000_000) throw new Bad('Сумма больше нуля.', 400, 'amount');
    await sql`insert into expenses (day, category, amount, comment, monthly, created_by)
      values (${day}, ${String(b.category)}, ${Math.round(amount * 100) / 100}, ${String(b.comment ?? '').trim().slice(0, 200)}, ${b.monthly === true}, ${a.login})`;
    return c.json({ok: true});
  });
  // Ежемесячный расход не удаляем задним числом: закрываем вчерашним днём, прошлые месяцы остаются в прибыли.
  app.delete('/admin/expenses/:id', async (c) => {
    await needAdmin(c);
    const id = c.req.param('id');
    if (!/^\d+$/.test(id)) throw new Bad('Нет такого расхода.', 404);
    const [e] = await sql<{monthly: boolean; day: Date}[]>`select monthly, day from expenses where id = ${id}`;
    if (!e) throw new Bad('Нет такого расхода.', 404);
    const yesterday = addDays(mskToday(), -1);
    if (e.monthly && e.day.toISOString().slice(0, 10) <= yesterday) await sql`update expenses set until = ${yesterday} where id = ${id}`;
    else await sql`delete from expenses where id = ${id}`;
    return c.json({ok: true});
  });
  app.patch('/admin/settings', async (c) => {
    await needAdmin(c);
    const b = await c.req.json<{acquiringPct?: number | null}>();
    if (b.acquiringPct === null) await sql`delete from kv where key = 'acquiring_pct'`;
    else {
      const v = Number(b.acquiringPct);
      if (!(v >= 0 && v <= 10)) throw new Bad('Ставка от 0 до 10%.', 400, 'acquiringPct');
      await sql`insert into kv (key, value) values ('acquiring_pct', ${String(v)}) on conflict (key) do update set value = excluded.value, updated_at = now()`;
    }
    return c.json({acquiringPct: await acquiringPct()});
  });

  /* ── склад и поставки ── */
  app.get('/admin/stock', async (c) => {
    await needAdmin(c);
    const stock = await sql`select id, name, unit, remainder::float as remainder, buy_price::float as "buyPrice",
      (greatest(remainder, 0) * buy_price)::float as value from sigma_stock order by name`;
    const waybills = await sql`select id, at, sum::float as sum, supplier,
      case when data->>'type' = 'WITHDRAW' then 'Списание' else 'Приход' end || case when status = 'SAVED' then '' else ', черновик' end as status
      from sigma_waybills order by at desc nulls last limit 100`;
    return c.json({stock, waybills, sync: syncState()});
  });

  /* ── меню ── */
  const menuView = async () => {
    const rows = await loadRows();
    const items = await sigmaItems();
    const used = new Set(rows.flatMap((r) => r.data.sigma ?? []));
    return {
      cats: CATS,
      items: rows.map((r) => {
        const {status} = resolve(r.data, items);
        return {id: r.id, sort: r.sort, card: r.data, status, links: (r.data.sigma ?? []).map((id) => items.get(id) ?? {id, name: 'Нет в кассе', price: 0, unit: '', weight: null, cost: null})};
      }),
      // Что есть в кассе, но не в приложении. Полуфабрикаты («пф») — ингредиенты, их не предлагаем.
      free: [...items.values()].filter((s) => !used.has(s.id) && !/ пф$/i.test(s.name)).sort((a, b) => a.name.localeCompare(b.name, 'ru')),
      sync: syncState(),
    };
  };
  app.get('/admin/menu', async (c) => {
    await needAdmin(c);
    return c.json(await menuView());
  });

  const catIds = new Set<string>(CATS.map((x) => x.id));
  app.patch('/admin/menu/:id', async (c) => {
    await needAdmin(c);
    const id = c.req.param('id');
    const [row] = await sql<{data: Card}[]>`select data from menu_items where id = ${id}`;
    if (!row) throw new Bad('Нет такой позиции.', 404);
    const b = await c.req.json<Record<string, unknown>>();
    const d = row.data;
    const text = (v: unknown, max: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
    if (b.name !== undefined) {
      const n = text(b.name, 60);
      if (n.length < 2) throw new Bad('Название — хотя бы два символа.', 400, 'name');
      d.name = n;
    }
    if (b.desc !== undefined) d.desc = text(b.desc, 200);
    if (b.weight !== undefined) d.weight = text(b.weight, 30) || undefined;
    if (b.cat !== undefined) {
      if (!catIds.has(String(b.cat))) throw new Bad('Выберите раздел меню.', 400, 'cat');
      d.cat = String(b.cat) as Card['cat'];
    }
    if (b.hidden !== undefined) {
      if (b.hidden === false && !d.photo) throw new Bad('Сначала загрузите фото: без него блюдо в приложении не показываем.', 400, 'photo');
      d.hidden = b.hidden === true;
    }
    if (b.hit !== undefined) d.hit = b.hit === true;
    // Цены — в кассу. Сначала пишем все, потом сохраняем карточку.
    if (Array.isArray(b.prices)) {
      const links = d.sigma ?? [];
      if (b.prices.length !== links.length) throw new Bad('Цен должно быть столько же, сколько позиций в кассе.');
      const items = await sigmaItems();
      try {
        for (const [i, p] of b.prices.entries()) {
          const price = Number(p);
          if (!Number.isInteger(price) || price < 0 || price > 100000) throw new Bad('Цена — целое число рублей.', 400, 'price');
          if (items.get(links[i])?.price !== price) await setPrice(links[i], price);
        }
      } catch (e) {
        if (e instanceof SigmaError) throw new Bad(`Цена не сохранилась в кассе: ${e.message}`, 502, 'price');
        throw e;
      }
    }
    await sql`update menu_items set data = ${sql.json(d as never)}, updated_at = now() where id = ${id}`;
    await rebuildMenu();
    return c.json(await menuView());
  });

  app.post('/admin/menu', async (c) => {
    await needAdmin(c);
    const b = await c.req.json<{sigma?: string; cat?: string}>();
    const items = await sigmaItems();
    const s = items.get(String(b.sigma ?? ''));
    if (!s) throw new Bad('Нет такой позиции в кассе. Обновите данные.', 404);
    if (!catIds.has(String(b.cat))) throw new Bad('Выберите раздел меню.', 400, 'cat');
    const rows = await loadRows();
    if (rows.some((r) => r.data.sigma?.includes(s.id))) throw new Bad('Эта позиция уже есть в приложении.', 409);
    const id = 'k-' + s.id.slice(0, 8);
    const card: Card = {id, cat: String(b.cat) as Card['cat'], name: s.name, desc: '', photo: '', price: s.price, sigma: [s.id], hidden: true};
    const sort = Math.max(0, ...rows.filter((r) => r.data.cat === card.cat).map((r) => r.sort)) + 1;
    await sql`insert into menu_items (id, sort, data) values (${id}, ${sort}, ${sql.json(card as never)})`;
    await rebuildMenu();
    return c.json({...(await menuView()), created: id});
  });

  // Фото блюда: браузер уже обрезал его до 4:5 и сжал в JPEG.
  app.post('/admin/menu/:id/photo', async (c) => {
    await needAdmin(c);
    const id = c.req.param('id');
    const [row] = await sql<{data: Card}[]>`select data from menu_items where id = ${id}`;
    if (!row) throw new Bad('Нет такой позиции.', 404);
    const buf = Buffer.from(await c.req.arrayBuffer());
    if (buf.length < 2000 || buf[0] !== 0xff || buf[1] !== 0xd8) throw new Bad('Нужна фотография в JPEG.', 400, 'photo');
    await mkdir(MEDIA, {recursive: true});
    const file = `${id.replace(/[^a-z0-9-]/gi, '')}-${Date.now().toString(36)}.jpg`;
    await writeFile(`${MEDIA}/${file}`, buf);
    row.data.photo = `/media/${file}`;
    await sql`update menu_items set data = ${sql.json(row.data as never)}, updated_at = now() where id = ${id}`;
    await rebuildMenu();
    return c.json(await menuView());
  });
}
