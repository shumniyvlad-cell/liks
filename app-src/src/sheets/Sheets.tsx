// Все листы снизу. Один state `sheet` в App называет открытый лист:
// смена листа в одном обновлении — мягкая передача от одного к другому (так советует Astryx),
// «Назад» телефона закрывает лист.

import {useEffect, useRef, useState, type ReactNode} from 'react';
import {BottomSheet} from '@astryxdesign/core/BottomSheet';
import {VStack} from '@astryxdesign/core/VStack';
import {HStack} from '@astryxdesign/core/HStack';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Switch} from '@astryxdesign/core/Switch';
import {TextInput} from '@astryxdesign/core/TextInput';
import {TextArea} from '@astryxdesign/core/TextArea';
import {DateInput} from '@astryxdesign/core/DateInput';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Art} from '../ui/brand';
import {artColor} from '../ui/parts';
import {byId, cafe, img, MODES, PROMOS, SUB, type Item, type ModeId, type Opt, type OptKey} from '../business';
import {
  addToCart, changeQty, cutlery, drinksInCart, get, giftReady, isOpen, optText, photoOf, placeOrder, plural, requestCode, rub, saveBday, set, signIn, validLine,
  stage, T, totals, unitPrice, useStore, vibrate, type Choice, type Pay,
} from '../store';
import {useUI, type Sheet} from '../ui/ctx';
import {CardIcon, CashIcon, SbpIcon} from '../ui/icons';
import {qrSvg} from '../ui/LoyaltyCard';

export function Sheets() {
  const {sheet, close} = useUI();
  const is = (k: Sheet['k']) => sheet?.k === k;
  const sh = (k: Sheet['k'], label: string, body: ReactNode, height: 'hug' | 'capped' | 'tall' = 'hug', purpose: 'info' | 'form' = 'info') => (
    <BottomSheet isOpen={is(k)} onOpenChange={(o) => !o && close()} label={label} height={height} purpose={purpose}>
      {is(k) && body}
    </BottomSheet>
  );
  return (
    <>
      {sh('dish', 'Блюдо', sheet?.k === 'dish' && <DishSheet key={sheet.id} id={sheet.id} />, 'tall')}
      {sh('cart', 'Корзина', <CartSheet />, 'tall')}
      {sh('auth', 'Вход по номеру', sheet?.k === 'auth' && <AuthSheet then={sheet.then ?? null} />, 'tall', 'form')}
      {sh('code', 'Код из СМС', sheet?.k === 'code' && <CodeSheet {...sheet} />, 'tall', 'form')}
      {sh('pay', 'Оплата', sheet?.k === 'pay' && <PaySheet via={sheet.via} />)}
      {sh('paying', 'Ждём банк', <PayingSheet />)}
      {sh('status', 'Статус заказа', <StatusSheet fresh={sheet?.k === 'status' && !!sheet.fresh} />)}
      {sh('promo', 'Акция', sheet?.k === 'promo' && <PromoSheet id={sheet.id} />)}
      {sh('bday', 'День рождения', <BdaySheet />)}
      {sh('history', 'Мои заказы', <HistorySheet />, 'capped')}
      {sh('qr', 'Карта для кассы', <QrSheet />)}
    </>
  );
}

/* ── общие кусочки ── */
function Foot({children}: {children: ReactNode}) {
  return <div className="sheet-foot">{children}</div>;
}
function Chips<K extends string>({label, value, items, onPick, price}: {label: string; value: number | undefined; items: Opt[]; onPick: (i: number) => void; price?: 'abs' | 'add'; k?: K}) {
  return (
    <VStack gap={2}>
      <Text weight="semibold">{label}</Text>
      <div className="chips" role="radiogroup" aria-label={label}>
        {items.map(([n, p], i) => (
          <button key={n} type="button" role="radio" aria-checked={value === i} className="chip" onClick={() => onPick(i)}>
            {n}
            {price === 'abs' ? <small>{rub(p)}</small> : p ? <small>+{rub(p)}</small> : null}
          </button>
        ))}
      </div>
    </VStack>
  );
}
function Stepper({value, min, max, onChange, label, small}: {value: number; min: number; max: number; onChange: (v: number) => void; label: string; small?: boolean}) {
  return (
    <span className={`stepper${small ? ' stepper--sm' : ''}`} role="group" aria-label={label}>
      <button type="button" disabled={value <= min} aria-label="Меньше" onClick={() => onChange(value - 1)}>
        −
      </button>
      <output aria-live="polite">{value}</output>
      <button type="button" disabled={value >= max} aria-label="Больше" onClick={() => onChange(value + 1)}>
        +
      </button>
    </span>
  );
}

/* ── блюдо ── */
const GROUPS: [OptKey, string][] = [['size', 'Объём'], ['dish', 'Завтрак'], ['drink', 'Напиток'], ['milk', 'Молоко'], ['syrup', 'Сироп'], ['sugar', 'Сахар'], ['temp', 'Температура']];

function DishSheet({id}: {id: string}) {
  const m: Item = byId(id);
  const {close, toast} = useUI();
  const [o, setO] = useState<Choice>(() => Object.fromEntries(GROUPS.filter(([k]) => m.opts?.[k]).map(([k]) => [k, 0])) as Choice);
  const [qty, setQty] = useState(1);
  const photo = photoOf(m, o);

  const add = () => {
    const clean: Choice = {};
    for (const [k] of GROUPS) {
      if (!m.opts?.[k]) continue;
      if (k === 'size' || k === 'dish' || k === 'drink' || o[k]) clean[k] = o[k];
    }
    if (o.shot) clean.shot = true;
    if (o.warm) clean.warm = true;
    addToCart(m.id, clean, qty);
    close();
    toast(`${m.name} в корзине`);
  };

  return (
    <VStack gap={5}>
      <div className="sheet-photo">
        <img key={photo} className="is-swap" src={img(photo)} alt={m.name} width={612} height={760} />
      </div>
      <VStack gap={1}>
        <Heading level={2}>{T(m.name)}</Heading>
        <Text color="secondary">{T(m.desc)}</Text>
      </VStack>
      {GROUPS.map(([k, label]) => {
        const items = m.opts?.[k];
        if (!items) return null;
        const title = k === 'sugar' && m.id.startsWith('tea') ? 'Сладость' : label;
        return (
          <VStack key={k} gap={2}>
            {k === 'drink' && (
              <Heading level={3}>
                Кофе к завтраку
              </Heading>
            )}
            <Chips label={title} value={o[k]} items={items} price={k === 'size' ? 'abs' : 'add'} onPick={(i) => setO({...o, [k]: i})} />
          </VStack>
        );
      })}
      {m.opts?.shot && <Switch label="Ещё эспрессо" description="Покрепче, +60 ₽" labelPosition="start" labelSpacing="spread" value={!!o.shot} onChange={(v) => setO({...o, shot: v})} />}
      {m.opts?.warm && <Switch label="Подогреть" description="Бесплатно" labelPosition="start" labelSpacing="spread" value={!!o.warm} onChange={(v) => setO({...o, warm: v})} />}
      <Foot>
        <HStack gap={3} vAlign="center">
          <Stepper value={qty} min={1} max={20} onChange={setQty} label="Количество" />
          <Button label={`Добавить за ${rub(unitPrice(m, o) * qty)}`} variant="primary" size="lg" width="100%" onClick={add} />
        </HStack>
      </Foot>
    </VStack>
  );
}

/* ── корзина ── */
const LETTERS: Record<string, string> = {A: 'А', B: 'В', E: 'Е', K: 'К', M: 'М', H: 'Н', O: 'О', P: 'Р', C: 'С', T: 'Т', Y: 'У', X: 'Х'};
type Err = {field: 'table' | 'plate' | 'region' | 'address'; msg: string} | null;

function validate(): Err {
  const s = get();
  if (s.mode === 'hall' && !s.table.trim()) return {field: 'table', msg: 'Впишите номер столика.'};
  if (s.mode === 'car' && !/^[АВЕКМНОРСТУХ]\d{3}[АВЕКМНОРСТУХ]{2}$/.test(s.plate)) return {field: 'plate', msg: 'Номер в формате А123ВС, чтобы бариста нашёл машину.'};
  if (s.mode === 'car' && !/^\d{2,3}$/.test(s.region)) return {field: 'region', msg: 'Регион: две или три цифры.'};
  if (s.mode === 'delivery' && s.address.trim().length < 5) return {field: 'address', msg: 'Впишите улицу и дом.'};
  return null;
}

function slots() {
  const out: string[] = [];
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(Math.ceil((d.getMinutes() + 20) / 15) * 15);
  for (let i = 0; i < 6; i++) {
    const t = new Date(d.getTime() + i * 15 * 60e3);
    if (t.getHours() + t.getMinutes() / 60 <= cafe.close - 0.25 && t.getHours() >= cafe.open) out.push(t.toTimeString().slice(0, 5));
  }
  return out;
}

function CartSheet() {
  const s = useStore();
  const {open, close, go, toast} = useUI();
  const [err, setErr] = useState<Err>(null);
  const [sending, setSending] = useState(false);
  const plateRef = useRef<HTMLInputElement>(null);
  const regionRef = useRef<HTMLInputElement>(null);
  const errBox = useRef<HTMLDivElement>(null);
  const t = totals(s), u = s.user;
  const away = s.mode !== 'hall';
  const drinks = drinksInCart(s), n = cutlery(s);
  const payOff = s.mode === 'delivery' || s.mode === 'car';
  const pay: Pay = payOff && s.pay === 'cash' ? 'sbp' : s.pay;

  useEffect(() => {
    if (!err) return;
    const el = err.field === 'plate' ? plateRef.current : err.field === 'region' ? regionRef.current : errBox.current?.querySelector('input');
    el?.focus();
  }, [err]);

  if (!s.cart.length)
    return (
      <EmptyState
        icon={<Art name="togo" className="empty-art" />}
        title="Пока пусто"
        description="Начните с капучино или загляните в завтраки."
        actions={<Button label="Открыть меню" variant="primary" onClick={() => go('menu')} />}
      />
    );

  const checkout = () => {
    if (!u) return open({k: 'auth', then: {k: 'cart'}});
    const bad = validate();
    if (bad) {
      setErr(bad);
      vibrate([10, 40, 10]);
      return;
    }
    if (pay === 'cash') {
      setSending(true);
      placeOrder('на кассе')
        .then(() => open({k: 'status', fresh: true}))
        .catch((e: Error) => toast(e.message))
        .finally(() => setSending(false));
      return;
    }
    open({k: 'pay', via: pay});
  };
  const canGift = !!u && giftReady(u) && s.cart.some((l) => byId(l.id).coffee);
  const canSub = !!u && u.sub > 0 && s.cart.some((l) => ['cappuccino', 'latte'].includes(l.id));
  const fieldErr = (f: NonNullable<Err>['field']) => (err?.field === f ? {type: 'error' as const, message: err.msg} : undefined);

  return (
    <VStack gap={5}>
      <Heading level={2}>Ваш заказ</Heading>
      <div className="chips chips--scroll" role="radiogroup" aria-label="Как забрать">
        {(Object.keys(MODES) as ModeId[]).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={s.mode === k} className="chip" onClick={() => (setErr(null), set({mode: k, when: 'asap'}))}>
            {MODES[k].name}
          </button>
        ))}
      </div>

      <VStack gap={3}>
        {s.cart.map((l) => {
          const m = byId(l.id), ot = optText(m, l.o);
          return (
            <div className="line" key={l.key}>
              <img src={img(photoOf(m, l.o))} alt="" width={112} height={112} />
              <span className="line__t">
                <b>{T(m.name)}</b>
                <span>
                  {ot ? `${ot}, ` : ''}
                  {rub(l.price)}
                </span>
              </span>
              <Stepper small value={l.qty} min={0} max={20} label={`Количество: ${m.name}`} onChange={(v) => changeQty(l.key, v - l.qty)} />
            </div>
          );
        })}
      </VStack>

      <div ref={errBox}>
        {s.mode === 'hall' && (
          <TextInput label="Номер столика" description="Написан на табличке на столе." inputMode="numeric" value={s.table} width={200}
            status={fieldErr('table')} onChange={(v) => (setErr(null), set({table: v.replace(/\D/g, '').slice(0, 3)}))} />
        )}
        {s.mode === 'car' && (
          <VStack gap={2}>
            <Text weight="semibold">Номер машины</Text>
            <div className={`plate${err?.field === 'plate' || err?.field === 'region' ? ' is-bad' : ''}`}>
              <input ref={plateRef} className="plate__num" maxLength={6} placeholder="А123ВС" value={s.plate} aria-label="Номер машины" autoCapitalize="characters" autoComplete="off" spellCheck={false}
                aria-invalid={err?.field === 'plate'}
                onChange={(e) => (setErr(null), set({plate: e.target.value.toUpperCase().split('').map((c) => LETTERS[c] ?? c).join('').replace(/[^АВЕКМНОРСТУХ0-9]/g, '')}))} />
              <span className="plate__reg">
                <input ref={regionRef} maxLength={3} inputMode="numeric" value={s.region} aria-label="Регион" aria-invalid={err?.field === 'region'}
                  onChange={(e) => (setErr(null), set({region: e.target.value.replace(/\D/g, '')}))} />
                <span className="plate__rus">RUS<i /></span>
              </span>
            </div>
            {err?.field === 'plate' || err?.field === 'region' ? (
              <span className="field-err" role="alert">{err.msg}</span>
            ) : (
              <Text color="secondary" size="sm">Вынесем к машине на парковке у входа.</Text>
            )}
          </VStack>
        )}
        {s.mode === 'delivery' && (
          <VStack gap={2}>
            <TextInput label="Адрес" placeholder="Улица, дом…" autoComplete="street-address" value={s.address} status={fieldErr('address')}
              onChange={(v) => (setErr(null), set({address: v}))} />
            <TextInput label="Квартира, подъезд, этаж" isOptional value={s.flat} onChange={(v) => set({flat: v})} />
            <Text color="secondary" size="sm">{T(`Радиус ${cafe.deliveryRadius}, привезём за 35–45 минут.`)}</Text>
          </VStack>
        )}
      </div>

      {(s.mode === 'togo' || s.mode === 'car') && (
        <VStack gap={2}>
          <Text weight="semibold">Когда</Text>
          <div className="chips chips--scroll" role="radiogroup" aria-label="Когда">
            <button type="button" role="radio" className="chip" aria-checked={s.when === 'asap'} onClick={() => set({when: 'asap'})}>
              Как можно скорее<small>около 7 минут</small>
            </button>
            {slots().map((x) => (
              <button key={x} type="button" role="radio" className="chip" aria-checked={s.when === x} onClick={() => set({when: x})}>
                К {x}
                <small>{s.mode === 'car' ? 'подъеду' : 'заберу'}</small>
              </button>
            ))}
          </div>
        </VStack>
      )}

      <VStack gap={3}>
        <Text weight="semibold">К заказу</Text>
        <HStack justify="between" vAlign="center" gap={3}>
          <VStack gap={0}>
            <Text>Приборы</Text>
            <Text color="secondary" size="sm">{n ? `на ${n} ${plural(n, 'персону', 'персоны', 'персон')}` : 'не нужны'}</Text>
          </VStack>
          <Stepper small value={n} min={0} max={10} label="Приборы" onChange={(v) => set({cutlery: v})} />
        </HStack>
        <Switch label="Салфетки" description="Положим по паре на персону" labelPosition="start" labelSpacing="spread" value={s.napkins} onChange={(v) => set({napkins: v})} />
        {away && drinks >= 2 && (
          <Switch label="Подставка для стаканов" description={`Удобно нести ${drinks} ${plural(drinks, 'напиток', 'напитка', 'напитков')}`} labelPosition="start" labelSpacing="spread" value={s.carrier} onChange={(v) => set({carrier: v})} />
        )}
        {away && drinks > 0 && (
          <Switch label="Сахар и палочки с собой" description="Положим в пакет отдельно" labelPosition="start" labelSpacing="spread" value={s.sticks} onChange={(v) => set({sticks: v})} />
        )}
        <TextArea label="Комментарий бариста" isLabelHidden rows={2} maxLength={200} placeholder="Имя на стакане, без корицы…" value={s.comment} onChange={(v) => set({comment: v})} />
      </VStack>

      {(canGift || canSub || (u && u.points > 0)) && (
        <VStack gap={3}>
          {canGift && <Switch label="Шестой кофе от нас" description="Самый недорогой кофе в заказе бесплатно" labelPosition="start" labelSpacing="spread" value={s.useGift} onChange={(v) => set({useGift: v, useSub: v ? false : s.useSub})} />}
          {canSub && !s.useGift && <Switch label="Списать с абонемента" description={`Осталось ${u!.sub} ${plural(u!.sub, 'чашка', 'чашки', 'чашек')}`} labelPosition="start" labelSpacing="spread" value={s.useSub} onChange={(v) => set({useSub: v})} />}
          {u && u.points > 0 && <Switch label="Оплатить баллами" description={T(`Можно до ${rub(Math.min(u.points, t.maxPts))}, у вас ${u.points}`)} labelPosition="start" labelSpacing="spread" value={s.usePoints} onChange={(v) => set({usePoints: v})} />}
        </VStack>
      )}

      <VStack gap={2}>
        <Text weight="semibold">Оплата</Text>
        <div className="pay" role="radiogroup" aria-label="Оплата">
          <button type="button" role="radio" className="chip" aria-checked={pay === 'sbp'} onClick={() => set({pay: 'sbp'})}>
            <SbpIcon />
            <span>СБП<small>через приложение банка</small></span>
          </button>
          <button type="button" role="radio" className="chip" aria-checked={pay === 'card'} onClick={() => set({pay: 'card'})}>
            <CardIcon />
            <span>Картой онлайн<small>Мир, Visa, Mastercard</small></span>
          </button>
          {!payOff && (
            <button type="button" role="radio" className="chip" aria-checked={pay === 'cash'} onClick={() => set({pay: 'cash'})}>
              <CashIcon />
              <span>При получении<small>картой или наличными на кассе</small></span>
            </button>
          )}
        </div>
      </VStack>

      <div className="sum">
        <div className="sum__row"><span>Товары</span><span>{rub(t.sub)}</span></div>
        {t.disc.map(([nm, v]) => (
          <div className="sum__row is-disc" key={nm}><span>{T(nm)}</span><span>−{rub(v)}</span></div>
        ))}
        {s.mode === 'delivery' && <div className="sum__row"><span>Доставка</span><span>{t.fee ? rub(t.fee) : 'бесплатно'}</span></div>}
        {t.pts > 0 && <div className="sum__row is-disc"><span>Баллами</span><span>−{rub(t.pts)}</span></div>}
        <div className="sum__row is-total"><span>Итого</span><span>{rub(t.total)}</span></div>
      </div>
      <VStack gap={2}>
        {s.mode === 'delivery' && t.fee > 0 && <Text color="secondary" size="sm">{T(`Добавьте ещё на ${rub(cafe.deliveryFreeFrom - t.after)}, и доставка станет бесплатной.`)}</Text>}
        <Text color="secondary" size="sm">
          {u ? T(`Вернётся ${t.earn} ${plural(t.earn, 'балл', 'балла', 'баллов')} после заказа.`) : T('Скидка 20% применится после входа по номеру. Дальше с каждого заказа будут копиться баллы.')}
        </Text>
        {!isOpen() && <Text color="secondary" size="sm">{T(`Сейчас закрыто, заказ приготовим к ${cafe.open}:00.`)}</Text>}
        {cafe.testMode && <span className="test-note">Тестовый режим: деньги не списываются.</span>}
      </VStack>
      <Foot>
        <Button
          label={`${u ? (pay === 'cash' ? 'Отправить заказ' : 'Оплатить') : 'Войти и оформить'} ${rub(t.total)}`}
          variant="primary" size="lg" width="100%" isLoading={sending} onClick={checkout}
        />
      </Foot>
      <Button label="Добавить ещё" variant="ghost" width="100%" onClick={() => (close(), go('menu'))} />
    </VStack>
  );
}

/* ── вход ── */
const mask = (raw: string) => {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('8')) d = '7' + d.slice(1);
  if (!d.startsWith('7')) d = '7' + d;
  const p = d.slice(1, 11);
  let s = '+7';
  if (p.length) s += ' ' + p.slice(0, 3);
  if (p.length > 3) s += ' ' + p.slice(3, 6);
  if (p.length > 6) s += '-' + p.slice(6, 8);
  if (p.length > 8) s += '-' + p.slice(8, 10);
  return s;
};

function AuthSheet({then}: {then: Sheet | null}) {
  const {open} = useUI();
  const [phone, setPhone] = useState('+7 ');
  const [name, setName] = useState('');
  const [bad, setBad] = useState<string | false>(false);
  const [busy, setBusy] = useState(false);
  const send = () => {
    if (busy) return;
    if (phone.replace(/\D/g, '').length !== 11) {
      setBad('Номер из 10 цифр после +7.');
      vibrate([10, 40, 10]);
      return;
    }
    setBusy(true);
    requestCode(phone)
      .then(() => open({k: 'code', phone, name: name.trim().slice(0, 30), then}))
      .catch((e: Error) => setBad(e.message))
      .finally(() => setBusy(false));
  };
  return (
    <VStack gap={4}>
      <VStack gap={1}>
        <Heading level={2}>Вход по номеру</Heading>
        <Text color="secondary">{T('Пришлём код в СМС. Номер нужен, чтобы сообщить о готовности заказа и копить баллы.')}</Text>
      </VStack>
      <TextInput label="Телефон" type="tel" autoComplete="tel" hasAutoFocus value={phone} onEnter={send}
        status={bad ? {type: 'error', message: bad} : undefined}
        onChange={(v) => (setBad(false), setPhone(mask(v)))} />
      <TextInput label="Как к вам обращаться" autoComplete="given-name" isOptional value={name} onChange={setName} onEnter={send} />
      <Text color="secondary" size="sm">{T('Нажимая кнопку, вы соглашаетесь получать СМС о заказах.')}</Text>
      <Foot>
        <Button label="Получить код" variant="primary" size="lg" width="100%" isLoading={busy} onClick={send} />
      </Foot>
    </VStack>
  );
}

function CodeSheet({phone, name, then}: {phone: string; name: string; then?: Sheet | null}) {
  const {open, close, toast} = useUI();
  const [v, setV] = useState(['', '', '', '']);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const ins = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => {
    const t = setTimeout(() => ins.current[0]?.focus(), 350);
    return () => clearTimeout(t);
  }, []);
  const put = (i: number, raw: string) => {
    const d = raw.replace(/\D/g, '');
    const next = [...v];
    if (d.length > 1) d.slice(0, 4).split('').forEach((c, j) => (next[j] = c));
    else next[i] = d;
    setV(next);
    if (d && ins.current[i + 1] && d.length === 1) ins.current[i + 1]!.focus();
    if (d) setErr('');
    if (next.every(Boolean) && !busy) {
      setBusy(true);
      signIn(phone, name, next.join(''))
        .then(() => {
          vibrate(10);
          toast(name ? `${name}, добро пожаловать` : 'Вы вошли');
          if (then) open(then);
          else close();
        })
        .catch((e: Error) => {
          setErr(e.message);
          setV(['', '', '', '']);
          vibrate([10, 40, 10]);
          setTimeout(() => ins.current[0]?.focus(), 30);
        })
        .finally(() => setBusy(false));
    }
  };
  return (
    <VStack gap={4}>
      <VStack gap={1}>
        <Heading level={2}>Код из СМС</Heading>
        <Text color="secondary">Отправили на {phone}.</Text>
      </VStack>
      <div className="code">
        {v.map((c, i) => (
          <input key={i} ref={(el) => void (ins.current[i] = el)} inputMode="numeric" maxLength={4} aria-label={`Цифра ${i + 1}`} value={c}
            autoComplete={i === 0 ? 'one-time-code' : 'off'} onChange={(e) => put(i, e.target.value)}
            onKeyDown={(e) => e.key === 'Backspace' && !c && ins.current[i - 1]?.focus()} />
        ))}
      </div>
      {err && <span className="field-err" role="alert">{err}</span>}
      {cafe.testMode && <span className="test-note">Тестовый режим: подойдёт любой код.</span>}
      <Button label="Изменить номер" variant="ghost" onClick={() => open({k: 'auth', then})} />
    </VStack>
  );
}

/* ── оплата ── */
const BANKS: [string, string][] = [['Сбербанк', '#21A038'], ['Т-Банк', '#FFDD2D'], ['ВТБ', '#0A2896'], ['Альфа-Банк', '#EF3124']];

function PaySheet({via}: {via: 'sbp' | 'card'}) {
  const s = useStore();
  const {open} = useUI();
  const total = totals(s).total;
  const go = (how: string) => {
    set({pay: via});
    sessionStorage.setItem('liks:how', how);
    open({k: 'paying'});
  };
  if (via === 'sbp')
    return (
      <VStack gap={4}>
        <VStack gap={1}>
          <Heading level={2}>Оплата по СБП</Heading>
          <Text color="secondary">{T(`Выберите банк, в нём откроется перевод на ${rub(total)}.`)}</Text>
        </VStack>
        <div className="banks">
          {BANKS.map(([n, c]) => (
            <button key={n} type="button" className="bank" style={{['--c' as string]: c}} onClick={() => go(`СБП, ${n}`)}>
              <i aria-hidden="true" />
              {n}
            </button>
          ))}
        </div>
        {cafe.testMode && <span className="test-note">{T('Тестовый режим: банк не откроется, оплата пройдёт сразу.')}</span>}
      </VStack>
    );
  return (
    <VStack gap={4}>
      <VStack gap={1}>
        <Heading level={2}>Оплата картой</Heading>
        <Text color="secondary">{T(`Данные карты вводятся на защищённой странице банка. Сумма ${rub(total)}.`)}</Text>
      </VStack>
      {cafe.testMode && <span className="test-note">{T('Тестовый режим: страница банка не откроется, оплата пройдёт сразу.')}</span>}
      <Button label={`Перейти к оплате ${rub(total)}`} variant="primary" size="lg" width="100%" onClick={() => go('картой')} />
    </VStack>
  );
}

function PayingSheet() {
  const {open, toast} = useUI();
  useEffect(() => {
    let live = true;
    const t = setTimeout(() => {
      placeOrder(sessionStorage.getItem('liks:how') ?? 'онлайн')
        .then(() => live && open({k: 'status', fresh: true}))
        .catch((e: Error) => {
          if (!live) return;
          toast(e.message);
          open({k: 'cart'});
        });
    }, 1300);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [open, toast]);
  return (
    <VStack gap={2} paddingBlock={4}>
      <div className="spin" aria-hidden="true" />
      <Heading level={2} justify="center">Ждём подтверждение банка</Heading>
    </VStack>
  );
}

function StatusSheet({fresh}: {fresh: boolean}) {
  const {order} = useStore();
  const {close} = useUI();
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 2000);
    return () => clearInterval(t);
  }, []);
  if (!order) return null;
  const i = stage(order);
  return (
    <VStack gap={4}>
      {fresh && (
        <svg className="done-mark" viewBox="0 0 84 84" aria-hidden="true">
          <circle cx="42" cy="42" r="42" />
          <path d="m26 43 11 11 21-23" />
        </svg>
      )}
      <VStack gap={1}>
        <Heading level={2} justify={fresh ? 'center' : 'start'}>Заказ №{order.no}</Heading>
        <Text color="secondary" justify={fresh ? 'center' : 'start'} display="block">
          {T(`${order.items.join(', ')}. ${rub(order.total)}, ${order.how}.`)}
        </Text>
        {order.extras && <Text color="secondary" size="sm" justify={fresh ? 'center' : 'start'} display="block">{T(order.extras[0].toUpperCase() + order.extras.slice(1))}.</Text>}
        {order.comment && <Text color="secondary" size="sm" justify={fresh ? 'center' : 'start'} display="block">«{order.comment}»</Text>}
      </VStack>
      <ol className="steps" aria-live="polite">
        {order.steps.map(([a, b], j) => (
          <li key={a} className={j < i ? 'is-done' : j === i ? 'is-now' : ''} aria-current={j === i ? 'step' : undefined}>
            <span>
              <b>{T(a)}</b>
              <span>{T(b)}</span>
            </span>
          </li>
        ))}
      </ol>
      <Button label="Хорошо" variant="secondary" size="lg" width="100%" onClick={close} />
    </VStack>
  );
}

/* ── акция, день рождения, история, карта ── */
function PromoSheet({id}: {id: string}) {
  const p = PROMOS.find((x) => x.id === id)!;
  const {open, close, go, toast} = useUI();
  const {user} = useStore();
  const act = async () => {
    const a = p.action;
    if (a.kind === 'dish') return open({k: 'dish', id: a.id});
    if (a.kind === 'sub') {
      addToCart(SUB.id, {});
      close();
      return toast('Абонемент в корзине');
    }
    if (a.kind === 'mode') {
      set({mode: a.mode, when: 'asap'});
      toast(`Как забрать: ${MODES[a.mode].name.toLowerCase()}`);
      return go('menu');
    }
    if (a.kind === 'bday') return open(user ? {k: 'bday'} : {k: 'auth', then: {k: 'bday'}});
    if (a.kind === 'invite') {
      if (!user) return open({k: 'auth', then: {k: 'promo', id}});
      const url = `${location.origin}${location.pathname}?ref=${user.code}`;
      const text = 'Кофейня Ликс: по моей ссылке −20% на первый заказ';
      try {
        if (navigator.share) await navigator.share({title: 'Ликс', text, url});
        else {
          await navigator.clipboard.writeText(`${text} ${url}`);
          toast('Ссылка скопирована');
        }
        close();
      } catch (e) {
        if ((e as Error).name !== 'AbortError') toast('Не получилось поделиться, попробуйте ещё раз');
      }
      return;
    }
    go('menu');
  };
  return (
    <VStack gap={4}>
      <div className={`sheet-art tile--${p.tone}`}>
        <Art name={p.art} style={{color: artColor(p)}} />
      </div>
      <VStack gap={1}>
        <span className="tile__kick" style={{color: p.tone === 'berry' ? 'var(--berry-text)' : 'var(--brand)'}}>{T(p.kick)}</span>
        <Heading level={2}>{T(p.title)}</Heading>
        <Text color="secondary">{T(p.more)}</Text>
      </VStack>
      <Button label={p.action.kind === 'sub' ? `${p.cta} за ${rub(SUB.price)}` : p.cta} variant="primary" size="lg" width="100%" onClick={act} />
    </VStack>
  );
}

function BdaySheet() {
  const {user} = useStore();
  const {close, toast} = useUI();
  const [v, setV] = useState<string | undefined>(user?.bday || undefined);
  if (!user) return null;
  return (
    <VStack gap={4}>
      <VStack gap={1}>
        <Heading level={2}>День рождения</Heading>
        <Text color="secondary">{T('Три дня до и три после капучино будет за наш счёт. Дату можно указать один раз.')}</Text>
      </VStack>
      <DateInput label="Дата рождения" value={v as never} max={new Date().toISOString().slice(0, 10) as never} placeholder="ДД.ММ.ГГГГ" onChange={(x) => setV(x)} />
      <Button
        label={user.bday ? 'Дата сохранена' : 'Сохранить'}
        isDisabled={!!user.bday || !v}
        variant="primary" size="lg" width="100%"
        onClick={() =>
          saveBday(v!)
            .then(() => {
              close();
              toast('Дата сохранена');
            })
            .catch((e: Error) => toast(e.message))
        }
      />
    </VStack>
  );
}

function HistorySheet() {
  const {user} = useStore();
  const {open, go, toast} = useUI();
  const os = user?.orders ?? [];
  if (!os.length)
    return (
      <EmptyState icon={<Art name="steam" className="empty-art" />} title="Заказов пока нет" description="Первый заказ в приложении со скидкой 20%." actions={<Button label="Открыть меню" variant="primary" onClick={() => go('menu')} />} />
    );
  return (
    <VStack gap={4}>
      <Heading level={2}>Мои заказы</Heading>
      <VStack gap={3}>
        {os.map((o) => (
          <HStack key={o.no + '-' + o.at} justify="between" vAlign="start" gap={3}>
            <VStack gap={0}>
              <Text weight="semibold">№{o.no}, {rub(o.total)}</Text>
              <Text color="secondary" size="sm">{T(o.items.join(', '))}</Text>
            </VStack>
            <Text color="secondary" size="sm">{new Date(o.at).toLocaleDateString('ru-RU', {day: 'numeric', month: 'short'})}</Text>
          </HStack>
        ))}
      </VStack>
      <Button
        label="Повторить последний" variant="secondary" size="lg" width="100%"
        onClick={() => {
          const ok = os[0].lines.filter((l) => validLine(l.id, l.o));
          if (!ok.length) return toast('Этих блюд больше нет в меню');
          ok.forEach((l) => addToCart(l.id, l.o, l.qty));
          toast('Прошлый заказ в корзине');
          open({k: 'cart'});
        }}
      />
    </VStack>
  );
}

function QrSheet() {
  const {user} = useStore();
  if (!user) return null;
  return (
    <VStack gap={3} hAlign="center">
      <Heading level={2}>Карта для кассы</Heading>
      <Text color="secondary" justify="center">{T('Покажите код бариста, баллы и чашки начислятся сами.')}</Text>
      <span className="qr qr--big" dangerouslySetInnerHTML={{__html: qrSvg(user.code)}} />
      <Text color="secondary" size="sm">{user.code}</Text>
    </VStack>
  );
}
