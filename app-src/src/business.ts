import type {ArtName} from './ui/brand';
// Всё про кофейню живёт здесь: адрес, часы, меню, акции.
// Цвет акцента — в теме: npx astryx experimental theme editor set liks accent "#hex".

export const img = (k: string) => `${import.meta.env.BASE_URL}img/${k}.jpg`;

export const cafe = {
  name: 'Ликс',
  city: 'Вологда',
  address: '', // улица и дом, например «ул. Ленинградская, 71»
  phone: '', // +7…
  open: 8,
  close: 20,
  deliveryFreeFrom: 800,
  deliveryFee: 149,
  deliveryRadius: '2 км',
  /** Оплата без списания денег, любой код из СМС. */
  testMode: true,
};

export type Opt = [name: string, price: number, photo?: string];
export type OptKey = 'size' | 'dish' | 'drink' | 'milk' | 'syrup' | 'sugar' | 'temp';
export type Item = {
  id: string;
  cat: 'coffee' | 'other' | 'breakfast' | 'sandwich' | 'salad' | 'soup' | 'sub';
  name: string;
  desc: string;
  photo: string;
  price: number;
  old?: number;
  tag?: string;
  coffee?: boolean;
  dessert?: boolean;
  hit?: boolean;
  morning?: boolean;
  noDiscount?: boolean;
  opts?: Partial<Record<OptKey, Opt[]>> & {shot?: boolean; warm?: boolean};
};

// Цены — из меню кофейни (лист от 16.11.2026): сироп +20 ₽, альтернативное молоко +30 ₽.
const MILK: Opt[] = [['Обычное', 0], ['Овсяное', 30], ['Кокосовое', 30], ['Миндальное', 30], ['Безлактозное', 30]];
const SYRUP: Opt[] = [['Без сиропа', 0], ['Карамель', 20], ['Ваниль', 20], ['Солёная карамель', 20], ['Лесной орех', 20]];
const SUGAR: Opt[] = [['Без сахара', 0], ['1 ложка', 0], ['2 ложки', 0], ['Сахар отдельно', 0]];
const TEMP: Opt[] = [['Обычная', 0], ['Погорячее', 0], ['Потеплее, для ребёнка', 0]];
const milky = {milk: MILK, syrup: SYRUP, sugar: SUGAR, temp: TEMP};
const TEA_SWEET: Opt[] = [['Без сахара', 0], ['Сахар отдельно', 0], ['Мёд отдельно', 0]];

export const CATS = [
  {id: 'coffee', name: 'Кофе'},
  {id: 'other', name: 'Какао и чай'},
  {id: 'breakfast', name: 'Завтраки'},
  {id: 'sandwich', name: 'Сэндвичи'},
  {id: 'salad', name: 'Салаты'},
  {id: 'soup', name: 'Супы'},
] as const;

// Фото: свои снимки кофейни (тот же стол и посуда), напитки, чаи, вафли и сэндвич с лососем
// дорисованы по ним в Nano Banana Pro — кружка, чайник и тарелки те же, что в зале.
export const MENU: Item[] = [
  {id: 'cappuccino', cat: 'coffee', name: 'Капучино', desc: 'Эспрессо и плотная молочная пена.', photo: 'cappuccino', price: 260, coffee: true, hit: true,
    opts: {size: [['S, 200 мл', 260], ['M, 300 мл', 300]], ...milky}},
  {id: 'latte', cat: 'coffee', name: 'Латте', desc: '300 мл. Мягкий и молочный, хорошо дружит с сиропом.', photo: 'latte', price: 300, coffee: true, opts: milky},
  {id: 'raf', cat: 'coffee', name: 'Раф', desc: '300 мл. Эспрессо со сливками, взбитые в бархатную пену.', photo: 'raf', price: 320, coffee: true,
    opts: {syrup: SYRUP, sugar: SUGAR, temp: TEMP}},
  {id: 'flatwhite', cat: 'coffee', name: 'Флэт уайт', desc: '200 мл. Больше кофе, меньше молока.', photo: 'flatwhite', price: 290, coffee: true, opts: milky},
  {id: 'americano', cat: 'coffee', name: 'Американо', desc: '200 мл. Эспрессо и горячая вода.', photo: 'americano', price: 220, coffee: true,
    opts: {syrup: SYRUP, sugar: SUGAR}},
  {id: 'espresso', cat: 'coffee', name: 'Эспрессо', desc: '32 мл. Крепкий, с плотной пенкой.', photo: 'espresso', price: 200, coffee: true, opts: {sugar: SUGAR}},

  {id: 'cocoa', cat: 'other', name: 'Какао', desc: '300 мл. Густое, на настоящем какао.', photo: 'cocoa', price: 350, hit: true,
    opts: {milk: MILK, syrup: SYRUP, temp: TEMP}},
  {id: 'tea-buckthorn', cat: 'other', name: 'Облепиховый чай', desc: 'Облепиха, апельсин и мята. Чайник.', photo: 'tea-buckthorn', price: 320, opts: {sugar: TEA_SWEET}},
  {id: 'tea-berry', cat: 'other', name: 'Ягодный чай', desc: 'Брусника, малина и лимон. Чайник.', photo: 'tea-berry', price: 320, opts: {sugar: TEA_SWEET}},
  {id: 'tea-black', cat: 'other', name: 'Чёрный чай', desc: 'Классический листовой. Чайник.', photo: 'tea-black', price: 250, opts: {sugar: TEA_SWEET}},
  {id: 'tea-green', cat: 'other', name: 'Зелёный чай', desc: 'Мягкий листовой. Чайник.', photo: 'tea-green', price: 250, opts: {sugar: TEA_SWEET}},

  {id: 'syrniki-apple', cat: 'breakfast', name: 'Сырники с яблоками в карамели', desc: 'Со сметаной и тёплыми яблоками в карамели.', photo: 'syrniki-apple', price: 390, hit: true},
  {id: 'syrniki-salty', cat: 'breakfast', name: 'Солёные сырники', desc: 'С зеленью и тар-таром из помидоров.', photo: 'syrniki-salty', price: 390},
  {id: 'oat-granola', cat: 'breakfast', name: 'Овсяная каша с гранолой', desc: 'На топлёном молоке, с яблоками в карамели и гранолой.', photo: 'oat-granola', price: 330},
  {id: 'oat-banana', cat: 'breakfast', name: 'Овсяная каша с бананом', desc: 'На банановом молоке, с яблоками в карамели и бананом.', photo: 'oat-banana', price: 330},
  {id: 'rice', cat: 'breakfast', name: 'Рисовая каша с беконом', desc: 'Сытная: бекон, пармезан и яйцо пашот.', photo: 'rice', price: 390},
  {id: 'waffle-apple', cat: 'breakfast', name: 'Вафля с яблоками и крем-сыром', desc: 'Тёплая вафля, яблоки в карамели и крем-сыр.', photo: 'waffle-apple', price: 360},
  {id: 'waffle-salmon', cat: 'breakfast', name: 'Вафля «Сырный бенедикт» с лососем', desc: 'Сырная вафля, лосось, яйцо пашот и соус голландез.', photo: 'waffle-salmon', price: 590},
  {id: 'waffle-prosciutto', cat: 'breakfast', name: 'Вафля «Сырный бенедикт» с прошутто', desc: 'Сырная вафля, прошутто, яйцо пашот и соус голландез.', photo: 'waffle-prosciutto', price: 590},

  {id: 'croque', cat: 'sandwich', name: 'Крок мадам с ветчиной', desc: 'Горячий тост с ветчиной и сыром, сверху яичница.', photo: 'croque', price: 550, hit: true},
  {id: 'sandwich-salmon', cat: 'sandwich', name: 'Сэндвич с лососем и шпинатом', desc: 'Слабосолёный лосось, шпинат и крем-сыр.', photo: 'sandwich-salmon', price: 480},
  {id: 'sandwich-ham', cat: 'sandwich', name: 'Сэндвич с ветчиной и сыром', desc: 'Ветчина, сыр и свежий салат на поджаренном хлебе.', photo: 'sandwich-ham', price: 480},
  {id: 'sandwich-tuna', cat: 'sandwich', name: 'Сэндвич с тунцом', desc: 'Тунец, томат и руккола на поджаренном хлебе.', photo: 'sandwich-tuna', price: 490},

  {id: 'salad-tuna', cat: 'salad', name: 'Салат с тунцом', desc: 'Тунец, яйцо, печёный картофель, томаты и микс салата.', photo: 'salad-tuna', price: 490},
  {id: 'salad-green', cat: 'salad', name: 'Зелёный салат с фетой', desc: 'Руккола, свежая зелень и фета.', photo: 'salad-green', price: 590},

  {id: 'soup-chicken', cat: 'soup', name: 'Куриный суп', desc: 'Прозрачный бульон, овощи и яйцо.', photo: 'soup-chicken', price: 350},
  {id: 'soup-pumpkin', cat: 'soup', name: 'Тыквенный крем-суп', desc: 'Бархатный, с сыром и семечками.', photo: 'soup-pumpkin', price: 450},
  {id: 'soup-mushroom', cat: 'soup', name: 'Грибной крем-суп', desc: 'Шампиньоны, сливки и укроп.', photo: 'soup-mushroom', price: 450},
];

export const SUB: Item = {
  id: 'sub20', cat: 'sub', name: 'Абонемент «20 капучино»', desc: '20 капучино S в течение 60 дней.',
  price: 3900, photo: 'cappuccino', noDiscount: true,
};

export const byId = (id: string) => (id === SUB.id ? SUB : MENU.find((m) => m.id === id))!;
/** Есть ли позиция в нынешнем меню: в старых корзинах и заказах могут быть снятые блюда. */
export const inMenu = (id: string) => id === SUB.id || MENU.some((m) => m.id === id);

export type ModeId = 'hall' | 'togo' | 'car' | 'delivery';
export const MODES: Record<ModeId, {name: string; note: string}> = {
  hall: {name: 'В зале', note: 'Сядьте за любой столик и впишите его номер. Принесём, как будет готово.'},
  togo: {name: 'С собой', note: 'Закажите заранее и заберите без очереди. Обычно готово за 7 минут.'},
  car: {name: 'К машине', note: 'Парковка прямо у входа. Оставьте номер машины, вынесем заказ к ней.'},
  delivery: {name: 'Доставка', note: `По району в радиусе ${cafe.deliveryRadius}. Бесплатно от ${cafe.deliveryFreeFrom} ₽, иначе ${cafe.deliveryFee} ₽.`},
};

export const LEVELS = [
  {name: 'Знакомый', from: 0, cash: 5},
  {name: 'Свой', from: 5, cash: 7},
  {name: 'Постоянный', from: 15, cash: 10},
];

export type Promo = {
  id: string;
  kick: string;
  title: string;
  text: string;
  more: string;
  /** Цвет плитки из палитры айдентики: лес, красный, синий или светлая бумага. */
  tone: 'forest' | 'berry' | 'denim' | 'paper';
  /** Иллюстрация из айдентики в углу плитки. */
  art: ArtName;
  photo?: string;
  action: {kind: 'dish'; id: string} | {kind: 'sub'} | {kind: 'mode'; mode: ModeId} | {kind: 'invite'} | {kind: 'bday'} | {kind: 'menu'};
  cta: string;
};

export const PROMOS: Promo[] = [
  {id: 'first', kick: '−20%', title: 'На первый заказ в приложении', text: 'Скидка встанет сама, промокод не нужен.', tone: 'denim', art: 'percent', photo: 'cappuccino',
    more: 'Действует на первый заказ после входа по номеру телефона, на всё меню, кроме абонемента. Суммируется с баллами.', action: {kind: 'menu'}, cta: 'Открыть меню'},
  {id: 'car', kick: 'К машине', title: 'Не выходите из машины', text: 'Парковка у входа, вынесем заказ сами.', tone: 'forest', art: 'togo',
    more: 'Выберите «К машине», впишите номер, и когда кофе будет готов, бариста вынесет его к вам. Удобно по пути на работу или с детьми в салоне.', action: {kind: 'mode', mode: 'car'}, cta: 'Заказать к машине'},
  {id: 'sixth', kick: '6-й кофе', title: 'В подарок после пяти', text: 'Чашки наполняются на карте гостя.', tone: 'berry', art: 'steam', photo: 'flatwhite',
    more: 'Каждый кофе из приложения или по карте на кассе наполняет чашку на карте. Пять полных — и любой кофе в следующем заказе за наш счёт.', action: {kind: 'menu'}, cta: 'Открыть меню'},
  {id: 'sub', kick: '195 ₽', title: 'Капучино по абонементу', text: '20 чашек за 3 900 ₽ вместо 5 200 ₽.', tone: 'forest', art: 'steam', photo: 'cappuccino',
    more: 'Двадцать капучино S на 60 дней. Чашка списывается в корзине одной кнопкой, можно угощать коллег.', action: {kind: 'sub'}, cta: 'Добавить абонемент'},
  {id: 'friend', kick: '+150', title: 'Баллов за друга', text: 'Другу −20% на первый заказ, вам 150 баллов.', tone: 'denim', art: 'people',
    more: 'Отправьте другу ссылку из профиля. Когда он сделает первый заказ, вам придут 150 баллов. 1 балл = 1 ₽, баллами можно оплатить до 30% заказа.', action: {kind: 'invite'}, cta: 'Пригласить друга'},
  {id: 'delivery', kick: `от ${cafe.deliveryFreeFrom} ₽`, title: 'Доставка бесплатно', text: `По району в радиусе ${cafe.deliveryRadius}, привезём горячим.`, tone: 'berry', art: 'togo',
    more: `Доставляем в радиусе ${cafe.deliveryRadius} от кофейни. Заказ от ${cafe.deliveryFreeFrom} ₽ бесплатно, меньше — ${cafe.deliveryFee} ₽. Кофе едет в термосумке с крышками-непроливайками.`, action: {kind: 'mode', mode: 'delivery'}, cta: 'Заказать с доставкой'},
  {id: 'bday', kick: 'Кофе', title: 'В подарок на день рождения', text: 'Три дня до и три после.', tone: 'paper', art: 'steam',
    more: 'Укажите дату рождения в профиле. В эти семь дней один капучино S в заказе будет за наш счёт.', action: {kind: 'bday'}, cta: 'Указать дату'},
];
