/* Ликс — приложение кофейни. Без сборки, данные гостя в localStorage. */
(() => {
'use strict';

/* ---------- Настройки кофейни: правятся здесь ---------- */
const CAFE = {
  name: 'Ликс',
  city: 'Вологда',
  address: '',                 // впишите улицу и дом, например «ул. Ленинградская, 71»
  open: 8, close: 22,          // часы работы, ежедневно
  phone: '',                   // +7…
  telegram: '',                // ссылка на канал или бота
  deliveryFreeFrom: 800,
  deliveryFee: 149,
  deliveryRadius: '2 км',
  testMode: true,              // оплата без списания денег, любой код из СМС
};

const IMG = k => `assets/menu/${k}.jpg`;
const FOCUS = {cappuccino:'48% 48%',cheesecake:'52% 50%',cinnabon:'50% 48%',cocoa:'52% 52%',croissant:'55% 55%',eclair:'57% 60%',
  espresso:'45% 58%',flatwhite:'42% 55%',matcha:'48% 50%',medovik:'50% 55%',omelette:'55% 55%',porridge:'60% 58%',
  pumpkin:'45% 58%',raf:'45% 55%',syrniki:'50% 60%',tea:'55% 55%'};

const MILK = [['Обычное',0],['Овсяное',60],['Кокосовое',60],['Безлактозное',40]];
const SYRUP = [['Без сиропа',0],['Карамель',40],['Ваниль',40],['Солёная карамель',40],['Лесной орех',40]];
const coffeeOpts = (sizes) => ({sizes, milk: MILK, syrup: SYRUP, shot: true});

const CATS = [
  ['coffee','Кофе'],['other','Не кофе'],['breakfast','Завтраки'],['dessert','Десерты'],['bakery','Выпечка'],
];
const MENU = [
  {id:'cappuccino',cat:'coffee',name:'Капучино',desc:'Двойной эспрессо и плотная молочная пена.',img:'cappuccino',price:220,coffee:true,opts:coffeeOpts([['0,25 л',220],['0,35 л',260],['0,45 л',290]]),hit:true},
  {id:'flatwhite',cat:'coffee',name:'Флэт уайт',desc:'Больше кофе, меньше молока. Для тех, кто любит покрепче.',img:'flatwhite',price:240,coffee:true,opts:coffeeOpts([['0,2 л',240],['0,3 л',280]])},
  {id:'latte',cat:'coffee',name:'Латте',desc:'Мягкий, молочный, хорошо дружит с сиропом.',img:'cappuccino',price:230,coffee:true,opts:coffeeOpts([['0,35 л',230],['0,45 л',270]])},
  {id:'raf',cat:'coffee',name:'Раф пряный',desc:'Сливки, корица, бадьян и немного ванили.',img:'raf',price:280,coffee:true,opts:{sizes:[['0,3 л',280],['0,4 л',320]],milk:MILK}},
  {id:'pumpkin',cat:'coffee',name:'Тыквенный латте',desc:'Пюре из печёной тыквы, пряности, корица сверху.',img:'pumpkin',price:290,coffee:true,tag:'Сезон',opts:{sizes:[['0,3 л',290],['0,4 л',330]],milk:MILK}},
  {id:'americano',cat:'coffee',name:'Американо',desc:'Эспрессо и горячая вода.',img:'espresso',price:170,coffee:true,opts:{sizes:[['0,25 л',170],['0,35 л',200]],milk:[['Без молока',0],['С молоком',20]],syrup:SYRUP,shot:true}},
  {id:'espresso',cat:'coffee',name:'Эспрессо',desc:'30 мл, зерно средней обжарки.',img:'espresso',price:140,coffee:true,opts:{sizes:[['Одинарный',140],['Двойной',180]]}},

  {id:'matcha',cat:'other',name:'Матча латте',desc:'Японский зелёный чай на молоке.',img:'matcha',price:290,opts:{sizes:[['0,3 л',290],['0,4 л',330]],milk:MILK,syrup:SYRUP}},
  {id:'cocoa',cat:'other',name:'Какао с маршмеллоу',desc:'Густое, на настоящем какао, не из пакетика.',img:'cocoa',price:230,opts:{sizes:[['0,3 л',230],['0,4 л',270]],milk:MILK},hit:true},
  {id:'tea',cat:'other',name:'Облепиховый чай',desc:'Облепиха, мёд, мята и апельсин. Чайник 600 мл.',img:'tea',price:320,tag:'Греет'},

  {id:'combo',cat:'breakfast',name:'Завтрак-сет до 12:00',desc:'Сырники или омлет с круассаном и капучино 0,25 л.',img:'syrniki',price:490,old:580,tag:'Выгодно',
    opts:{dish:[['Сырники',0],['Омлет с круассаном',0]]},morning:true},
  {id:'syrniki',cat:'breakfast',name:'Сырники',desc:'Три штуки, сметана, малина и черника.',img:'syrniki',price:360,hit:true},
  {id:'omelette',cat:'breakfast',name:'Омлет с круассаном',desc:'Нежный омлет, сливочный круассан и зелень.',img:'omelette',price:390},
  {id:'porridge',cat:'breakfast',name:'Овсянка с брусникой',desc:'На молоке, с брусникой, бананом и мёдом.',img:'porridge',price:270},

  {id:'medovik',cat:'dessert',name:'Медовик',desc:'Тонкие коржи на мёде и сметанный крем.',img:'medovik',price:290,dessert:true,hit:true},
  {id:'cheesecake',cat:'dessert',name:'Чизкейк Нью-Йорк',desc:'Классический, с соусом из лесных ягод.',img:'cheesecake',price:320,dessert:true},
  {id:'eclair',cat:'dessert',name:'Эклер шоколадный',desc:'Заварной крем и тёмная глазурь.',img:'eclair',price:190,dessert:true},

  {id:'croissant',cat:'bakery',name:'Круассан миндальный',desc:'Миндальный крем и лепестки миндаля.',img:'croissant',price:230,opts:{warm:true}},
  {id:'cinnabon',cat:'bakery',name:'Булочка с корицей',desc:'Мягкая, с крем-чизом. Подогреем по желанию.',img:'cinnabon',price:210,opts:{warm:true}},
];
const SUB = {id:'sub20',name:'Абонемент «20 капучино»',desc:'20 капучино или латте 0,35 л в течение 60 дней',price:3900,img:'cappuccino',noDiscount:true};
const byId = id => id === SUB.id ? SUB : MENU.find(m => m.id === id);

const MODES = {
  hall:     {name:'В зале',   note:'Сядьте за любой столик и впишите его номер. Принесём, как будет готово.'},
  togo:     {name:'С собой',  note:'Закажите заранее и заберите без очереди. Обычно готово за 7 минут.'},
  car:      {name:'К машине', note:'Парковка прямо у входа. Оставьте номер машины, вынесем заказ к ней.'},
  delivery: {name:'Доставка', note:`Возим по району в радиусе ${CAFE.deliveryRadius}. Бесплатно от ${CAFE.deliveryFreeFrom} ₽, иначе ${CAFE.deliveryFee} ₽.`},
};
const MODE_ICONS = {
  hall:'<svg viewBox="0 0 28 28"><path d="M6 12h16M8 12v11M20 12v11M10 7h8"/><path d="M14 7v5"/></svg>',
  togo:'<svg viewBox="0 0 28 28"><path d="M8 9h12l-1.4 14H9.4Z"/><path d="M7 9h14M10 9l.8-3.5h6.4L18 9"/></svg>',
  car:'<svg viewBox="0 0 28 28"><path d="M5 18v-4l2.5-5.5h13L23 14v4"/><path d="M4 18h20v3H4z"/><circle cx="8.5" cy="21.5" r="1.8"/><circle cx="19.5" cy="21.5" r="1.8"/></svg>',
  delivery:'<svg viewBox="0 0 28 28"><circle cx="14" cy="11" r="4"/><path d="M14 25s-8-7-8-14a8 8 0 0 1 16 0c0 7-8 14-8 14Z"/></svg>',
};

const LEVELS = [
  {name:'Знакомый', from:0, cash:5},
  {name:'Свой', from:5, cash:7},
  {name:'Постоянный', from:15, cash:10},
];

/* ---------- Утилиты ---------- */
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Типограф: неразрывный пробел после коротких слов и перед ₽
const T = s => esc(s)
  .replace(/(^|[\s(«])([а-яёА-ЯЁ]{1,2}|без|для|под|над|при|про|что|как|или|из-за|это)\s+/g, '$1$2 ')
  .replace(/(^|[\s(«])([а-яёА-ЯЁ]{1,2})\s+/g, '$1$2 ')
  .replace(/(\d)\s(\d{3})/g, '$1 $2')
  .replace(/\s₽/g, ' ₽').replace(/\s—/g, ' —');
const rub = n => `${Math.round(n).toLocaleString('ru-RU').replace(/\s/g,' ')} ₽`;
const plural = (n, a, b, c) => { const m10=n%10, m100=n%100; return m10===1&&m100!==11?a:(m10>=2&&m10<=4&&(m100<10||m100>=20)?b:c); };
const vibrate = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch(e) {} };
const nowH = () => { const d = new Date(); return d.getHours() + d.getMinutes()/60; };
const isOpen = () => { const h = nowH(); return h >= CAFE.open && h < CAFE.close; };

/* ---------- Движение: системная настройка или ?motion=1 ---------- */
const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
let forceMotion = false;
try {
  const q = new URLSearchParams(location.search).get('motion');
  if (q === '1') localStorage.setItem('liks:motion','1');
  if (q === '0') localStorage.removeItem('liks:motion');
  forceMotion = localStorage.getItem('liks:motion') === '1';
} catch(e) {}
const motionOn = () => forceMotion || !reduceMQ.matches;
const syncMotion = () => document.documentElement.dataset.motion = motionOn() ? 'on' : 'off';
syncMotion(); reduceMQ.addEventListener?.('change', syncMotion);

/* ---------- Состояние ---------- */
const KEY = 'liks:v1';
const fresh = () => ({
  tab:'home', mode:'togo', cart:[], user:null, table:'', plate:'', region:'35', address:'', flat:'',
  when:'asap', pay:'sbp', usePoints:false, useGift:false, useSub:false, theme:'auto', order:null, fav:[],
});
let S = fresh();
try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch(e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e) {} };

// QR на столике: ?table=4 — сразу «В зале» за этим столиком
(() => { const t = new URLSearchParams(location.search).get('table'); if (t) { S.mode='hall'; S.table=t.slice(0,3); save(); } })();

const applyTheme = () => {
  const r = document.documentElement;
  if (S.theme === 'auto') delete r.dataset.theme; else r.dataset.theme = S.theme;
};
applyTheme();

/* ---------- Пружина (damping ratio + response, как у Apple) ---------- */
class Spring {
  constructor(x=0){ this.x=x; this.v=0; this.raf=0; }
  stop(){ cancelAnimationFrame(this.raf); this.raf=0; }
  to(target, {response=.35, damping=1, velocity}={}, onFrame, onDone){
    this.stop();
    if (velocity !== undefined) this.v = velocity;
    if (!motionOn() || document.hidden) { this.x = target; this.v = 0; onFrame(this.x); onDone && onDone(); return; }
    const k = (2*Math.PI/response)**2, c = 4*Math.PI*damping/response;
    let last = performance.now();
    const step = now => {
      const dt = Math.min(.064, (now-last)/1000); last = now;
      const n = Math.max(1, Math.ceil(dt*240)), h = dt/n;
      for (let i=0;i<n;i++){ const a = -k*(this.x-target) - c*this.v; this.v += a*h; this.x += this.v*h; }
      if (Math.abs(this.v) < 4 && Math.abs(this.x-target) < .4) { this.x = target; this.v = 0; onFrame(this.x); this.raf=0; onDone && onDone(); return; }
      onFrame(this.x);
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }
}
// Куда «долетит» жест (формула из Designing Fluid Interfaces)
const project = (v, d=.998) => (v/1000) * d / (1-d);
const rubber = (o, dim, c=.55) => (o*dim*c) / (dim + c*Math.abs(o));

/* ---------- Лист снизу ---------- */
const layer = $('#sheetLayer'), sheet = $('#sheet'), scrim = $('#scrim'), body = $('#sheetBody'), app = $('#app');
const sp = new Spring(0);
let H = 600, sheetOpen = false, onSheetClose = null, sheetKind = '';

function paintSheet(y){
  sheet.style.transform = `translateY(${y}px)`;
  const p = Math.max(0, Math.min(1, 1 - y/H));
  scrim.style.opacity = p;
  if (motionOn() && innerWidth < 620) {
    app.style.transform = `scale(${1 - .06*p}) translateY(${p*10}px)`;
    app.style.borderRadius = `${p*22}px`;
  }
}
function measure(){ H = sheet.getBoundingClientRect().height + 30; }

function openSheet(html, {kind='', onClose=null, keepScroll=false}={}){
  const wasOpen = sheetOpen;
  sheetKind = kind; onSheetClose = onClose;
  body.innerHTML = html;
  if (!keepScroll) body.scrollTop = 0;
  layer.hidden = false;
  sheetOpen = true;
  measure();
  if (!wasOpen) { sp.x = H; paintSheet(H); }
  sp.to(0, {response:.42, damping:1}, paintSheet);
  if (!motionOn()) { scrim.style.transition='opacity .2s'; sheet.style.transition='opacity .2s'; sheet.style.opacity=1; }
  setTimeout(() => { const f = $('[autofocus]', body); f && f.focus({preventScroll:true}); }, 380);
}
function closeSheet(velocity=0){
  if (!sheetOpen) return;
  sheetOpen = false; measure();
  const cb = onSheetClose; onSheetClose = null;
  sp.to(H, {response:.32, damping:1, velocity}, paintSheet, () => {
    if (sheetOpen) return;
    layer.hidden = true; body.innerHTML = ''; app.style.transform = ''; app.style.borderRadius = '';
    cb && cb();
  });
}
$('#sheetClose').addEventListener('click', () => closeSheet());
scrim.addEventListener('click', () => closeSheet());
addEventListener('keydown', e => { if (e.key === 'Escape' && sheetOpen) closeSheet(); });

// Жест: 1:1 за пальцем, отпустил — летит с той же скоростью; хватается на лету
(() => {
  let drag = null;
  const down = e => {
    if (!sheetOpen || e.button > 0) return;
    const inBody = body.contains(e.target);
    if (inBody && (body.scrollTop > 0 || e.target.closest('input,textarea,select,.rail,.plate'))) return;
    sp.stop();
    drag = {id:e.pointerId, y0:e.clientY, start:sp.x, hist:[{y:e.clientY,t:e.timeStamp}], active:!inBody, inBody};
  };
  const move = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dy = e.clientY - drag.y0;
    if (!drag.active) {
      if (dy > 8) { drag.active = true; drag.y0 = e.clientY; sheet.setPointerCapture(e.pointerId); }
      else if (dy < -6) { drag = null; return; }
      else return;
    }
    let y = drag.start + (e.clientY - drag.y0);
    if (y < 0) y = rubber(y, H);
    sp.x = y; paintSheet(y);
    drag.hist.push({y:e.clientY,t:e.timeStamp}); if (drag.hist.length > 6) drag.hist.shift();
    e.preventDefault();
  };
  const up = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null;
    if (!d.active) return;
    const a = d.hist[0], b = d.hist[d.hist.length-1];
    const v = b.t > a.t ? (b.y - a.y) / (b.t - a.t) * 1000 : 0;
    const end = sp.x + project(v);
    if (end > H * .45 && v > -300) closeSheet(v);
    else sp.to(0, {response:.35, damping: Math.abs(v) > 600 ? .8 : 1, velocity:v}, paintSheet);
  };
  sheet.addEventListener('pointerdown', down);
  sheet.addEventListener('pointermove', move, {passive:false});
  sheet.addEventListener('pointerup', up);
  sheet.addEventListener('pointercancel', up);
  // тянуть вниз из прокручиваемого содержимого, когда оно уже вверху
  body.addEventListener('touchmove', e => { if (drag && drag.active) e.preventDefault(); }, {passive:false});
})();

/* ---------- Тост ---------- */
let toastT;
function toast(msg){
  const t = $('#toast'); t.textContent = msg; t.classList.add('is-on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('is-on'), 2200);
}

/* ---------- Нажатие видно сразу, на pointerdown ---------- */
document.addEventListener('pointerdown', e => {
  const el = e.target.closest('.press'); if (!el) return;
  el.classList.add('is-pressed');
  const off = () => { el.classList.remove('is-pressed'); removeEventListener('pointerup', off); removeEventListener('pointercancel', off); };
  addEventListener('pointerup', off); addEventListener('pointercancel', off);
});

/* ---------- Корзина и расчёт ---------- */
const lineKey = (id, o) => id + '|' + JSON.stringify(o||{});
function unitPrice(item, o={}){
  let p = item.price;
  if (item.opts?.sizes && o.size != null) p = item.opts.sizes[o.size][1];
  if (item.opts?.milk && o.milk != null) p += item.opts.milk[o.milk][1];
  if (item.opts?.syrup && o.syrup != null) p += item.opts.syrup[o.syrup][1];
  if (o.shot) p += 60;
  return p;
}
function optText(item, o={}){
  const t = [];
  if (item.opts?.sizes) t.push(item.opts.sizes[o.size ?? 0][0]);
  if (item.opts?.dish) t.push(item.opts.dish[o.dish ?? 0][0]);
  if (item.opts?.milk && o.milk) t.push(item.opts.milk[o.milk][0].toLowerCase() + ' молоко');
  if (item.opts?.syrup && o.syrup) t.push(item.opts.syrup[o.syrup][0].toLowerCase());
  if (o.shot) t.push('доп. эспрессо');
  if (o.warm) t.push('подогреть');
  return t.join(', ');
}
function addToCart(id, o={}, qty=1){
  const item = byId(id), key = lineKey(id, o);
  const line = S.cart.find(l => l.key === key);
  if (line) line.qty += qty; else S.cart.push({key, id, o, qty, price: unitPrice(item, o)});
  save(); renderCartPill(); vibrate(8);
}
const cartQty = id => S.cart.filter(l => l.id === id).reduce((a,l) => a+l.qty, 0);
const units = pred => S.cart.flatMap(l => pred(byId(l.id), l) ? Array(l.qty).fill(l.price) : []);
const level = () => { const n = S.user?.orders?.length || 0; return [...LEVELS].reverse().find(l => n >= l.from); };
const giftReady = () => (S.user?.stamps || 0) >= 5;

function totals(){
  const sub = S.cart.reduce((a,l) => a + l.price*l.qty, 0);
  const disc = [];
  const h = nowH();
  // подарочный кофе (6-я чашка) или чашка с абонемента
  const coffees = units((it,l) => it.coffee).sort((a,b) => a-b);
  if (S.useGift && giftReady() && coffees.length) disc.push(['Шестой кофе от нас', coffees[0]]);
  else if (S.useSub && (S.user?.sub||0) > 0) {
    const eligible = units((it,l) => ['cappuccino','latte'].includes(it.id)).sort((a,b) => b-a);
    if (eligible.length) disc.push(['Чашка с абонемента', Math.min(eligible[0], 270)]);
  }
  // тихие часы: второй десерт −50%
  if (h >= 15 && h < 17) {
    const ds = units(it => it.dessert).sort((a,b) => a-b);
    if (ds.length >= 2) disc.push(['Тихие часы: десерт −50%', Math.round(ds[0]/2)]);
  }
  const discountable = S.cart.filter(l => !byId(l.id).noDiscount).reduce((a,l) => a + l.price*l.qty, 0);
  const pre = disc.reduce((a,d) => a+d[1], 0);
  if (!(S.user?.orders?.length) && discountable > 0) disc.push(['Первый заказ в приложении −20%', Math.round(Math.max(0, discountable - pre) * .2)]);
  const after = Math.max(0, sub - disc.reduce((a,d) => a+d[1], 0));
  const fee = S.mode === 'delivery' && sub > 0 ? (after >= CAFE.deliveryFreeFrom ? 0 : CAFE.deliveryFee) : 0;
  const maxPts = Math.floor(after * .3);
  const pts = S.usePoints && S.user ? Math.min(S.user.points || 0, maxPts) : 0;
  const total = after + fee - pts;
  const earn = Math.floor((total - (S.cart.filter(l => byId(l.id).noDiscount).reduce((a,l)=>a+l.price*l.qty,0))) * level().cash / 100);
  return {sub, disc, fee, pts, maxPts, total, earn: Math.max(0, earn)};
}

function renderCartPill(){
  const n = S.cart.reduce((a,l) => a+l.qty, 0);
  const pill = $('#cartPill');
  pill.hidden = n === 0 || S.tab === 'profile';
  $('#cartCount').textContent = n;
  $('#cartSum').textContent = rub(totals().sub);
}
$('#cartPill').addEventListener('click', openCart);

/* ---------- Иконки ---------- */
const ICON = {
  plus:'<svg viewBox="0 0 20 20"><path d="M10 4v12M4 10h12"/></svg>',
  cup:'<svg viewBox="0 0 20 20"><path d="M4 8h10v2.5a5 5 0 0 1-5 5 5 5 0 0 1-5-5Z"/><path d="M14 9h1a2 2 0 0 1 0 4h-1.3"/></svg>',
  clock:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  pin:'<svg viewBox="0 0 24 24"><circle cx="12" cy="10" r="3"/><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11Z"/></svg>',
  car:'<svg viewBox="0 0 24 24"><path d="M4 15v-3l2-5h12l2 5v3"/><path d="M3 15h18v3H3z"/><circle cx="7" cy="18.5" r="1.5"/><circle cx="17" cy="18.5" r="1.5"/></svg>',
  chev:'<svg class="row__chev" viewBox="0 0 8 14"><path d="m1 1 6 6-6 6"/></svg>',
  gift:'<svg class="ic" viewBox="0 0 24 24"><path d="M4 11h16v9H4zM3 7h18v4H3zM12 7v13"/><path d="M12 7c-2-3-6-3-6-1s4 1 6 1c2 0 6 1 6-1s-4-2-6 1"/></svg>',
  hist:'<svg class="ic" viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5"/><path d="M4 4v4.5h4.5M12 8v4l3 2"/></svg>',
  cake:'<svg class="ic" viewBox="0 0 24 24"><path d="M4 20h16v-7H4zM4 15c2 1.5 4 1.5 6 0s4-1.5 6 0 3 1 4 0M12 13V9M12 6.5c-.8-.8 0-2 0-2.5.6.6 1 1.6 0 2.5Z"/></svg>',
  share:'<svg class="ic" viewBox="0 0 24 24"><circle cx="17" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="17" cy="18.5" r="2.5"/><path d="m8.2 10.8 6.6-4M8.2 13.2l6.6 4"/></svg>',
  moon:'<svg class="ic" viewBox="0 0 24 24"><path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z"/></svg>',
  ticket:'<svg class="ic" viewBox="0 0 24 24"><path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4Z"/><path d="M10 7v10" stroke-dasharray="2 2"/></svg>',
  out:'<svg class="ic" viewBox="0 0 24 24"><path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10"/></svg>',
  phone:'<svg class="ic" viewBox="0 0 24 24"><path d="M6 3h3l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2Z"/></svg>',
  sbp:'<svg viewBox="0 0 26 26"><path d="M4 6.5 13 2l9 4.5v13L13 24l-9-4.5Z"/><path d="M13 2v22M4 6.5l18 13M22 6.5l-18 13"/></svg>',
  card:'<svg viewBox="0 0 26 26"><rect x="3" y="6" width="20" height="14" rx="3"/><path d="M3 11h20M7 16h4"/></svg>',
  cash:'<svg viewBox="0 0 26 26"><rect x="3" y="7" width="20" height="12" rx="2"/><circle cx="13" cy="13" r="2.8"/></svg>',
};

/* ---------- Экраны ---------- */
const views = {home: $('#view-home'), menu: $('#view-menu'), promos: $('#view-promos'), profile: $('#view-profile')};

function dishCard(m){
  const q = cartQty(m.id);
  return `<article class="dish press" data-dish="${m.id}" style="--fo:${FOCUS[m.img]}">
    <div class="dish__img">
      ${m.tag ? `<span class="dish__tag">${esc(m.tag)}</span>` : ''}
      <img src="${IMG(m.img)}" alt="${esc(m.name)}" loading="lazy" decoding="async" width="380" height="475">
      ${q ? `<span class="qty-badge">${q}</span>` : `<button class="add" type="button" data-quick="${m.id}" aria-label="Добавить: ${esc(m.name)}">${ICON.plus}</button>`}
    </div>
    <div class="dish__name">${T(m.name)}</div>
    <div class="dish__price">${m.opts?.sizes ? 'от ' : ''}${rub(m.price)}${m.old ? `<s>${rub(m.old)}</s>` : ''}</div>
  </article>`;
}

function greeting(){
  const h = new Date().getHours();
  if (h < 5) return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
}
function openLabel(){
  const h = nowH();
  if (isOpen()) return `<span class="status-dot">Открыто до ${CAFE.close}:00</span>`;
  return `<span class="status-dot is-closed">Откроемся в ${CAFE.open}:00</span>`;
}
function stampsHTML(){
  const n = S.user?.stamps || 0;
  return Array.from({length:6}, (_,i) => {
    if (i === 5) return `<span class="stamp is-gift ${n>=5?'is-ready':''}">${ICON.cup}</span>`;
    return `<span class="stamp ${i<n?'is-on':''}">${ICON.cup}</span>`;
  }).join('');
}
function loyaltyCard(){
  const u = S.user, lv = level();
  return `<div class="card-wrap"><div class="loyal" id="loyal" role="button" tabindex="0" aria-label="Карта гостя. Нажмите, чтобы показать код на кассе">
    <div class="loyal__face loyal__front">
      <div class="loyal__top"><span class="loyal__level">${u ? `${esc(lv.name)}, кешбэк ${lv.cash}%` : 'Карта гостя'}</span><span class="loyal__pts">${u ? `${u.points||0} ${plural(u.points||0,'балл','балла','баллов')}` : 'Войти'}</span></div>
      <div class="loyal__sign">
        <div><div class="loyal__mark">Ликс</div><div class="loyal__word">КОФЕЙНЯ</div></div>
        <div class="stamps" aria-label="${u?.stamps||0} из 5 отметок">${stampsHTML()}</div>
      </div>
    </div>
    <div class="loyal__face loyal__back">
      <div class="qr" id="qr"></div>
      <div><b>Покажите на&nbsp;кассе</b><span class="small muted">Баллы и отметки начислятся сами. Код ${esc(u?.code || '—')}</span></div>
    </div>
  </div></div>`;
}
function cardNote(){
  if (!S.user) return 'Войдите по номеру: пять кофе дают шестой бесплатно, с каждого заказа возвращаются баллы.';
  const n = S.user.stamps || 0;
  if (n >= 5) return 'Шестой кофе готов: включите его в корзине.';
  const left = 5 - n;
  return `Ещё ${left} ${plural(left,'кофе','кофе','кофе')}, и шестой от нас.`;
}

function liveOrderHTML(){
  const o = S.order; if (!o) return '';
  const st = orderStage(o);
  if (st.idx >= o.steps.length - 1 && Date.now() - o.at > 30*60e3) return '';
  const left = Math.max(0, Math.ceil((o.eta - Date.now())/60e3));
  const pct = Math.min(100, Math.round((st.idx + 1) / o.steps.length * 100));
  return `<div class="live press" id="liveOrder" role="button" tabindex="0">
    <div><div class="live__title">Заказ №${o.no}</div><div class="live__sub">${esc(o.steps[st.idx][0])}</div></div>
    <div class="live__eta">${st.idx >= o.steps.length-1 ? 'Готово' : `${left} мин`}</div>
    <div class="live__bar"><i style="width:${pct}%"></i></div>
  </div>`;
}

const PROMOS = [
  {id:'first', kick:'−20%', t:'На первый заказ в приложении', s:'Скидка встанет сама, промокод не нужен.', img:'cappuccino', style:'coral',
    more:'Действует на первый заказ после входа по номеру телефона, на всё меню, кроме абонемента. Суммируется с баллами.'},
  {id:'sixth', kick:'6-й кофе', t:'В подарок после пяти', s:'Отметки копятся на карте гостя.', img:'flatwhite',
    more:'Каждый кофе из приложения или по карте на кассе даёт отметку. После пяти отметок любой кофе в следующем заказе за наш счёт.'},
  {id:'car', kick:'К машине', t:'Не выходите из машины', s:'Парковка у входа, вынесем заказ сами.', icon:'car', style:'ink',
    more:'Выберите «К машине», впишите номер, и когда кофе будет готов, бариста вынесет его к вам. Удобно по пути на работу или с детьми в салоне.', mode:'car'},
  {id:'breakfast', kick:'490 ₽', t:'Завтрак-сет до 12:00', s:'Сырники или омлет с круассаном и капучино.', img:'syrniki',
    more:'Каждый день до 12:00. Вместо 580–610 ₽ по отдельности. Можно в зале, с собой или с доставкой.', dish:'combo'},
  {id:'quiet', kick:'−50%', t:'На второй десерт с 15 до 17', s:'Тихие часы: тише в зале, слаще за столом.', img:'medovik',
    more:'С 15:00 до 17:00 при заказе двух десертов второй (тот, что дешевле) за полцены. Скидка считается в корзине сама.'},
  {id:'sub', kick:'195 ₽', t:'Капучино по абонементу', s:'20 чашек за 3 900 ₽ вместо 5 200 ₽.', img:'cappuccino', style:'sage',
    more:'Двадцать капучино или латте 0,35 л на 60 дней. Чашка списывается в корзине одной кнопкой, можно угощать коллег.', sub:true},
  {id:'friend', kick:'+150', t:'Баллов за друга', s:'Другу −20% на первый заказ, вам 150 баллов.', icon:'share',
    more:'Отправьте другу ссылку из профиля. Когда он сделает первый заказ, вам придут 150 баллов. 1 балл = 1 ₽, баллами можно оплатить до 30% заказа.', share:true},
  {id:'delivery', kick:`от ${CAFE.deliveryFreeFrom} ₽`, t:'Доставка бесплатно', s:`По району в радиусе ${CAFE.deliveryRadius}, привезём горячим.`, icon:'pin',
    more:`Доставляем в радиусе ${CAFE.deliveryRadius} от кофейни. Заказ от ${CAFE.deliveryFreeFrom} ₽ бесплатно, меньше — ${CAFE.deliveryFee} ₽. Кофе едет в термосумке с крышками-непроливайками.`, mode:'delivery'},
  {id:'bday', kick:'Десерт', t:'В подарок на день рождения', s:'Три дня до и три после.', img:'cheesecake',
    more:'Укажите дату рождения в профиле. В эти семь дней любой десерт до 320 ₽ добавится к заказу бесплатно.'},
];

function promoTile(p){
  const big = p.img && !p.style ? `<img src="${IMG(p.img)}" alt="" loading="lazy">` : '';
  return `<button class="promo press ${p.style?'promo--'+p.style:''}" type="button" data-promo="${p.id}">${big}
    <div class="promo__big">${T(p.kick)}</div><div class="promo__t">${T(p.t)}</div><div class="promo__s">${T(p.s)}</div></button>`;
}

function renderHome(){
  const hits = MENU.filter(m => m.hit);
  views.home.innerHTML = `
    <header class="bar"><div class="bar__row">
      <div class="wordmark">Ликс<small>кофейня<br>${esc(CAFE.city)}</small></div>
      <button class="avatar press" type="button" data-go="profile" aria-label="Профиль">${S.user ? esc((S.user.name||'Г')[0].toUpperCase()) : '<svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="4"/><path d="M4.5 20c1.3-3.6 4-5.4 7.5-5.4s6.2 1.8 7.5 5.4"/></svg>'}</button>
    </div></header>
    <div class="hello">${openLabel()}<h1>${greeting()}${S.user?.name ? `, ${esc(S.user.name)}` : ''}</h1></div>
    ${liveOrderHTML()}
    ${loyaltyCard()}
    <p class="card-note">${T(cardNote())}</p>

    <div class="section">
      <div class="section__head"><h2 class="h2">Как забрать</h2></div>
      <div class="modes" role="radiogroup" aria-label="Как забрать">
        ${Object.entries(MODES).map(([k,m]) => `<button class="mode ${S.mode===k?'is-on':''}" type="button" role="radio" aria-checked="${S.mode===k}" data-mode="${k}">${MODE_ICONS[k]}${m.name}</button>`).join('')}
      </div>
      <p class="mode-note" id="modeNote">${T(MODES[S.mode].note)}</p>
    </div>

    <div class="section">
      <div class="section__head"><h2 class="h2">Акции</h2><button class="link" type="button" data-go="promos">Все</button></div>
      <div class="rail">${PROMOS.slice(0,5).map(promoTile).join('')}</div>
    </div>

    <div class="section">
      <div class="section__head"><h2 class="h2">Чаще всего берут</h2><button class="link" type="button" data-go="menu">Меню</button></div>
      <div class="grid">${hits.map(dishCard).join('')}</div>
    </div>

    <article class="about">
      <div class="about__photo"><img src="assets/facade.jpg" alt="Фасад кофейни Ликс: красная вывеска и большие окна" loading="lazy"></div>
      <div class="about__body">
        <h2>Красная вывеска у&nbsp;парковки</h2>
        <p>${T('Маленькая кофейня с завтраками весь день и десертами к кофе. Можно зайти, а можно не выходить из машины.')}</p>
        <div class="facts">
          <div class="fact">${ICON.clock}<span>Ежедневно ${CAFE.open}:00–${CAFE.close}:00</span></div>
          <div class="fact">${ICON.pin}<span>${CAFE.address ? esc(CAFE.address) + ', ' : ''}${esc(CAFE.city)}</span></div>
          <div class="fact">${ICON.car}<span>Своя парковка у входа</span></div>
        </div>
        <div class="about__row">
          ${CAFE.address ? `<a class="btn btn--ghost" href="https://yandex.ru/maps/?text=${encodeURIComponent('Ликс кофейня ' + CAFE.address + ' ' + CAFE.city)}" target="_blank" rel="noopener">Маршрут</a>` : `<button class="btn btn--ghost" type="button" data-go="menu">Меню</button>`}
          ${CAFE.phone ? `<a class="btn btn--ghost" href="tel:${esc(CAFE.phone)}">Позвонить</a>` : `<button class="btn btn--ghost" type="button" data-go="promos">Акции</button>`}
        </div>
      </div>
    </article>`;
  drawQR();
}

function renderMenu(){
  const morning = nowH() < 12;
  views.menu.innerHTML = `
    <header class="bar"><div class="bar__row"><h1 class="bar__title">Меню</h1><span class="small muted">${esc(MODES[S.mode].name)}</span></div>
      <div class="cats" role="tablist">${CATS.map(([k,n],i) => `<button class="chip ${i===0?'is-on':''}" type="button" data-cat="${k}">${n}</button>`).join('')}</div>
    </header>
    ${CATS.map(([k,n]) => `<section class="menu-sec" id="cat-${k}" data-sec="${k}">
      <h2>${n}</h2>
      ${k==='breakfast' ? `<p class="menu-sec__note">${T(morning ? 'Завтраки весь день, сет по 490 ₽ до 12:00.' : 'Завтраки весь день. Сет по 490 ₽ вернётся завтра до 12:00.')}</p>` : ''}
      <div class="grid">${MENU.filter(m => m.cat===k && (k!=='breakfast' || !m.morning || morning)).map(dishCard).join('')}</div>
    </section>`).join('')}`;
  // подсветка категории при прокрутке
  const chips = $$('.chip', views.menu);
  const io = new IntersectionObserver(es => {
    es.forEach(en => { if (en.isIntersecting) {
      chips.forEach(c => c.classList.toggle('is-on', c.dataset.cat === en.target.dataset.sec));
      const on = chips.find(c => c.classList.contains('is-on')); on && on.scrollIntoView({inline:'nearest', block:'nearest'});
    }});
  }, {root: views.menu, rootMargin:'-140px 0px -60% 0px'});
  $$('.menu-sec', views.menu).forEach(s => io.observe(s));
}

function renderPromos(){
  views.promos.innerHTML = `
    <header class="bar"><div class="bar__row"><h1 class="bar__title">Акции</h1></div></header>
    <div class="offers">${PROMOS.map(p => `<button class="offer press" type="button" data-promo="${p.id}">
      <div class="offer__body"><div class="offer__kick">${T(p.kick)}</div><div class="offer__t">${T(p.t)}</div><div class="offer__s">${T(p.s)}</div></div>
      ${p.img ? `<div class="offer__img"><img src="${IMG(p.img)}" alt="" loading="lazy"></div>` : `<div class="offer__img offer__icon">${ICON[p.icon].replace('class="ic" ','')}</div>`}
    </button>`).join('')}</div>`;
}

function renderProfile(){
  const u = S.user;
  if (!u) {
    views.profile.innerHTML = `
      <header class="bar"><div class="bar__row"><h1 class="bar__title">Профиль</h1></div></header>
      <div class="guest">
        <h2>Карта гостя в&nbsp;телефоне</h2>
        <ul class="perks">
          <li>${T('−20% на первый заказ в приложении')}</li>
          <li>${T('Шестой кофе в подарок после пяти')}</li>
          <li>${T('До 10% заказа возвращается баллами')}</li>
          <li>${T('Десерт в подарок на день рождения')}</li>
        </ul>
        <button class="btn" type="button" data-auth>Войти по номеру</button>
      </div>
      ${settingsList()}`;
    return;
  }
  const lv = level(), n = u.orders.length, next = LEVELS.find(l => l.from > n);
  const pct = next ? Math.round((n - lv.from) / (next.from - lv.from) * 100) : 100;
  views.profile.innerHTML = `
    <header class="bar"><div class="bar__row"><h1 class="bar__title">Профиль</h1></div></header>
    <div class="who"><div class="avatar">${esc((u.name||'Г')[0].toUpperCase())}</div><div><h1>${esc(u.name || 'Гость')}</h1><div class="muted small">${esc(u.phone)}</div></div></div>
    <div class="level">
      <div class="level__row"><span class="level__name">${esc(lv.name)}</span><span class="muted small">кешбэк ${lv.cash}% баллами</span></div>
      <div class="meter"><i style="width:${pct}%"></i></div>
      <p class="small muted" style="margin-top:8px">${next ? T(`Ещё ${next.from - n} ${plural(next.from-n,'заказ','заказа','заказов')} до уровня «${next.name}» с кешбэком ${next.cash}%`) : 'Максимальный уровень. Спасибо, что вы с нами.'}</p>
    </div>
    <div class="stats">
      <div class="stat"><b>${u.points||0}</b><span>${plural(u.points||0,'балл','балла','баллов')}</span></div>
      <div class="stat"><b>${u.stamps||0}/5</b><span>отметок</span></div>
      <div class="stat"><b>${u.sub||0}</b><span>${plural(u.sub||0,'чашка','чашки','чашек')} абонемента</span></div>
    </div>
    <div class="list">
      <button class="row" type="button" data-showcard>${ICON.ticket}<span>Карта для кассы</span>${ICON.chev}</button>
      <button class="row" type="button" data-history>${ICON.hist}<span>Мои заказы</span><span class="row__v">${n}</span>${ICON.chev}</button>
      <button class="row" type="button" data-friend>${ICON.share}<span>Пригласить друга</span><span class="row__v">+150</span>${ICON.chev}</button>
      <button class="row" type="button" data-bday>${ICON.cake}<span>День рождения</span><span class="row__v">${u.bday ? new Date(u.bday).toLocaleDateString('ru-RU',{day:'numeric',month:'long'}) : 'Указать'}</span>${ICON.chev}</button>
    </div>
    ${settingsList(true)}`;
}
function settingsList(logged){
  const th = {auto:'Как в системе', light:'Светлая', dark:'Тёмная'}[S.theme];
  return `<div class="list">
    <button class="row" type="button" data-theme-cycle>${ICON.moon}<span>Тема</span><span class="row__v">${th}</span>${ICON.chev}</button>
    ${CAFE.phone ? `<a class="row" href="tel:${esc(CAFE.phone)}">${ICON.phone}<span>Позвонить в кофейню</span>${ICON.chev}</a>` : ''}
    ${logged ? `<button class="row" type="button" data-logout>${ICON.out}<span>Выйти</span></button>` : ''}
  </div>
  <p class="small muted" style="padding:16px 24px 0">${T(`Ликс, кофейня. ${CAFE.city}, ежедневно ${CAFE.open}:00–${CAFE.close}:00.`)}</p>`;
}

function render(){
  renderHome(); renderMenu(); renderPromos(); renderProfile(); renderCartPill();
}

/* ---------- Навигация ---------- */
function go(tab){
  if (!views[tab]) return;
  if (S.tab === tab) { views[tab].scrollTo({top:0, behavior: motionOn() ? 'smooth':'auto'}); return; }
  S.tab = tab; save();
  $$('.view').forEach(v => v.classList.toggle('is-active', v.dataset.view === tab));
  $$('.tab').forEach(t => { const on = t.dataset.tab === tab; t.classList.toggle('is-active', on); on ? t.setAttribute('aria-current','page') : t.removeAttribute('aria-current'); });
  renderCartPill();
}
$$('.tab').forEach(t => t.addEventListener('click', () => go(t.dataset.tab)));
Object.values(views).forEach(v => v.addEventListener('scroll', () => v.classList.toggle('is-scrolled', v.scrollTop > 4), {passive:true}));

/* ---------- Карточка блюда ---------- */
function openDish(id){
  const m = byId(id); if (!m) return;
  const o = {size: m.opts?.sizes ? 0 : undefined, milk: m.opts?.milk ? 0 : undefined, syrup: m.opts?.syrup ? 0 : undefined, dish: m.opts?.dish ? 0 : undefined, shot:false, warm:false};
  let qty = 1;
  const group = (key, label, list, extra='') => `<div class="field"><div class="field__label">${label}${extra}</div><div class="seg">
    ${list.map(([n,p],i) => `<button class="opt ${o[key]===i?'is-on':''}" type="button" data-opt="${key}" data-i="${i}">${esc(n)}${p ? `<small>${key==='size'?rub(p):'+'+rub(p)}</small>` : (key==='size'?`<small>${rub(p)}</small>`:'')}</button>`).join('')}
  </div></div>`;
  const draw = () => {
    const price = unitPrice(m, o) * qty;
    openSheet(`
      <div class="sheet__img" style="--fo:${FOCUS[m.img]}"><img src="${IMG(m.img)}" alt="${esc(m.name)}"></div>
      <h2 id="sheetTitle">${T(m.name)}</h2>
      <p class="sheet__lead">${T(m.desc)}</p>
      ${m.opts?.sizes ? group('size','Объём', m.opts.sizes) : ''}
      ${m.opts?.dish ? group('dish','Завтрак', m.opts.dish) : ''}
      ${m.opts?.milk ? group('milk','Молоко', m.opts.milk) : ''}
      ${m.opts?.syrup ? group('syrup','Сироп', m.opts.syrup) : ''}
      ${m.opts?.shot ? `<button class="toggle" type="button" role="switch" aria-checked="${o.shot}" data-flag="shot"><div><b>Ещё эспрессо</b><span>Покрепче, +60 ₽</span></div><i class="switch"></i></button>` : ''}
      ${m.opts?.warm ? `<button class="toggle" type="button" role="switch" aria-checked="${o.warm}" data-flag="warm"><div><b>Подогреть</b><span>Бесплатно</span></div><i class="switch"></i></button>` : ''}
      <div class="buy">
        <div class="stepper"><button type="button" data-q="-1" aria-label="Меньше">−</button><output>${qty}</output><button type="button" data-q="1" aria-label="Больше">+</button></div>
        <button class="btn" type="button" data-addnow>Добавить<span class="btn__sum">${rub(price)}</span></button>
      </div>`, {kind:'dish', keepScroll:true});
  };
  draw();
  body.onclick = e => {
    const op = e.target.closest('[data-opt]');
    if (op) { o[op.dataset.opt] = +op.dataset.i; return update(); }
    const fl = e.target.closest('[data-flag]');
    if (fl) { o[fl.dataset.flag] = !o[fl.dataset.flag]; return update(); }
    const q = e.target.closest('[data-q]');
    if (q) { qty = Math.max(1, Math.min(20, qty + +q.dataset.q)); return update(); }
    if (e.target.closest('[data-addnow]')) {
      const clean = Object.fromEntries(Object.entries(o).filter(([k,v]) => v !== undefined && v !== false && !(k!=='size'&&k!=='dish'&&v===0)));
      if (m.opts?.sizes) clean.size = o.size;
      if (m.opts?.dish) clean.dish = o.dish;
      addToCart(m.id, clean, qty);
      closeSheet(); toast(`${m.name} в корзине`); refreshCards();
    }
  };
  function update(){
    $$('[data-opt]', body).forEach(b => b.classList.toggle('is-on', o[b.dataset.opt] === +b.dataset.i));
    $$('[data-flag]', body).forEach(b => b.setAttribute('aria-checked', !!o[b.dataset.flag]));
    $('output', body).textContent = qty;
    $('.btn__sum', body).textContent = rub(unitPrice(m, o) * qty);
  }
}
function refreshCards(){
  const keepTop = Object.fromEntries(Object.entries(views).map(([k,v]) => [k, v.scrollTop]));
  render();
  Object.entries(views).forEach(([k,v]) => v.scrollTop = keepTop[k]);
}

/* ---------- Корзина и оформление ---------- */
function deliveryFields(){
  if (S.mode === 'hall') return `<div class="field"><div class="field__label">Номер столика</div>
    <input class="input" id="fTable" inputmode="numeric" maxlength="3" placeholder="Например, 4" value="${esc(S.table)}" style="max-width:180px"><p class="hint">Номер написан на табличке на столе.</p></div>`;
  if (S.mode === 'car') return `<div class="field"><div class="field__label">Номер машины</div>
    <div class="plate"><input id="fPlate" maxlength="6" placeholder="А123ВС" value="${esc(S.plate)}" autocapitalize="characters" autocomplete="off" spellcheck="false" aria-label="Номер машины"><div class="plate__reg"><input id="fRegion" maxlength="3" inputmode="numeric" value="${esc(S.region)}" aria-label="Регион"><span class="plate__rus">RUS<i></i></span></div></div>
    <p class="hint" id="plateHint">Вынесем к машине на парковке у входа.</p></div>`;
  if (S.mode === 'delivery') return `<div class="field"><div class="field__label">Адрес</div>
    <input class="input" id="fAddr" placeholder="Улица, дом" value="${esc(S.address)}" autocomplete="street-address">
    <input class="input" id="fFlat" placeholder="Квартира, подъезд, этаж" value="${esc(S.flat)}" style="margin-top:8px">
    <p class="hint">${T(`Радиус ${CAFE.deliveryRadius}, привезём за 35–45 минут.`)}</p></div>`;
  return '';
}
function whenField(){
  if (S.mode === 'delivery' || S.mode === 'hall') return '';
  const slots = []; const d = new Date(); d.setSeconds(0,0); d.setMinutes(Math.ceil((d.getMinutes()+20)/15)*15);
  for (let i=0; i<6; i++) { const t = new Date(d.getTime() + i*15*60e3); if (t.getHours() + t.getMinutes()/60 <= CAFE.close - .25 && t.getHours() >= CAFE.open) slots.push(t.toTimeString().slice(0,5)); }
  return `<div class="field"><div class="field__label">Когда</div><div class="seg" style="flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;margin:0 -20px;padding:0 20px">
    <button class="opt ${S.when==='asap'?'is-on':''}" type="button" data-when="asap" style="flex:none">Как можно скорее<small>около 7 минут</small></button>
    ${slots.map(s => `<button class="opt ${S.when===s?'is-on':''}" type="button" data-when="${s}" style="flex:none">К ${s}<small>${S.mode==='car'?'подъеду':'заберу'}</small></button>`).join('')}
  </div></div>`;
}
function cartHTML(){
  if (!S.cart.length) return `<h2 id="sheetTitle">Корзина</h2><div class="empty"><b>Пока пусто</b><p class="muted">${T('Начните с капучино или загляните в завтраки.')}</p></div><div class="buy"><button class="btn" type="button" data-tomenu>Открыть меню</button></div>`;
  const t = totals(), u = S.user;
  const canGift = u && giftReady() && S.cart.some(l => byId(l.id).coffee);
  const canSub = u && (u.sub||0) > 0 && S.cart.some(l => ['cappuccino','latte'].includes(l.id));
  const payOff = S.mode === 'delivery' || S.mode === 'car';
  if (payOff && S.pay === 'cash') S.pay = 'sbp';
  return `<h2 id="sheetTitle">Ваш заказ</h2>
    <div class="field"><div class="seg seg--scroll">${Object.entries(MODES).map(([k,m]) => `<button class="chip ${S.mode===k?'is-on':''}" type="button" data-cmode="${k}">${m.name}</button>`).join('')}</div></div>
    <div style="margin-top:12px">${S.cart.map(l => { const m = byId(l.id); return `<div class="line-item">
      <div class="line-item__img" style="--fo:${FOCUS[m.img]}"><img src="${IMG(m.img)}" alt=""></div>
      <div><b>${T(m.name)}</b><span>${esc(optText(m, l.o) || '')}${optText(m,l.o)?', ':''}${rub(l.price)}</span></div>
      <div class="mini-step"><button type="button" data-lq="-1" data-key="${esc(l.key)}" aria-label="Меньше">−</button><output>${l.qty}</output><button type="button" data-lq="1" data-key="${esc(l.key)}" aria-label="Больше">+</button></div>
    </div>`; }).join('')}</div>
    ${deliveryFields()}
    ${whenField()}
    ${canGift ? `<button class="toggle" type="button" role="switch" aria-checked="${!!S.useGift}" data-cflag="useGift"><div><b>Шестой кофе от нас</b><span>Самый недорогой кофе в заказе бесплатно</span></div><i class="switch"></i></button>` : ''}
    ${canSub && !S.useGift ? `<button class="toggle" type="button" role="switch" aria-checked="${!!S.useSub}" data-cflag="useSub"><div><b>Списать с абонемента</b><span>Осталось ${u.sub} ${plural(u.sub,'чашка','чашки','чашек')}</span></div><i class="switch"></i></button>` : ''}
    ${u && (u.points||0) > 0 ? `<button class="toggle" type="button" role="switch" aria-checked="${!!S.usePoints}" data-cflag="usePoints"><div><b>Оплатить баллами</b><span>${T(`Можно до ${rub(Math.min(u.points, t.maxPts))}, у вас ${u.points}`)}</span></div><i class="switch"></i></button>` : ''}
    <div class="field"><div class="field__label">Оплата</div><div class="pay">
      <button class="opt ${S.pay==='sbp'?'is-on':''}" type="button" data-pay="sbp">${ICON.sbp}<span>СБП<small>через приложение банка</small></span></button>
      <button class="opt ${S.pay==='card'?'is-on':''}" type="button" data-pay="card">${ICON.card}<span>Картой онлайн<small>Мир, Visa, Mastercard</small></span></button>
      ${payOff ? '' : `<button class="opt ${S.pay==='cash'?'is-on':''}" type="button" data-pay="cash">${ICON.cash}<span>При получении<small>картой или наличными на кассе</small></span></button>`}
    </div></div>
    <div class="sum">
      <div class="sum__row"><span>Товары</span><span>${rub(t.sub)}</span></div>
      ${t.disc.map(([n,v]) => `<div class="sum__row is-disc"><span>${T(n)}</span><span>−${rub(v)}</span></div>`).join('')}
      ${S.mode==='delivery' ? `<div class="sum__row"><span>Доставка</span><span>${t.fee ? rub(t.fee) : 'бесплатно'}</span></div>` : ''}
      ${t.pts ? `<div class="sum__row is-disc"><span>Баллами</span><span>−${rub(t.pts)}</span></div>` : ''}
      <div class="sum__row is-total"><span>Итого</span><span>${rub(t.total)}</span></div>
    </div>
    ${S.mode==='delivery' && t.fee ? `<p class="hint">${T(`Добавьте ещё на ${rub(CAFE.deliveryFreeFrom - (t.sub - t.disc.reduce((a,d)=>a+d[1],0)))}, и доставка станет бесплатной.`)}</p>` : ''}
    ${u ? `<p class="hint">${T(`Вернётся ${t.earn} ${plural(t.earn,'балл','балла','баллов')} после заказа.`)}</p>` : `<p class="hint">${T('Скидка 20% применится после входа по номеру. Дальше с каждого заказа будут копиться баллы.')}</p>`}
    ${CAFE.testMode ? `<p class="test-note">Тестовый режим: деньги не списываются.</p>` : ''}
    <div class="buy"><button class="btn" type="button" data-checkout ${isOpen() || S.when!=='asap' ? '' : ''}>${u ? (S.pay==='cash' ? 'Отправить заказ' : 'Оплатить') : 'Войти и оформить'}<span class="btn__sum">${rub(t.total)}</span></button></div>
    ${!isOpen() ? `<p class="hint" style="text-align:center">${T(`Сейчас закрыто, заказ приготовим к ${CAFE.open}:00.`)}</p>` : ''}`;
}
function openCart(){
  openSheet(cartHTML(), {kind:'cart'});
  bindCart();
}
function redrawCart(){ body.innerHTML = cartHTML(); measure(); bindCart(); renderCartPill(); }
function bindCart(){
  const pl = $('#fPlate', body);
  if (pl) pl.addEventListener('input', () => {
    const map = {A:'А',B:'В',E:'Е',K:'К',M:'М',H:'Н',O:'О',P:'Р',C:'С',T:'Т',Y:'У',X:'Х'};
    pl.value = pl.value.toUpperCase().split('').map(c => map[c] || c).join('').replace(/[^АВЕКМНОРСТУХ0-9]/g,'');
    S.plate = pl.value; save();
  });
  const bindVal = (sel, key) => { const el = $(sel, body); el && el.addEventListener('input', () => { S[key] = el.value; save(); }); };
  bindVal('#fRegion','region'); bindVal('#fTable','table'); bindVal('#fAddr','address'); bindVal('#fFlat','flat');
  body.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.tomenu !== undefined) { closeSheet(); go('menu'); return; }
    if (b.dataset.cmode) { S.mode = b.dataset.cmode; S.when='asap'; save(); redrawCart(); render(); return; }
    if (b.dataset.lq) {
      const l = S.cart.find(x => x.key === b.dataset.key); if (!l) return;
      l.qty += +b.dataset.lq; if (l.qty <= 0) S.cart = S.cart.filter(x => x !== l);
      save(); redrawCart(); refreshCards(); return;
    }
    if (b.dataset.when) { S.when = b.dataset.when; save(); redrawCart(); return; }
    if (b.dataset.pay) { S.pay = b.dataset.pay; save(); redrawCart(); return; }
    if (b.dataset.cflag) { const k = b.dataset.cflag; S[k] = !S[k]; if (k==='useGift' && S[k]) S.useSub=false; save(); redrawCart(); return; }
    if (b.dataset.checkout !== undefined) checkout();
  };
}
function validate(){
  if (S.mode === 'hall' && !S.table.trim()) return ['#fTable','Впишите номер столика.'];
  if (S.mode === 'car' && !/^[АВЕКМНОРСТУХ]\d{3}[АВЕКМНОРСТУХ]{2}$/.test(S.plate)) return ['#fPlate','Номер в формате А123ВС, чтобы бариста нашёл машину.'];
  if (S.mode === 'car' && !/^\d{2,3}$/.test(S.region)) return ['#fRegion','Укажите регион, две или три цифры.'];
  if (S.mode === 'delivery' && S.address.trim().length < 5) return ['#fAddr','Впишите улицу и дом.'];
  return null;
}
function checkout(){
  if (!S.user) { openAuth(() => openCart()); return; }
  const bad = validate();
  if (bad) {
    const el = $(bad[0], body); el && el.focus();
    const hint = el?.closest('.field')?.querySelector('.hint');
    if (hint) { hint.textContent = bad[1]; hint.classList.add('err'); } else toast(bad[1]);
    vibrate([10,40,10]); return;
  }
  const t = totals();
  if (S.pay === 'cash') return placeOrder(t, 'на кассе');
  if (S.pay === 'sbp') {
    openSheet(`<h2 id="sheetTitle">Оплата по СБП</h2><p class="sheet__lead">${T(`Выберите банк, в нём откроется перевод на ${rub(t.total)}.`)}</p>
      <div class="banks">${[['Сбербанк','#21A038'],['Т-Банк','#FFDD2D'],['ВТБ','#0A2896'],['Альфа-Банк','#EF3124']].map(([n,c]) => `<button class="bank press" type="button" data-bank="${n}"><i style="background:${c}"></i>${n}</button>`).join('')}</div>
      ${CAFE.testMode ? `<p class="test-note">${T('Тестовый режим: банк не откроется, оплата пройдёт сразу.')}</p>` : ''}`, {kind:'pay'});
    body.onclick = e => { const b = e.target.closest('[data-bank]'); if (b) paying(t, 'СБП, ' + b.dataset.bank); };
  } else {
    openSheet(`<h2 id="sheetTitle">Оплата картой</h2><p class="sheet__lead">${T(`Данные карты вводятся на защищённой странице банка. Сумма ${rub(t.total)}.`)}</p>
      ${CAFE.testMode ? `<p class="test-note">${T('Тестовый режим: страница банка не откроется, оплата пройдёт сразу.')}</p>` : ''}
      <div class="buy"><button class="btn" type="button" data-paycard>Перейти к оплате<span class="btn__sum">${rub(t.total)}</span></button></div>`, {kind:'pay'});
    body.onclick = e => { if (e.target.closest('[data-paycard]')) paying(t, 'картой'); };
  }
}
function paying(t, how){
  openSheet(`<div class="spin" aria-hidden="true"></div><h2 id="sheetTitle" style="text-align:center;padding:0">Ждём подтверждение банка</h2>`, {kind:'pay'});
  setTimeout(() => placeOrder(t, how), 1300);
}
function placeOrder(t, how){
  const u = S.user;
  const coffeeCount = S.cart.filter(l => byId(l.id).coffee).reduce((a,l)=>a+l.qty,0);
  const subBought = S.cart.filter(l => l.id === SUB.id).reduce((a,l)=>a+l.qty,0);
  const giftUsed = t.disc.some(d => d[0].startsWith('Шестой'));
  const subUsed = t.disc.some(d => d[0].startsWith('Чашка'));
  u.points = (u.points||0) - t.pts + t.earn;
  let st = (u.stamps||0);
  if (giftUsed) st = Math.max(0, st - 5) + Math.max(0, coffeeCount - 1);
  else st += coffeeCount - (subUsed ? 1 : 0);
  u.stamps = Math.min(5, st);
  u.sub = (u.sub||0) - (subUsed?1:0) + subBought*20;
  const steps = {
    hall:[['Заказ принят','Бариста уже видит его'],['Готовим','Кофе, потом десерты'],['Несём к столику №'+S.table,'Минута-другая']],
    togo:[['Заказ принят','Бариста уже видит его'],['Готовим','Обычно 5–7 минут'],['Готово, ждёт на стойке','Назовите номер заказа']],
    car:[['Заказ принят','Бариста уже видит его'],['Готовим','Обычно 5–7 минут'],[`Выносим к машине ${S.plate} ${S.region}`,'Смотрите в сторону входа']],
    delivery:[['Заказ принят','Бариста уже видит его'],['Готовим','Кофе наливаем последним'],['Курьер в пути','Обычно 20–30 минут'],['Доставлено','Приятного аппетита']],
  }[S.mode];
  const mins = S.mode === 'delivery' ? 40 : 7;
  const order = {no: 100 + Math.floor(Math.random()*900), at: Date.now(), eta: Date.now() + mins*60e3, steps, mode:S.mode, total:t.total, how,
    items: S.cart.map(l => `${byId(l.id).name}${l.qty>1?' ×'+l.qty:''}`), demo: CAFE.testMode, when: S.when};
  u.orders.unshift({no:order.no, at:order.at, total:t.total, items:order.items, mode:S.mode});
  S.order = order; S.cart = []; S.useGift = S.useSub = S.usePoints = false;
  save(); render();
  vibrate([12,60,20]);
  openStatus(true);
}
function orderStage(o){
  // в тестовом режиме этапы идут быстро, чтобы было видно весь путь
  const per = o.demo ? 9e3 : (o.eta - o.at) / o.steps.length;
  const idx = Math.min(o.steps.length - 1, Math.floor((Date.now() - o.at) / per));
  return {idx};
}
let statusTimer;
function openStatus(justPaid){
  const o = S.order; if (!o) return;
  const draw = () => {
    const {idx} = orderStage(o);
    return `${justPaid ? `<div class="done"><svg viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="42"/><path d="m26 43 11 11 21-23"/></svg></div>` : ''}
      <h2 id="sheetTitle" ${justPaid?'style="text-align:center;padding:0"':''}>Заказ №${o.no}</h2>
      <p class="sheet__lead" ${justPaid?'style="text-align:center"':''}>${T(o.items.join(', '))}. ${rub(o.total)}, ${esc(o.how)}.</p>
      <ol class="steps">${o.steps.map((s,i) => `<li class="${i<idx?'is-done':i===idx?'is-now':''}"><div><b>${T(s[0])}</b><span>${T(s[1])}</span></div></li>`).join('')}</ol>
      <div class="buy"><button class="btn btn--ghost" type="button" data-closest>Хорошо</button></div>`;
  };
  openSheet(draw(), {kind:'status', onClose: () => clearInterval(statusTimer)});
  body.onclick = e => { if (e.target.closest('[data-closest]')) closeSheet(); };
  clearInterval(statusTimer);
  statusTimer = setInterval(() => {
    if (sheetKind !== 'status' || !sheetOpen) return clearInterval(statusTimer);
    justPaid = false; body.innerHTML = draw(); measure(); renderHome();
  }, 3000);
}
setInterval(() => { if (S.order && S.tab === 'home') { const top = views.home.scrollTop; renderHome(); views.home.scrollTop = top; } }, 10e3);

/* ---------- Вход по номеру ---------- */
function openAuth(after){
  const draw = () => `<h2 id="sheetTitle">Вход по номеру</h2>
    <p class="sheet__lead">${T('Пришлём код в СМС. Номер нужен, чтобы сообщить о готовности заказа и копить баллы.')}</p>
    <div class="field"><input class="input" id="fPhone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 900 000-00-00" value="+7 " autofocus></div>
    <div class="field"><input class="input" id="fName" autocomplete="given-name" placeholder="Как к вам обращаться"></div>
    <p class="hint" id="authHint">${T('Нажимая кнопку, вы соглашаетесь получать СМС о заказах.')}</p>
    <div class="buy"><button class="btn" type="button" data-sendcode>Получить код</button></div>`;
  openSheet(draw(), {kind:'auth'});
  const ph = $('#fPhone', body);
  ph.addEventListener('input', () => {
    let d = ph.value.replace(/\D/g,''); if (d.startsWith('8')) d = '7' + d.slice(1); if (!d.startsWith('7')) d = '7' + d; d = d.slice(0,11);
    const p = d.slice(1); let s = '+7';
    if (p.length) s += ' ' + p.slice(0,3); if (p.length > 3) s += ' ' + p.slice(3,6); if (p.length > 6) s += '-' + p.slice(6,8); if (p.length > 8) s += '-' + p.slice(8,10);
    ph.value = s;
  });
  body.onclick = e => {
    if (!e.target.closest('[data-sendcode]')) return;
    const digits = ph.value.replace(/\D/g,'');
    if (digits.length !== 11) { const h = $('#authHint', body); h.textContent = 'Номер из 10 цифр после +7.'; h.classList.add('err'); ph.focus(); vibrate([10,40,10]); return; }
    const name = $('#fName', body).value.trim().slice(0,30);
    codeStep(ph.value, name, after);
  };
}
function codeStep(phone, name, after){
  openSheet(`<h2 id="sheetTitle">Код из СМС</h2><p class="sheet__lead">${T(`Отправили на ${phone}.`)}</p>
    <div class="code">${[0,1,2,3].map(i => `<input inputmode="numeric" maxlength="1" aria-label="Цифра ${i+1}" ${i===0?'autofocus':''} autocomplete="${i===0?'one-time-code':'off'}">`).join('')}</div>
    ${CAFE.testMode ? `<p class="test-note" style="text-align:center">Тестовый режим: подойдёт любой код.</p>` : ''}`, {kind:'auth'});
  const ins = $$('.code input', body);
  ins.forEach((inp, i) => {
    inp.addEventListener('input', () => {
      const v = inp.value.replace(/\D/g,'');
      if (v.length > 1) { v.split('').slice(0,4).forEach((c,j) => ins[j] && (ins[j].value = c)); }
      else inp.value = v;
      if (inp.value && ins[i+1]) ins[i+1].focus();
      if (ins.every(x => x.value)) {
        S.user = {phone, name, points:0, stamps:0, sub:0, orders:[], code: 'LX' + Math.random().toString(36).slice(2,8).toUpperCase(), bday:''};
        save(); render(); vibrate(10);
        toast(name ? `${name}, добро пожаловать` : 'Вы вошли');
        if (after) after(); else closeSheet();
      }
    });
    inp.addEventListener('keydown', e => { if (e.key === 'Backspace' && !inp.value && ins[i-1]) ins[i-1].focus(); });
  });
}

/* ---------- Карта гостя, QR ---------- */
function drawQR(){
  const el = $('#qr'); if (!el || typeof qrcode === 'undefined') return;
  const q = qrcode(0, 'M'); q.addData(S.user?.code || 'LIKS-GUEST'); q.make();
  el.innerHTML = q.createSvgTag({cellSize:4, margin:0, scalable:true});
}
function flipCard(){
  if (!S.user) { openAuth(); return; }
  const c = $('#loyal'); c && c.classList.toggle('is-flipped'); vibrate(6);
}

/* ---------- Акция подробно ---------- */
function openPromo(id){
  const p = PROMOS.find(x => x.id === id); if (!p) return;
  let cta = '';
  if (p.dish) cta = `<button class="btn" type="button" data-pdish="${p.dish}">Выбрать завтрак</button>`;
  else if (p.sub) cta = `<button class="btn" type="button" data-psub>Добавить абонемент<span class="btn__sum">${rub(SUB.price)}</span></button>`;
  else if (p.mode) cta = `<button class="btn" type="button" data-pmode="${p.mode}">Заказать ${p.mode==='car'?'к машине':'с доставкой'}</button>`;
  else if (p.share) cta = `<button class="btn" type="button" data-pshare>Пригласить друга</button>`;
  else if (p.id === 'bday') cta = `<button class="btn" type="button" data-pbday>Указать дату</button>`;
  else cta = `<button class="btn" type="button" data-pmenu>Открыть меню</button>`;
  openSheet(`${p.img ? `<div class="sheet__img" style="--fo:${FOCUS[p.img]}"><img src="${IMG(p.img)}" alt=""></div>` : ''}
    <h2 id="sheetTitle">${T(p.t)}</h2><p class="sheet__lead">${T(p.more)}</p><div class="buy">${cta}</div>`, {kind:'promo'});
  body.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.pdish) { openDish(b.dataset.pdish); }
    else if (b.dataset.psub !== undefined) { addToCart(SUB.id, {}, 1); closeSheet(); toast('Абонемент в корзине'); }
    else if (b.dataset.pmode) { S.mode = b.dataset.pmode; save(); render(); closeSheet(); go('menu'); toast(`Режим: ${MODES[S.mode].name.toLowerCase()}`); }
    else if (b.dataset.pshare !== undefined) { invite(); }
    else if (b.dataset.pbday !== undefined) { S.user ? openBday() : openAuth(openBday); }
    else if (b.dataset.pmenu !== undefined) { closeSheet(); go('menu'); }
  };
}
async function invite(){
  if (!S.user) { openAuth(invite); return; }
  const url = `${location.origin}${location.pathname}?ref=${S.user.code}`;
  const text = 'Кофейня Ликс: по моей ссылке −20% на первый заказ';
  try {
    if (navigator.share) { await navigator.share({title:'Ликс', text, url}); closeSheet(); return; }
    await navigator.clipboard.writeText(`${text} ${url}`); closeSheet(); toast('Ссылка скопирована');
  } catch(e) { if (e.name !== 'AbortError') toast('Не получилось поделиться, попробуйте ещё раз'); }
}
function openBday(){
  openSheet(`<h2 id="sheetTitle">День рождения</h2><p class="sheet__lead">${T('Три дня до и три после десерт будет за наш счёт. Дату можно указать один раз.')}</p>
    <div class="field"><input class="input" id="fBday" type="date" value="${esc(S.user.bday||'')}" max="${new Date().toISOString().slice(0,10)}"></div>
    <div class="buy"><button class="btn" type="button" data-savebday ${S.user.bday?'disabled':''}>${S.user.bday ? 'Дата сохранена' : 'Сохранить'}</button></div>`, {kind:'bday'});
  body.onclick = e => {
    if (!e.target.closest('[data-savebday]')) return;
    const v = $('#fBday', body).value; if (!v) { toast('Выберите дату'); return; }
    S.user.bday = v; save(); render(); closeSheet(); toast('Дата сохранена');
  };
}
function openHistory(){
  const os = S.user?.orders || [];
  openSheet(`<h2 id="sheetTitle">Мои заказы</h2>
    ${os.length ? `<div class="list" style="margin:16px 0 0">${os.map(o => `<div class="hist"><b>№${o.no}</b><em>${rub(o.total)}</em><span>${T(o.items.join(', '))}</span><span style="text-align:right">${new Date(o.at).toLocaleDateString('ru-RU',{day:'numeric',month:'short'})}</span></div>`).join('')}</div>
      <div class="buy"><button class="btn btn--ghost" type="button" data-repeat>Повторить последний</button></div>`
    : `<div class="empty"><b>Заказов пока нет</b><p class="muted">${T('Первый заказ в приложении со скидкой 20%.')}</p></div><div class="buy"><button class="btn" type="button" data-tomenu2>Открыть меню</button></div>`}`, {kind:'hist'});
  body.onclick = e => {
    if (e.target.closest('[data-tomenu2]')) { closeSheet(); go('menu'); }
    if (e.target.closest('[data-repeat]')) {
      const last = os[0]; if (!last) return;
      last.items.forEach(s => { const [n, q] = s.split(' ×'); const m = [...MENU, SUB].find(x => x.name === n); if (m) addToCart(m.id, m.opts?.sizes ? {size:0} : {}, +(q||1)); });
      refreshCards(); openCart();
    }
  };
}
function showCardSheet(){
  openSheet(`<h2 id="sheetTitle">Карта для кассы</h2><p class="sheet__lead">${T('Покажите код бариста, баллы и отметки начислятся сами.')}</p>
    <div style="display:grid;place-items:center;margin-top:18px"><div class="qr" id="qr" style="width:220px;height:220px;padding:14px"></div><p class="small muted" style="margin-top:10px">${esc(S.user.code)}</p></div>`, {kind:'card'});
  drawQR();
}

/* ---------- Делегирование кликов ---------- */
document.addEventListener('click', e => {
  if (layer.contains(e.target)) return;
  const q = e.target.closest('[data-quick]');
  if (q) {
    e.stopPropagation();
    const m = byId(q.dataset.quick);
    if (m.opts && (m.opts.sizes || m.opts.dish)) { openDish(m.id); return; }
    addToCart(m.id, {}, 1); toast(`${m.name} в корзине`); q.classList.add('is-bump'); setTimeout(refreshCards, 300); return;
  }
  const d = e.target.closest('[data-dish]'); if (d) return openDish(d.dataset.dish);
  const g = e.target.closest('[data-go]'); if (g) return go(g.dataset.go);
  const md = e.target.closest('[data-mode]');
  if (md) {
    S.mode = md.dataset.mode; save(); vibrate(5);
    $$('.mode', views.home).forEach(b => { const on = b.dataset.mode === S.mode; b.classList.toggle('is-on', on); b.setAttribute('aria-checked', on); });
    $('#modeNote').innerHTML = T(MODES[S.mode].note);
    renderMenu(); return;
  }
  const cat = e.target.closest('[data-cat]');
  if (cat) { const s = $('#cat-' + cat.dataset.cat); views.menu.scrollTo({top: s.offsetTop - 120, behavior: motionOn() ? 'smooth' : 'auto'}); return; }
  const pr = e.target.closest('[data-promo]'); if (pr) return openPromo(pr.dataset.promo);
  if (e.target.closest('#loyal')) return flipCard();
  if (e.target.closest('#liveOrder')) return openStatus(false);
  if (e.target.closest('[data-auth]')) return openAuth();
  if (e.target.closest('[data-showcard]')) return showCardSheet();
  if (e.target.closest('[data-history]')) return openHistory();
  if (e.target.closest('[data-friend]')) return openPromo('friend');
  if (e.target.closest('[data-bday]')) return openBday();
  if (e.target.closest('[data-theme-cycle]')) { S.theme = {auto:'light', light:'dark', dark:'auto'}[S.theme]; save(); applyTheme(); renderProfile(); return; }
  if (e.target.closest('[data-logout]')) { S.user = null; S.order = null; save(); render(); toast('Вы вышли'); return; }
});
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && (e.target.id === 'loyal' || e.target.id === 'liveOrder')) { e.preventDefault(); e.target.click(); }
});

render();
const startTab = views[S.tab] ? S.tab : 'home'; S.tab = ''; go(startTab);
})();
