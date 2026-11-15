// Счёт заказа без React и браузера: им пользуются и приложение, и сервер.
// Сервер пересчитывает всё сам по своему меню, цены из браузера не принимает.

import {byId, cafe, LEVELS, type Item, type ModeId, type OptKey} from './business';

export type Choice = Partial<Record<OptKey, number>> & {shot?: boolean; warm?: boolean};
export type Line = {key: string; id: string; o: Choice; qty: number; price: number};
export type PastOrder = {no: number; at: number; total: number; items: string[]; lines: Omit<Line, 'key'>[]};
export type User = {
  name: string;
  phone: string;
  points: number;
  stamps: number;
  sub: number;
  orders: PastOrder[];
  code: string;
  bday: string;
  /** Сколько заказов всего; сервер отдаёт только последние в orders. */
  count?: number;
};
export type Order = {
  no: number;
  at: number;
  eta: number;
  steps: [string, string][];
  total: number;
  how: string;
  items: string[];
  extras: string;
  comment: string;
  demo: boolean;
};
export type Pay = 'sbp' | 'card' | 'cash';

/** То, от чего зависит счёт: корзина, способ получения, гость и отметки в корзине. */
export type Calc = {
  mode: ModeId;
  cart: Line[];
  user: User | null;
  table: string;
  plate: string;
  region: string;
  cutlery: number | null;
  napkins: boolean;
  carrier: boolean;
  sticks: boolean;
  comment: string;
  usePoints: boolean;
  useGift: boolean;
  useSub: boolean;
};

export const plural = (n: number, a: string, b: string, c: string) => {
  const m10 = n % 10, m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? b : c;
};

export const nowH = () => {
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60;
};

export function unitPrice(item: Item, o: Choice) {
  let p = item.price;
  if (item.opts?.size && o.size != null) p = item.opts.size[o.size][1];
  for (const k of ['milk', 'syrup', 'drink'] as const) if (item.opts?.[k] && o[k] != null) p += item.opts[k]![o[k]!][1];
  if (o.shot) p += 60;
  return p;
}

export const ordersOf = (u: User | null) => u?.count ?? u?.orders.length ?? 0;
export const level = (u: User | null) => {
  const n = ordersOf(u);
  return [...LEVELS].reverse().find((l) => n >= l.from)!;
};
export const giftReady = (u: User | null) => (u?.stamps ?? 0) >= 5;

const FOOD = ['breakfast', 'dessert', 'bakery'];
export const isDrink = (it: Item) => !!it.coffee || it.cat === 'other' || it.id === 'combo';
export const autoCutlery = (s: Calc) => Math.min(6, s.cart.filter((l) => FOOD.includes(byId(l.id).cat)).reduce((a, l) => a + l.qty, 0));
export const cutlery = (s: Calc) => s.cutlery ?? autoCutlery(s);
export const drinksInCart = (s: Calc) => s.cart.filter((l) => isDrink(byId(l.id))).reduce((a, l) => a + l.qty, 0);

export function extrasText(s: Calc) {
  const t: string[] = [], n = cutlery(s);
  if (n) t.push(`приборы на ${n} ${plural(n, 'персону', 'персоны', 'персон')}`);
  if (s.napkins) t.push('салфетки');
  if (s.mode !== 'hall' && s.carrier) t.push('подставка для стаканов');
  if (s.mode !== 'hall' && s.sticks) t.push('сахар и палочки');
  return t.join(', ');
}

/** h — час по времени кофейни: в браузере часы телефона, на сервере московское время. */
export function totals(s: Calc, h = nowH()) {
  const units = (pred: (it: Item) => boolean) => s.cart.flatMap((l) => (pred(byId(l.id)) ? Array<number>(l.qty).fill(l.price) : []));
  const sub = s.cart.reduce((a, l) => a + l.price * l.qty, 0);
  const disc: [string, number][] = [];
  const coffees = units((it) => !!it.coffee).sort((a, b) => a - b);
  if (s.useGift && giftReady(s.user) && coffees.length) disc.push(['Шестой кофе от нас', coffees[0]]);
  else if (s.useSub && (s.user?.sub ?? 0) > 0) {
    const ok = units((it) => ['cappuccino', 'latte'].includes(it.id)).sort((a, b) => b - a);
    if (ok.length) disc.push(['Чашка с абонемента', Math.min(ok[0], 270)]);
  }
  if (h >= 15 && h < 17) {
    const ds = units((it) => !!it.dessert).sort((a, b) => a - b);
    if (ds.length >= 2) disc.push(['Тихие часы: десерт −50%', Math.round(ds[0] / 2)]);
  }
  const discountable = s.cart.filter((l) => !byId(l.id).noDiscount).reduce((a, l) => a + l.price * l.qty, 0);
  const pre = disc.reduce((a, d) => a + d[1], 0);
  if (!ordersOf(s.user) && discountable > 0) disc.push(['Первый заказ −20%', Math.round(Math.max(0, discountable - pre) * 0.2)]);
  const after = Math.max(0, sub - disc.reduce((a, d) => a + d[1], 0));
  const fee = s.mode === 'delivery' && sub > 0 ? (after >= cafe.deliveryFreeFrom ? 0 : cafe.deliveryFee) : 0;
  const maxPts = Math.floor(after * 0.3);
  const pts = s.usePoints && s.user ? Math.min(s.user.points, maxPts) : 0;
  const total = after + fee - pts;
  const subs = s.cart.filter((l) => byId(l.id).noDiscount).reduce((a, l) => a + l.price * l.qty, 0);
  const earn = Math.max(0, Math.floor(((total - subs) * level(s.user).cash) / 100));
  return {sub, disc, fee, pts, maxPts, total, earn, after};
}
export type Totals = ReturnType<typeof totals>;

/** Заказ из корзины: что увидит гость и как поменяются баллы, чашки и абонемент. */
export function buildOrder(s: Calc, t: Totals, how: string, no: number, at: number) {
  const u = s.user!;
  const coffeeCount = s.cart.filter((l) => byId(l.id).coffee || l.id === 'combo').reduce((a, l) => a + l.qty, 0);
  const subBought = s.cart.filter((l) => l.id === 'sub20').reduce((a, l) => a + l.qty, 0);
  const giftUsed = t.disc.some((d) => d[0].startsWith('Шестой'));
  const subUsed = t.disc.some((d) => d[0].startsWith('Чашка'));
  let st = u.stamps;
  if (giftUsed) st = Math.max(0, st - 5) + Math.max(0, coffeeCount - 1);
  else st += coffeeCount - (subUsed ? 1 : 0);
  const steps = ({
    hall: [['Заказ принят', 'Бариста уже видит его'], ['Готовим', 'Кофе, потом десерты'], [`Несём к столику №${s.table}`, 'Минута-другая']],
    togo: [['Заказ принят', 'Бариста уже видит его'], ['Готовим', 'Обычно 5–7 минут'], ['Готово, ждёт на стойке', 'Назовите номер заказа']],
    car: [['Заказ принят', 'Бариста уже видит его'], ['Готовим', 'Обычно 5–7 минут'], [`Выносим к машине ${s.plate} ${s.region}`, 'Смотрите в сторону входа']],
    delivery: [['Заказ принят', 'Бариста уже видит его'], ['Готовим', 'Кофе наливаем последним'], ['Курьер в пути', 'Обычно 20–30 минут'], ['Доставлено', 'Приятного аппетита']],
  } as Record<ModeId, [string, string][]>)[s.mode];
  const items = s.cart.map((l) => `${byId(l.id).name}${l.qty > 1 ? ' ×' + l.qty : ''}`);
  const order: Order = {
    no, at, eta: at + (s.mode === 'delivery' ? 40 : 7) * 60e3, steps, total: t.total, how, items,
    extras: extrasText(s), comment: s.comment.trim(), demo: cafe.testMode,
  };
  const past: PastOrder = {no, at, total: t.total, items, lines: s.cart.map(({id, o, qty, price}) => ({id, o, qty, price}))};
  return {
    order,
    past,
    points: u.points - t.pts + t.earn,
    stamps: Math.min(5, st),
    sub: u.sub - (subUsed ? 1 : 0) + subBought * 20,
    /** Списывается сразу при заказе: баллы, пять чашек за подарок, чашка абонемента. */
    spend: {points: t.pts, stamps: giftUsed ? 5 : 0, sub: subUsed ? 1 : 0},
    /** Начисляется только после оплаты: кешбэк, новые чашки, купленный абонемент. */
    credit: {points: t.earn, stamps: giftUsed ? Math.max(0, coffeeCount - 1) : coffeeCount - (subUsed ? 1 : 0), sub: subBought * 20},
  };
}
