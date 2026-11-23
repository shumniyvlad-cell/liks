// Меню приложения = карточки из menu_items (фото, описание, раздел, граммовка) + цены из кассы SIGMA.
// Касса главная: нет позиции в кассе — нет и в приложении, цена 0 — «Цена скоро».
// Первый запуск заполняет menu_items из src/business.ts и связывает с кассой по названиям.

import {MENU, type Item} from '../src/business';
import {sql} from './db';

/** Карточка в базе: блюдо приложения, его позиции в кассе (для размеров — по одной на размер), скрыто ли. */
export type Card = Item & {sigma?: string[]; sigmaNames?: string[]; hidden?: boolean};

// Копия меню из кода до того, как сервер подменит его ценами кассы.
const SEED: Item[] = structuredClone(MENU);

// Названия позиций в кассе (как на 23.11.2026). Чаи, которых в кассе нет, остаются в базе скрытыми.
const NAMES: Record<string, string[]> = {
  cappuccino: ['Капучино S', 'Капучино M'],
  latte: ['Латте'],
  raf: ['Раф'],
  flatwhite: ['Флет уайт'],
  americano: ['Американо'],
  espresso: ['Эспрессо'],
  cocoa: ['Какао'],
  'tea-cranberry': ['Чай клюква-можжевельник'],
  'tea-peach': ['Чай персик-груша'],
  'syrniki-apple': ['Сырники со сметаной и яблоками в карамели'],
  'syrniki-salty': ['Сырники с зеленью и тар-таром из помидоров'],
  'oat-granola': ['Овсяная каша на топленом молоке с яблоками в карамели и гранолой'],
  'oat-banana': ['Овсяная каша на банановом молоке с яблоками в карамели и бананом'],
  rice: ['Сытная рисовая каша с беконом, пармезаном и яйцом пашот'],
  'waffle-apple': ['Вафля с яблоками и крем-сыром'],
  'waffle-salmon': ['Вафля Сырный бенедикт с лососем'],
  'waffle-prosciutto': ['Вафля Сырный бенедикт с прошутто'],
  croque: ['Крок мадам с ветчиной'],
  'sandwich-salmon': ['Сэндвич с лососем и шпинатом'],
  'sandwich-ham': ['Сендвич с ветчиной и сыром'],
  shawarma: ['Ролл с курицей'],
  'sandwich-tuna': ['Сэндвич с тунцом, томатом и рукколой'],
  'salad-tuna': ['Салат с тунцом'],
  'salad-green': ['Зеленый салат с фетой'],
  'soup-chicken': ['Куриный бульон с лапшой'],
  'soup-pumpkin': ['Тыквенный крем-суп'],
  'soup-mushroom': ['Грибной крем-суп'],
};

const TEA_SWEET: Item['opts'] = {sugar: [['Без сахара', 0], ['Сахар отдельно', 0], ['Мёд отдельно', 0]]};
// Чаи из кассы. Фото — свои кадры чайника: ягодный под клюкву, облепиховый под персик и грушу.
const EXTRA: Item[] = [
  {id: 'tea-cranberry', cat: 'other', name: 'Чай клюква-можжевельник', desc: 'Клюква и можжевельник. Чайник.', photo: 'tea-berry', price: 300, opts: TEA_SWEET},
  {id: 'tea-peach', cat: 'other', name: 'Чай персик-груша', desc: 'Персик и груша. Чайник.', photo: 'tea-buckthorn', price: 300, opts: TEA_SWEET},
];
const RENAME: Record<string, Partial<Item>> = {
  shawarma: {name: 'Ролл с курицей', desc: 'Курица, капуста, морковь, огурец и соус в томатной лепёшке.', soon: false},
};

export async function seedMenu() {
  const [{n}] = await sql<{n: number}[]>`select count(*)::int as n from menu_items`;
  if (n) return;
  const list: Item[] = [];
  for (const m of SEED) {
    list.push({...m, ...RENAME[m.id]});
    if (m.id === 'cocoa') list.push(...EXTRA);
  }
  for (const [i, m] of list.entries()) {
    const card: Card = {...m, sigmaNames: NAMES[m.id]};
    if (!NAMES[m.id]) card.hidden = true;
    await sql`insert into menu_items (id, sort, data) values (${m.id}, ${i * 10}, ${sql.json(card as never)}) on conflict do nothing`;
  }
}

export type SigmaItem = {id: string; name: string; price: number; unit: string; weight: number | null; cost: number | null};
export type Row = {id: string; sort: number; data: Card};

export async function loadRows() {
  return sql<Row[]>`select id, sort, data from menu_items order by sort, id`;
}
export async function sigmaItems() {
  const rows = await sql<{id: string; name: string; price: string; unit: string; weight: string | null; cost: string | null}[]>`
    select id, name, price, unit, weight, cost from sigma_items`;
  return new Map(rows.map((r) => [r.id, {id: r.id, name: r.name, price: Number(r.price), unit: r.unit,
    weight: r.weight == null ? null : Number(r.weight), cost: r.cost == null ? null : Number(r.cost)} satisfies SigmaItem]));
}

/** Связать карточки, у которых пока только названия из кассы, с id позиций. */
async function link(rows: Row[], items: Map<string, SigmaItem>) {
  const byName = new Map([...items.values()].map((s) => [s.name.toLowerCase(), s.id]));
  for (const r of rows) {
    const names = r.data.sigmaNames;
    if (r.data.sigma?.length || !names?.length) continue;
    const ids = names.map((nm) => byName.get(nm.replace(/\s+/g, ' ').trim().toLowerCase()));
    if (ids.some((x) => !x)) continue;
    r.data.sigma = ids as string[];
    await sql`update menu_items set data = ${sql.json(r.data as never)}, updated_at = now() where id = ${r.id}`;
  }
}

export type Status = 'live' | 'soon' | 'hidden' | 'nophoto' | 'unlinked' | 'gone';

/** Карточка → блюдо для приложения с ценой кассы, или почему его не показываем. */
export function resolve(card: Card, items: Map<string, SigmaItem>): {item: Item | null; status: Status} {
  const links = card.sigma ?? [];
  if (!links.length) return {item: null, status: 'unlinked'};
  const found = links.map((id) => items.get(id));
  if (found.some((x) => !x)) return {item: null, status: 'gone'};
  if (card.hidden) return {item: null, status: 'hidden'};
  if (!card.photo) return {item: null, status: 'nophoto'};
  const prices = found.map((s) => s!.price);
  const {sigma: _s, sigmaNames: _n, hidden: _h, ...base} = card;
  const item: Item = structuredClone(base);
  item.price = prices[0];
  if (item.opts?.size && links.length === item.opts.size.length) {
    item.opts.size = item.opts.size.map(([name, , photo], i) => (photo ? [name, prices[i], photo] : [name, prices[i]]));
    item.price = Math.min(...prices);
  }
  item.soon = prices.some((p) => !(p > 0));
  if (item.soon) item.price = 0;
  return {item, status: item.soon ? 'soon' : 'live'};
}

let live: Item[] = [];
export const liveMenu = () => live;

/** Пересобрать меню из базы и кассы и подменить им MENU, по которому сервер считает заказы. */
export async function rebuildMenu() {
  const rows = await loadRows();
  const items = await sigmaItems();
  if (!items.size) return; // касса ещё не выгружалась — остаёмся на меню из кода
  await link(rows, items);
  live = rows.map((r) => resolve(r.data, items).item).filter((x): x is Item => !!x);
  MENU.splice(0, MENU.length, ...live);
}
