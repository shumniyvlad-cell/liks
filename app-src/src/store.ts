// Гость, корзина и заказ в браузере. В бою — таблицы в Supabase, интерфейс не меняется.

import {useSyncExternalStore} from 'react';
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
export type Mode = 'system' | 'light' | 'dark';
export type Pay = 'sbp' | 'card' | 'cash';

type State = {
  mode: ModeId;
  cart: Line[];
  user: User | null;
  table: string;
  plate: string;
  region: string;
  address: string;
  flat: string;
  when: string;
  pay: Pay;
  cutlery: number | null;
  napkins: boolean;
  carrier: boolean;
  sticks: boolean;
  comment: string;
  usePoints: boolean;
  useGift: boolean;
  useSub: boolean;
  theme: Mode;
  order: Order | null;
};

const KEY = 'liks:v2';
const fresh: State = {
  mode: 'togo', cart: [], user: null, table: '', plate: '', region: '35', address: '', flat: '', when: 'asap', pay: 'sbp',
  cutlery: null, napkins: true, carrier: false, sticks: false, comment: '', usePoints: false, useGift: false, useSub: false,
  theme: 'system', order: null,
};

function load(): State {
  try {
    const s = {...fresh, ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<State>)};
    const t = new URLSearchParams(location.search).get('table');
    if (t) Object.assign(s, {mode: 'hall', table: t.slice(0, 3)});
    return s;
  } catch {
    return fresh;
  }
}
let state = load();
const subs = new Set<() => void>();

export function set(next: Partial<State>) {
  state = {...state, ...next};
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* приватный режим */
  }
  subs.forEach((f) => f());
}
export const get = () => state;

export function useStore() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => state,
  );
}

/* ── счёт ── */
export const rub = (n: number) => `${Math.round(n).toLocaleString('ru-RU')} ₽`;
export const plural = (n: number, a: string, b: string, c: string) => {
  const m10 = n % 10, m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? b : c;
};
/** Неразрывный пробел после коротких слов, чтобы предлоги не висели в конце строки. */
export const T = (s: string) =>
  s
    .replace(/(^|[\s(«])([а-яёА-ЯЁ]{1,2}|без|для|под|над|при|про|что|как|или|это)\s+/g, '$1$2 ')
    .replace(/(^|[\s(«])([а-яёА-ЯЁ]{1,2})\s+/g, '$1$2 ')
    .replace(/(\d)\s(\d{3})/g, '$1 $2')
    .replace(/\s₽/g, ' ₽')
    .replace(/\s—/g, ' —');

export const nowH = () => {
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60;
};
export const isOpen = () => nowH() >= cafe.open && nowH() < cafe.close;
export const vibrate = (p: number | number[]) => {
  try {
    navigator.vibrate?.(p);
  } catch {
    /* нет вибро */
  }
};

export function unitPrice(item: Item, o: Choice) {
  let p = item.price;
  if (item.opts?.size && o.size != null) p = item.opts.size[o.size][1];
  for (const k of ['milk', 'syrup', 'drink'] as const) if (item.opts?.[k] && o[k] != null) p += item.opts[k]![o[k]!][1];
  if (o.shot) p += 60;
  return p;
}
export const photoOf = (item: Item, o: Choice = {}) => (item.opts?.dish ? item.opts.dish[o.dish ?? 0][2]! : item.photo);

export function optText(item: Item, o: Choice) {
  const t: string[] = [];
  const name = (k: OptKey) => item.opts![k]![o[k] ?? 0][0];
  if (item.opts?.size) t.push(name('size'));
  if (item.opts?.dish) t.push(name('dish'));
  if (item.opts?.drink) t.push(name('drink'));
  if (item.opts?.milk && o.milk) {
    const m = name('milk');
    t.push(m.toLowerCase() + (/^(С|Без)/.test(m) ? '' : ' молоко'));
  }
  if (item.opts?.syrup && o.syrup) t.push(name('syrup').toLowerCase());
  if (item.opts?.sugar && o.sugar) t.push(name('sugar').toLowerCase() + (o.sugar === 1 || o.sugar === 2 ? ' сахара' : ''));
  if (item.opts?.temp && o.temp) t.push(name('temp').toLowerCase());
  if (o.shot) t.push('доп. эспрессо');
  if (o.warm) t.push('подогреть');
  return t.join(', ');
}

export const lineKey = (id: string, o: Choice) => id + '|' + JSON.stringify(o);
export function addToCart(id: string, o: Choice, qty = 1) {
  const item = byId(id), key = lineKey(id, o);
  const has = state.cart.find((l) => l.key === key);
  set({
    cart: has
      ? state.cart.map((l) => (l === has ? {...l, qty: l.qty + qty} : l))
      : [...state.cart, {key, id, o, qty, price: unitPrice(item, o)}],
  });
  vibrate(8);
}
export function changeQty(key: string, d: number) {
  set({cart: state.cart.map((l) => (l.key === key ? {...l, qty: l.qty + d} : l)).filter((l) => l.qty > 0)});
}
export const cartCount = (s = state) => s.cart.reduce((a, l) => a + l.qty, 0);
export const cartQty = (id: string, s = state) => s.cart.filter((l) => l.id === id).reduce((a, l) => a + l.qty, 0);

export const level = (u: User | null = state.user) => {
  const n = u?.orders.length ?? 0;
  return [...LEVELS].reverse().find((l) => n >= l.from)!;
};
export const giftReady = (u: User | null = state.user) => (u?.stamps ?? 0) >= 5;

const FOOD = ['breakfast', 'dessert', 'bakery'];
export const isDrink = (it: Item) => !!it.coffee || it.cat === 'other' || it.id === 'combo';
export const autoCutlery = (s = state) => Math.min(6, s.cart.filter((l) => FOOD.includes(byId(l.id).cat)).reduce((a, l) => a + l.qty, 0));
export const cutlery = (s = state) => s.cutlery ?? autoCutlery(s);
export const drinksInCart = (s = state) => s.cart.filter((l) => isDrink(byId(l.id))).reduce((a, l) => a + l.qty, 0);

export function extrasText(s = state) {
  const t: string[] = [], n = cutlery(s);
  if (n) t.push(`приборы на ${n} ${plural(n, 'персону', 'персоны', 'персон')}`);
  if (s.napkins) t.push('салфетки');
  if (s.mode !== 'hall' && s.carrier) t.push('подставка для стаканов');
  if (s.mode !== 'hall' && s.sticks) t.push('сахар и палочки');
  return t.join(', ');
}

export function totals(s = state) {
  const units = (pred: (it: Item) => boolean) => s.cart.flatMap((l) => (pred(byId(l.id)) ? Array<number>(l.qty).fill(l.price) : []));
  const sub = s.cart.reduce((a, l) => a + l.price * l.qty, 0);
  const disc: [string, number][] = [];
  const coffees = units((it) => !!it.coffee).sort((a, b) => a - b);
  if (s.useGift && giftReady(s.user) && coffees.length) disc.push(['Шестой кофе от нас', coffees[0]]);
  else if (s.useSub && (s.user?.sub ?? 0) > 0) {
    const ok = units((it) => ['cappuccino', 'latte'].includes(it.id)).sort((a, b) => b - a);
    if (ok.length) disc.push(['Чашка с абонемента', Math.min(ok[0], 270)]);
  }
  const h = nowH();
  if (h >= 15 && h < 17) {
    const ds = units((it) => !!it.dessert).sort((a, b) => a - b);
    if (ds.length >= 2) disc.push(['Тихие часы: десерт −50%', Math.round(ds[0] / 2)]);
  }
  const discountable = s.cart.filter((l) => !byId(l.id).noDiscount).reduce((a, l) => a + l.price * l.qty, 0);
  const pre = disc.reduce((a, d) => a + d[1], 0);
  if (!s.user?.orders.length && discountable > 0) disc.push(['Первый заказ −20%', Math.round(Math.max(0, discountable - pre) * 0.2)]);
  const after = Math.max(0, sub - disc.reduce((a, d) => a + d[1], 0));
  const fee = s.mode === 'delivery' && sub > 0 ? (after >= cafe.deliveryFreeFrom ? 0 : cafe.deliveryFee) : 0;
  const maxPts = Math.floor(after * 0.3);
  const pts = s.usePoints && s.user ? Math.min(s.user.points, maxPts) : 0;
  const total = after + fee - pts;
  const subs = s.cart.filter((l) => byId(l.id).noDiscount).reduce((a, l) => a + l.price * l.qty, 0);
  const earn = Math.max(0, Math.floor(((total - subs) * level(s.user).cash) / 100));
  return {sub, disc, fee, pts, maxPts, total, earn, after};
}

export function placeOrder(how: string) {
  const s = state, u = s.user!;
  const t = totals(s);
  const coffeeCount = s.cart.filter((l) => byId(l.id).coffee || l.id === 'combo').reduce((a, l) => a + l.qty, 0);
  const subBought = s.cart.filter((l) => l.id === 'sub20').reduce((a, l) => a + l.qty, 0);
  const giftUsed = t.disc.some((d) => d[0].startsWith('Шестой'));
  const subUsed = t.disc.some((d) => d[0].startsWith('Чашка'));
  let st = u.stamps;
  if (giftUsed) st = Math.max(0, st - 5) + Math.max(0, coffeeCount - 1);
  else st += coffeeCount - (subUsed ? 1 : 0);
  const steps: [string, string][] = {
    hall: [['Заказ принят', 'Бариста уже видит его'], ['Готовим', 'Кофе, потом десерты'], [`Несём к столику №${s.table}`, 'Минута-другая']],
    togo: [['Заказ принят', 'Бариста уже видит его'], ['Готовим', 'Обычно 5–7 минут'], ['Готово, ждёт на стойке', 'Назовите номер заказа']],
    car: [['Заказ принят', 'Бариста уже видит его'], ['Готовим', 'Обычно 5–7 минут'], [`Выносим к машине ${s.plate} ${s.region}`, 'Смотрите в сторону входа']],
    delivery: [['Заказ принят', 'Бариста уже видит его'], ['Готовим', 'Кофе наливаем последним'], ['Курьер в пути', 'Обычно 20–30 минут'], ['Доставлено', 'Приятного аппетита']],
  }[s.mode] as [string, string][];
  const items = s.cart.map((l) => `${byId(l.id).name}${l.qty > 1 ? ' ×' + l.qty : ''}`);
  const no = 100 + Math.floor(Math.random() * 900), at = Date.now();
  const order: Order = {
    no, at, eta: at + (s.mode === 'delivery' ? 40 : 7) * 60e3, steps, total: t.total, how, items,
    extras: extrasText(s), comment: s.comment.trim(), demo: cafe.testMode,
  };
  set({
    user: {
      ...u,
      points: u.points - t.pts + t.earn,
      stamps: Math.min(5, st),
      sub: u.sub - (subUsed ? 1 : 0) + subBought * 20,
      orders: [{no, at, total: t.total, items, lines: s.cart.map(({id, o, qty, price}) => ({id, o, qty, price}))}, ...u.orders],
    },
    order, cart: [], useGift: false, useSub: false, usePoints: false, cutlery: null, comment: '',
  });
  vibrate([12, 60, 20]);
  return order;
}

/** В тестовом режиме этапы идут быстро, чтобы был виден весь путь. */
export function stage(o: Order) {
  const per = o.demo ? 9e3 : (o.eta - o.at) / o.steps.length;
  return Math.min(o.steps.length - 1, Math.floor((Date.now() - o.at) / per));
}

export function signIn(phone: string, name: string) {
  const prev = state.user;
  set({user: prev ?? {phone, name, points: 0, stamps: 0, sub: 0, orders: [], code: 'LX' + Math.random().toString(36).slice(2, 8).toUpperCase(), bday: ''}});
}
