// Чеки и смены из кассы: список, чек целиком (что продали, по какой цене), смена с её чеками.
import {useCallback, useEffect, useState} from 'react';
import {VStack} from '@astryxdesign/core/VStack';
import {HStack} from '@astryxdesign/core/HStack';
import {Card} from '@astryxdesign/core/Card';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Badge} from '@astryxdesign/core/Badge';
import {Skeleton} from '@astryxdesign/core/Skeleton';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Drawer} from '@astryxdesign/core/Drawer';
import {TextInput} from '@astryxdesign/core/TextInput';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {adm, int, rub, type AdminError} from './api';

export type Line = {name: string; qty: number; unit: string; price?: number; discount?: number; gift?: boolean};
export type Check = {id: string; at: string; number: string; method: string; kind: string; sum: number; discount: number; cashier: string; lines: Line[]};
export type Shift = {id: string; no: string; opened: string | null; closed: string | null; cashier: string; openAmount: number; cash: number; card: number;
  refunds: number; cashIn: number; collections: number; drawer: number; total: number; checks: number; opsChecks: number};

const tz = {timeZone: 'Europe/Moscow'} as const;
export const time = (s: string) => new Date(s).toLocaleTimeString('ru-RU', {...tz, hour: '2-digit', minute: '2-digit'});
export const dayLong = (s: string) => new Date(s).toLocaleDateString('ru-RU', {...tz, weekday: 'long', day: 'numeric', month: 'long'});
export const dayShort = (s: string) => new Date(s).toLocaleDateString('ru-RU', {...tz, day: 'numeric', month: 'short'});
const ymd = (d: Date) => new Intl.DateTimeFormat('en-CA', tz).format(d);
const METHOD: Record<string, string> = {Cash: 'Наличные', Card: 'Карта', Sbp: 'СБП'};
const method = (m: string) => METHOD[m] ?? m;
const qtyText = (l: Line) => (l.unit === 'шт' ? `${int(l.qty)} шт` : `${new Intl.NumberFormat('ru-RU', {maximumFractionDigits: 3}).format(l.qty)} ${l.unit}`);
const linesShort = (c: Check) => c.lines.map((l) => (l.unit === 'шт' && l.qty > 1 ? `${l.name} ×${int(l.qty)}` : l.name)).join(', ');
function dur(a: string, b: string | null) {
  const m = Math.round(((b ? Date.parse(b) : Date.now()) - Date.parse(a)) / 60e3);
  return m < 60 ? `${m} мин` : `${Math.floor(m / 60)} ч ${m % 60} мин`;
}

/** Чек целиком. */
export function CheckView({c}: {c: Check}) {
  const refund = c.kind !== 'Payment';
  return (
    <VStack gap={4}>
      <VStack gap={1}>
        <HStack gap={2} align="center" wrap="wrap">
          <Heading level={2}>{refund ? 'Возврат' : 'Чек'} на {rub(c.sum)}</Heading>
          <Badge variant={refund ? 'error' : 'neutral'} label={method(c.method)} />
        </HStack>
        <Text color="secondary">
          {dayLong(c.at)}, {time(c.at)}. Кассир {(c.cashier || 'не указан').replace(/\.$/, '')}.{c.number ? ` Документ № ${c.number}.` : ''}
        </Text>
      </VStack>
      <ul className="adm-check">
        {c.lines.map((l, i) => {
          const has = l.price != null;
          const total = has ? l.price! * l.qty - (l.discount ?? 0) : null;
          return (
            <li key={i}>
              <span>
                <b>{l.name}</b>
                <small>{qtyText(l)}{has && l.unit === 'шт' ? ` по ${rub(l.price!)}` : ''}{l.discount ? `, скидка ${rub(l.discount)}` : ''}{l.gift ? ', подарок' : ''}</small>
              </span>
              <b>{total != null ? rub(total) : ''}</b>
            </li>
          );
        })}
      </ul>
      {c.discount > 0 && <Text color="secondary">Скидка по чеку {rub(c.discount)}</Text>}
      <HStack justify="between" className="adm-check__total">
        <b>Итого</b>
        <b>{rub(c.sum)}</b>
      </HStack>
      {c.lines.some((l) => l.price == null) && <Text size="sm" color="secondary">Цены строк ещё догружаются из кассы, обновите через пару минут.</Text>}
    </VStack>
  );
}

function CheckRows({checks, open}: {checks: Check[]; open: (c: Check) => void}) {
  return (
    <ul className="adm-rows">
      {checks.map((c) => (
        <li key={c.id}>
          <button type="button" className="adm-crow" onClick={() => open(c)}>
            <span className="adm-crow__time">{time(c.at)}</span>
            <span className="adm-row__t">
              <b>{linesShort(c) || 'Без позиций'}</b>
              <small>{method(c.method)}{c.kind !== 'Payment' ? ', возврат' : ''}{c.cashier ? `, ${c.cashier}` : ''}</small>
            </span>
            <span className={'adm-row__p' + (c.kind !== 'Payment' ? ' adm-neg' : '')}>{c.kind !== 'Payment' ? '−' : ''}{rub(c.sum)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function byDay(checks: Check[]) {
  const m = new Map<string, Check[]>();
  for (const c of checks) {
    const d = ymd(new Date(c.at));
    m.set(d, [...(m.get(d) ?? []), c]);
  }
  return [...m];
}

type Range = 'today' | 'yesterday' | 'week' | 'month';
function range(r: Range) {
  const now = new Date();
  const today = ymd(now);
  if (r === 'today') return {from: today, to: today};
  if (r === 'yesterday') {
    const y = ymd(new Date(now.getTime() - 86400e3));
    return {from: y, to: y};
  }
  if (r === 'week') return {from: ymd(new Date(now.getTime() - 6 * 86400e3)), to: today};
  return {from: today.slice(0, 8) + '01', to: today};
}

export function ChecksPage() {
  const [r, setR] = useState<Range>('today');
  const [m, setM] = useState('all');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [list, setList] = useState<Check[] | null>(null);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState<Check | null>(null);
  const load = useCallback(() => {
    setErr('');
    setList(null);
    const {from, to} = range(r);
    adm<{checks: Check[]}>(`/checks?from=${from}&to=${to}&method=${m === 'all' ? '' : m}&q=${encodeURIComponent(query)}`)
      .then((x) => setList(x.checks))
      .catch((e: AdminError) => setErr(e.message));
  }, [r, m, query]);
  useEffect(load, [load]);
  const pay = list?.filter((c) => c.kind === 'Payment') ?? [];
  const sum = (list ?? []).reduce((a, c) => a + (c.kind === 'Payment' ? c.sum : -c.sum), 0);

  return (
    <VStack gap={4}>
      <HStack gap={3} wrap="wrap" align="end">
        <SegmentedControl label="Период" value={r} onChange={(v) => setR(v as Range)}>
          <SegmentedControlItem value="today" label="Сегодня" />
          <SegmentedControlItem value="yesterday" label="Вчера" />
          <SegmentedControlItem value="week" label="Неделя" />
          <SegmentedControlItem value="month" label="Месяц" />
        </SegmentedControl>
        <SegmentedControl label="Оплата" value={m} onChange={setM}>
          <SegmentedControlItem value="all" label="Все" />
          <SegmentedControlItem value="cash" label="Наличные" />
          <SegmentedControlItem value="card" label="Карта" />
        </SegmentedControl>
        <TextInput label="Позиция в чеке" isLabelHidden placeholder="Найти по блюду" value={q} width={220} hasClear
          onChange={setQ} onEnter={() => setQuery(q)} />
        {q !== query && <Button label="Найти" variant="secondary" onClick={() => setQuery(q)} />}
      </HStack>
      {err ? (
        <EmptyState title="Чеки не загрузились" description={err} actions={<Button label="Повторить" variant="primary" onClick={load} />} />
      ) : !list ? (
        <VStack gap={2}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={56} index={i} />)}</VStack>
      ) : !list.length ? (
        <EmptyState title="Чеков нет" description={query ? 'С этим блюдом за период ничего не продавали.' : 'За этот период касса ничего не пробила. Выберите другой период.'} />
      ) : (
        <>
          <Text color="secondary">{int(pay.length)} чеков на {rub(sum)}, средний {rub(pay.length ? pay.reduce((a, c) => a + c.sum, 0) / pay.length : 0)}.</Text>
          {byDay(list).map(([d, cs]) => (
            <VStack gap={2} key={d}>
              <Heading level={3}>{dayLong(cs[0].at)}</Heading>
              <Card padding={0}><CheckRows checks={cs} open={setOpen} /></Card>
            </VStack>
          ))}
        </>
      )}
      <Drawer isOpen={!!open} onOpenChange={(v) => !v && setOpen(null)} label="Чек" width={460} experimental={{isFullWidthOnMobile: true}}>
        {open && (
          <VStack gap={4} padding={5}>
            <CheckView c={open} />
            <Button label="Закрыть" variant="secondary" onClick={() => setOpen(null)} />
          </VStack>
        )}
      </Drawer>
    </VStack>
  );
}

export function ShiftsPage() {
  const [list, setList] = useState<Shift[] | null>(null);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState<Shift | null>(null);
  const load = useCallback(() => {
    setErr('');
    const to = ymd(new Date());
    const from = ymd(new Date(Date.now() - 60 * 86400e3));
    adm<{shifts: Shift[]}>(`/shifts?from=${from}&to=${to}`).then((x) => setList(x.shifts)).catch((e: AdminError) => setErr(e.message));
  }, []);
  useEffect(load, [load]);
  if (err) return <EmptyState title="Смены не загрузились" description={err} actions={<Button label="Повторить" variant="primary" onClick={load} />} />;
  if (!list) return <VStack gap={2}>{[0, 1, 2].map((i) => <Skeleton key={i} height={120} index={i} />)}</VStack>;
  if (!list.length) return <EmptyState title="Смен ещё не было" description="Смена появится здесь, как только кассир откроет её на кассе." />;
  return (
    <VStack gap={3}>
      <Text color="secondary">Смены за последние 60 дней. Нажмите на смену, чтобы увидеть её чеки.</Text>
      {list.map((s) => (
        <button key={s.id} type="button" className="adm-shift" onClick={() => setOpen(s)}>
          <HStack gap={2} align="center" wrap="wrap" justify="between">
            <b className="adm-shift__no">Смена № {s.no}</b>
            <Badge variant={s.closed ? 'neutral' : 'success'} label={s.closed ? 'Закрыта' : 'Открыта сейчас'} />
          </HStack>
          <dl className="adm-shift__grid">
            <span><dt>Открыта</dt><dd>{s.opened ? `${dayShort(s.opened)}, ${time(s.opened)}` : '—'}</dd></span>
            <span><dt>Закрыта</dt><dd>{s.closed ? `${dayShort(s.closed)}, ${time(s.closed)}` : 'ещё работает'}</dd></span>
            <span><dt>Длилась</dt><dd>{s.opened ? dur(s.opened, s.closed) : '—'}</dd></span>
            <span><dt>На открытие</dt><dd>{rub(s.openAmount)}</dd></span>
            <span><dt>Выручка</dt><dd>{rub(s.total)}</dd></span>
            <span><dt>Наличные</dt><dd>{rub(s.cash)}</dd></span>
            <span><dt>Карта</dt><dd>{rub(s.card)}</dd></span>
            <span><dt>Чеков</dt><dd>{int(s.checks || s.opsChecks)}</dd></span>
            {s.refunds > 0 && <span><dt>Возвраты</dt><dd className="adm-neg">{rub(s.refunds)}</dd></span>}
            {s.cashIn > 0 && <span><dt>Внесения</dt><dd>{rub(s.cashIn)}</dd></span>}
            {s.collections > 0 && <span><dt>Инкассация</dt><dd>{rub(s.collections)}</dd></span>}
            <span><dt>{s.closed ? 'В кассе на закрытие' : 'В кассе сейчас'}</dt><dd>{rub(s.drawer)}</dd></span>
          </dl>
          <Text size="sm" color="secondary">Кассир {s.cashier || 'не указан'}</Text>
        </button>
      ))}
      <ShiftDrawer shift={open} onClose={() => setOpen(null)} />
    </VStack>
  );
}

function ShiftDrawer({shift, onClose}: {shift: Shift | null; onClose: () => void}) {
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [err, setErr] = useState('');
  const [check, setCheck] = useState<Check | null>(null);
  useEffect(() => {
    if (!shift) return;
    setChecks(null);
    setCheck(null);
    setErr('');
    adm<{checks: Check[]}>(`/checks?shift=${shift.id}`).then((x) => setChecks(x.checks)).catch((e: AdminError) => setErr(e.message));
  }, [shift]);
  return (
    <Drawer isOpen={!!shift} onOpenChange={(v) => !v && onClose()} label="Смена" width={480} experimental={{isFullWidthOnMobile: true}}>
      {shift && (
        <VStack gap={4} padding={5}>
          {check ? (
            <>
              <Button label="К смене" variant="secondary" size="sm" onClick={() => setCheck(null)} />
              <CheckView c={check} />
            </>
          ) : (
            <>
              <VStack gap={1}>
                <Heading level={2}>Смена № {shift.no}</Heading>
                <Text color="secondary">
                  {shift.opened ? `Открыта ${dayLong(shift.opened)} в ${time(shift.opened)} с суммой ${rub(shift.openAmount)}. ` : ''}
                  {shift.closed ? `Закрыта в ${time(shift.closed)}, в кассе осталось ${rub(shift.drawer)}.` : `Ещё открыта, в кассе ${rub(shift.drawer)}.`}
                </Text>
              </VStack>
              {err ? (
                <Text color="secondary">{err}</Text>
              ) : !checks ? (
                <Skeleton height={160} />
              ) : !checks.length ? (
                <Text color="secondary">В эту смену чеков не было.</Text>
              ) : (
                <Card padding={0}><CheckRows checks={checks} open={setCheck} /></Card>
              )}
            </>
          )}
          <Button label="Закрыть" variant="secondary" onClick={onClose} />
        </VStack>
      )}
    </Drawer>
  );
}
