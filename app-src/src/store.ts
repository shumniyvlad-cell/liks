// Корзина и настройки — в браузере. Гость, баллы и заказы на сервере живут в Postgres
// (сборка VITE_BACKEND=server), в демо без сервера — тоже в браузере.

import {useSyncExternalStore} from 'react';
import {byId, cafe, inMenu, type Item, type ModeId, type OptKey} from './business';
import {api, online} from './api';
import * as P from './pricing';
import type {Choice, Line, Order, Pay, User} from './pricing';

export type {Choice, Line, Order, Pay, PastOrder, User} from './pricing';
export type Mode = 'system' | 'light' | 'dark';

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

/** Позиция есть в нынешнем меню и выбранные варианты у неё существуют. */
export function validLine(id: string, o: Choice) {
  if (!inMenu(id)) return false;
  const it = byId(id);
  return Object.entries(o).every(([k, v]) => k === 'shot' || k === 'warm' || (typeof v === 'number' && !!it.opts?.[k as OptKey]?.[v]));
}

function load(): State {
  try {
    const s = {...fresh, ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<State>)};
    // Меню обновилось: снятые позиции из сохранённой корзины убираем, цены берём нынешние.
    s.cart = s.cart.filter((l) => validLine(l.id, l.o)).map((l) => ({...l, price: P.unitPrice(byId(l.id), l.o)}));
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
export const plural = P.plural;
/** Неразрывный пробел после коротких слов, чтобы предлоги не висели в конце строки. */
export const T = (s: string) =>
  s
    .replace(/(^|[\s(«])([а-яёА-ЯЁ]{1,2}|без|для|под|над|при|про|что|как|или|это)\s+/g, '$1$2\u00a0')
    .replace(/(^|[\s(«])([а-яёА-ЯЁ]{1,2})\s+/g, '$1$2\u00a0')
    .replace(/(\d)\s(\d{3})/g, '$1\u00a0$2')
    .replace(/\s₽/g, '\u00a0₽')
    .replace(/\s—/g, '\u00a0—');

export const nowH = P.nowH;
export const isOpen = () => nowH() >= cafe.open && nowH() < cafe.close;
export const vibrate = (p: number | number[]) => {
  try {
    navigator.vibrate?.(p);
  } catch {
    /* нет вибро */
  }
};

export const unitPrice = P.unitPrice;
export const photoOf = (item: ReturnType<typeof byId>, o: Choice = {}) => (item.opts?.dish ? item.opts.dish[o.dish ?? 0][2]! : item.photo);
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

export const level = (u: User | null = state.user) => P.level(u);
export const giftReady = (u: User | null = state.user) => P.giftReady(u);
export const isDrink = P.isDrink;
export const autoCutlery = (s: State = state) => P.autoCutlery(s);
export const cutlery = (s: State = state) => P.cutlery(s);
export const drinksInCart = (s: State = state) => P.drinksInCart(s);
export const extrasText = (s: State = state) => P.extrasText(s);
export const totals = (s: State = state) => P.totals(s);

/** Что сервер берёт из корзины: без цен, их он считает сам. */
const orderBody = (s: State, how: string) => ({
  how, pay: s.pay, mode: s.mode, when: s.when,
  cart: s.cart.map(({id, o, qty}) => ({id, o, qty})),
  table: s.table, plate: s.plate, region: s.region, address: s.address, flat: s.flat,
  cutlery: s.cutlery, napkins: s.napkins, carrier: s.carrier, sticks: s.sticks, comment: s.comment,
  usePoints: s.usePoints, useGift: s.useGift, useSub: s.useSub,
});
const afterOrder: Partial<State> = {cart: [], useGift: false, useSub: false, usePoints: false, cutlery: null, comment: ''};

export async function placeOrder(how: string): Promise<Order> {
  const s = state;
  if (online) {
    const r = await api<{order: Order; user: User}>('/orders', orderBody(s, how));
    set({user: r.user, order: r.order, ...afterOrder});
    vibrate([12, 60, 20]);
    return r.order;
  }
  const t = P.totals(s);
  const b = P.buildOrder(s, t, how, 100 + Math.floor(Math.random() * 900), Date.now());
  const u = s.user!;
  set({user: {...u, points: b.points, stamps: b.stamps, sub: b.sub, orders: [b.past, ...u.orders]}, order: b.order, ...afterOrder});
  vibrate([12, 60, 20]);
  return b.order;
}

/** В тестовом режиме этапы идут быстро, чтобы был виден весь путь. */
export function stage(o: Order) {
  const per = o.demo ? 9e3 : (o.eta - o.at) / o.steps.length;
  return Math.min(o.steps.length - 1, Math.floor((Date.now() - o.at) / per));
}

/** Код в СМС. Без сервера ничего не отправляем: в демо подходит любой код. */
export async function requestCode(phone: string) {
  if (online) await api('/auth/code', {phone});
}

export async function signIn(phone: string, name: string, code: string) {
  if (online) {
    const r = await api<{user: User}>('/auth/verify', {phone, name, code, consent: true}); // согласие отмечено на шаге номера
    set({user: r.user});
    return;
  }
  const prev = state.user;
  set({user: prev ?? {phone, name, points: 0, stamps: 0, sub: 0, orders: [], code: 'LX' + Math.random().toString(36).slice(2, 8).toUpperCase(), bday: ''}});
}

export async function saveBday(bday: string) {
  if (online) {
    const r = await api<{user: User}>('/me', {bday}, 'PATCH');
    set({user: r.user});
    return;
  }
  set({user: {...state.user!, bday}});
}

/** Выход ждёт несколько секунд: пока висит тост с «Вернуть», сессию на сервере не трогаем. */
let pendingOut: ReturnType<typeof setTimeout> | null = null;
export function signOut() {
  const prev = {user: state.user, order: state.order};
  set({user: null, order: null});
  if (online) pendingOut = setTimeout(() => void api('/auth/logout', {}).catch(() => {}), 6000);
  return () => {
    if (pendingOut) clearTimeout(pendingOut);
    pendingOut = null;
    set(prev);
  };
}

/** При запуске берём свежие баллы и чашки с сервера: их могли начислить на кассе. */
export async function refreshMe() {
  if (!online) return;
  try {
    const r = await api<{user: User | null}>('/me');
    set({user: r.user});
  } catch {
    /* нет связи — показываем то, что помним */
  }
}
