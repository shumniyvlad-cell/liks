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
  close: 22,
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
  cat: 'coffee' | 'other' | 'breakfast' | 'dessert' | 'bakery' | 'sub';
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

const MILK: Opt[] = [['Обычное', 0], ['Овсяное', 60], ['Кокосовое', 60], ['Безлактозное', 40]];
const SYRUP: Opt[] = [['Без сиропа', 0], ['Карамель', 40], ['Ваниль', 40], ['Солёная карамель', 40], ['Лесной орех', 40]];
const SUGAR: Opt[] = [['Без сахара', 0], ['1 ложка', 0], ['2 ложки', 0], ['Сахар отдельно', 0]];
const TEMP: Opt[] = [['Обычная', 0], ['Погорячее', 0], ['Потеплее, для ребёнка', 0]];
const coffee = (size: Opt[]) => ({size, milk: MILK, syrup: SYRUP, sugar: SUGAR, temp: TEMP, shot: true});

export const CATS = [
  {id: 'coffee', name: 'Кофе'},
  {id: 'other', name: 'Не кофе'},
  {id: 'breakfast', name: 'Завтраки'},
  {id: 'dessert', name: 'Десерты'},
  {id: 'bakery', name: 'Выпечка'},
] as const;

export const MENU: Item[] = [
  {id: 'cappuccino', cat: 'coffee', name: 'Капучино', desc: 'Двойной эспрессо и плотная молочная пена.', photo: 'cappuccino', price: 220, coffee: true, hit: true,
    opts: coffee([['0,25 л', 220], ['0,35 л', 260], ['0,45 л', 290]])},
  {id: 'flatwhite', cat: 'coffee', name: 'Флэт уайт', desc: 'Больше кофе, меньше молока. Для тех, кто любит покрепче.', photo: 'flatwhite', price: 240, coffee: true,
    opts: coffee([['0,2 л', 240], ['0,3 л', 280]])},
  {id: 'latte', cat: 'coffee', name: 'Латте', desc: 'Мягкий, молочный, хорошо дружит с сиропом.', photo: 'cappuccino', price: 230, coffee: true,
    opts: coffee([['0,35 л', 230], ['0,45 л', 270]])},
  {id: 'raf', cat: 'coffee', name: 'Раф пряный', desc: 'Сливки, корица, бадьян и немного ванили.', photo: 'raf', price: 280, coffee: true,
    opts: {size: [['0,3 л', 280], ['0,4 л', 320]], milk: MILK, sugar: SUGAR, temp: TEMP}},
  {id: 'pumpkin', cat: 'coffee', name: 'Тыквенный латте', desc: 'Пюре из печёной тыквы, пряности, корица сверху.', photo: 'pumpkin', price: 290, coffee: true, tag: 'Сезон',
    opts: {size: [['0,3 л', 290], ['0,4 л', 330]], milk: MILK, sugar: SUGAR, temp: TEMP}},
  {id: 'americano', cat: 'coffee', name: 'Американо', desc: 'Эспрессо и горячая вода.', photo: 'espresso', price: 170, coffee: true,
    opts: {size: [['0,25 л', 170], ['0,35 л', 200]], milk: [['Без молока', 0], ['С молоком', 20]], syrup: SYRUP, sugar: SUGAR, shot: true}},
  {id: 'espresso', cat: 'coffee', name: 'Эспрессо', desc: '30 мл, зерно средней обжарки.', photo: 'espresso', price: 140, coffee: true,
    opts: {size: [['Одинарный', 140], ['Двойной', 180]], sugar: SUGAR}},

  {id: 'matcha', cat: 'other', name: 'Матча латте', desc: 'Японский зелёный чай на молоке.', photo: 'matcha', price: 290,
    opts: {size: [['0,3 л', 290], ['0,4 л', 330]], milk: MILK, syrup: SYRUP, sugar: SUGAR, temp: TEMP}},
  {id: 'cocoa', cat: 'other', name: 'Какао с маршмеллоу', desc: 'Густое, на настоящем какао, не из пакетика.', photo: 'cocoa', price: 230, hit: true,
    opts: {size: [['0,3 л', 230], ['0,4 л', 270]], milk: MILK, temp: TEMP}},
  {id: 'tea', cat: 'other', name: 'Облепиховый чай', desc: 'Облепиха, мёд, мята и апельсин. Чайник 600 мл.', photo: 'tea', price: 320, tag: 'Греет',
    opts: {sugar: [['Без сахара', 0], ['Сахар отдельно', 0], ['Ещё мёда', 0]]}},

  {id: 'combo', cat: 'breakfast', name: 'Завтрак-сет до 12:00', desc: 'Сырники или омлет с круассаном и кофе на выбор.', photo: 'syrniki', price: 490, old: 580, tag: 'Выгодно', morning: true,
    opts: {
      dish: [['Сырники', 0, 'syrniki'], ['Омлет с круассаном', 0, 'omelette']],
      drink: [['Капучино 0,25 л', 0], ['Латте 0,35 л', 0], ['Американо 0,25 л', 0], ['Флэт уайт 0,2 л', 20], ['Раф 0,3 л', 60]],
      milk: MILK, syrup: SYRUP, sugar: SUGAR, temp: TEMP,
    }},
  {id: 'syrniki', cat: 'breakfast', name: 'Сырники', desc: 'Три штуки, сметана, малина и черника.', photo: 'syrniki', price: 360, hit: true},
  {id: 'omelette', cat: 'breakfast', name: 'Омлет с круассаном', desc: 'Нежный омлет, сливочный круассан и зелень.', photo: 'omelette', price: 390},
  {id: 'porridge', cat: 'breakfast', name: 'Овсянка с брусникой', desc: 'На молоке, с брусникой, бананом и мёдом.', photo: 'porridge', price: 270},

  {id: 'medovik', cat: 'dessert', name: 'Медовик', desc: 'Тонкие коржи на мёде и сметанный крем.', photo: 'medovik', price: 290, dessert: true, hit: true},
  {id: 'cheesecake', cat: 'dessert', name: 'Чизкейк Нью-Йорк', desc: 'Классический, с соусом из лесных ягод.', photo: 'cheesecake', price: 320, dessert: true},
  {id: 'eclair', cat: 'dessert', name: 'Эклер шоколадный', desc: 'Заварной крем и тёмная глазурь.', photo: 'eclair', price: 190, dessert: true},

  {id: 'croissant', cat: 'bakery', name: 'Круассан миндальный', desc: 'Миндальный крем и лепестки миндаля.', photo: 'croissant', price: 230, opts: {warm: true}},
  {id: 'cinnabon', cat: 'bakery', name: 'Булочка с корицей', desc: 'Мягкая, с крем-чизом. Подогреем по желанию.', photo: 'cinnabon', price: 210, opts: {warm: true}},
];

export const SUB: Item = {
  id: 'sub20', cat: 'sub', name: 'Абонемент «20 капучино»', desc: '20 капучино или латте 0,35 л в течение 60 дней.',
  price: 3900, photo: 'cappuccino', noDiscount: true,
};

export const byId = (id: string) => (id === SUB.id ? SUB : MENU.find((m) => m.id === id))!;

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
  {id: 'breakfast', kick: '490 ₽', title: 'Завтрак-сет до 12:00', text: 'Сырники или омлет с круассаном и кофе на выбор.', tone: 'paper', art: 'croissant', photo: 'syrniki',
    more: 'Каждый день до 12:00. Вместо 580–610 ₽ по отдельности. Можно в зале, с собой или с доставкой.', action: {kind: 'dish', id: 'combo'}, cta: 'Выбрать завтрак'},
  {id: 'car', kick: 'К машине', title: 'Не выходите из машины', text: 'Парковка у входа, вынесем заказ сами.', tone: 'forest', art: 'togo',
    more: 'Выберите «К машине», впишите номер, и когда кофе будет готов, бариста вынесет его к вам. Удобно по пути на работу или с детьми в салоне.', action: {kind: 'mode', mode: 'car'}, cta: 'Заказать к машине'},
  {id: 'sixth', kick: '6-й кофе', title: 'В подарок после пяти', text: 'Чашки наполняются на карте гостя.', tone: 'berry', art: 'steam', photo: 'flatwhite',
    more: 'Каждый кофе из приложения или по карте на кассе наполняет чашку на карте. Пять полных — и любой кофе в следующем заказе за наш счёт.', action: {kind: 'menu'}, cta: 'Открыть меню'},
  {id: 'quiet', kick: '−50%', title: 'На второй десерт с 15 до 17', text: 'Тихие часы: тише в зале, слаще за столом.', tone: 'paper', art: 'cupcake', photo: 'medovik',
    more: 'С 15:00 до 17:00 при заказе двух десертов второй (тот, что дешевле) за полцены. Скидка считается в корзине сама.', action: {kind: 'menu'}, cta: 'Выбрать десерты'},
  {id: 'sub', kick: '195 ₽', title: 'Капучино по абонементу', text: '20 чашек за 3 900 ₽ вместо 5 200 ₽.', tone: 'forest', art: 'steam', photo: 'cappuccino',
    more: 'Двадцать капучино или латте 0,35 л на 60 дней. Чашка списывается в корзине одной кнопкой, можно угощать коллег.', action: {kind: 'sub'}, cta: 'Добавить абонемент'},
  {id: 'friend', kick: '+150', title: 'Баллов за друга', text: 'Другу −20% на первый заказ, вам 150 баллов.', tone: 'denim', art: 'people',
    more: 'Отправьте другу ссылку из профиля. Когда он сделает первый заказ, вам придут 150 баллов. 1 балл = 1 ₽, баллами можно оплатить до 30% заказа.', action: {kind: 'invite'}, cta: 'Пригласить друга'},
  {id: 'delivery', kick: `от ${cafe.deliveryFreeFrom} ₽`, title: 'Доставка бесплатно', text: `По району в радиусе ${cafe.deliveryRadius}, привезём горячим.`, tone: 'berry', art: 'togo',
    more: `Доставляем в радиусе ${cafe.deliveryRadius} от кофейни. Заказ от ${cafe.deliveryFreeFrom} ₽ бесплатно, меньше — ${cafe.deliveryFee} ₽. Кофе едет в термосумке с крышками-непроливайками.`, action: {kind: 'mode', mode: 'delivery'}, cta: 'Заказать с доставкой'},
  {id: 'bday', kick: 'Десерт', title: 'В подарок на день рождения', text: 'Три дня до и три после.', tone: 'paper', art: 'cupcake', photo: 'cheesecake',
    more: 'Укажите дату рождения в профиле. В эти семь дней любой десерт до 320 ₽ добавится к заказу бесплатно.', action: {kind: 'bday'}, cta: 'Указать дату'},
];
