// Сводка: выручка и чеки из кассы, заказы приложения, деньги, прогноз месяца, советы.
import {Fragment, useCallback, useEffect, useState} from 'react';
import {VStack} from '@astryxdesign/core/VStack';
import {HStack} from '@astryxdesign/core/HStack';
import {Grid} from '@astryxdesign/core/Grid';
import {Card} from '@astryxdesign/core/Card';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Skeleton} from '@astryxdesign/core/Skeleton';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Table, pixel} from '@astryxdesign/core/Table';
import {adm, int, rub, type AdminError, type Sync} from './api';
import {Bars} from './Chart';

type T = {revenue: number; refunds: number; checks: number; cash: number; card: number};
type Data = {
  period: {from: string; to: string; prevFrom: string; prevTo: string};
  cur: T; prev: T;
  series: {d: string; revenue: number; checks: number}[];
  hours: {h: number; checks: number; revenue: number}[];
  top: {name: string; qty: number; unit: string; revenue: number; semi: boolean}[];
  app: {orders: number; total: number; paid: number};
  forecast: {ready: boolean; month: string; toDate: number; avgDay: number; projected: number; daysLeft: number; days?: number};
  stock: {value: number; items: number; negative: number; priced: number};
  supplies: {count: number; total: number};
  shift: {no: string; opened: string | null; closed: string | null; drawer: number; total: number} | null;
  foodcost: number | null;
  profit: {revenue: number; cost: number; coverage: number; acquiring: number; acquiringPct: number | null;
    expenses: {category: string; amount: number}[]; expensesTotal: number; net: number};
  prevNet: number;
  advice: {tone: 'warn' | 'info' | 'good'; title: string; text: string}[];
  sync: Sync;
};

type Range = 'today' | 'week' | 'month' | 'prev';
const ymd = (d: Date) => new Intl.DateTimeFormat('en-CA', {timeZone: 'Europe/Moscow'}).format(d);
function range(r: Range) {
  const today = ymd(new Date());
  const [y, m] = today.split('-').map(Number);
  if (r === 'today') return {from: today, to: today};
  if (r === 'week') return {from: ymd(new Date(Date.now() - 6 * 86400e3)), to: today};
  if (r === 'month') return {from: today.slice(0, 8) + '01', to: today};
  const pf = new Date(Date.UTC(m === 1 ? y - 1 : y, m === 1 ? 11 : m - 2, 1));
  const pt = new Date(Date.UTC(y, m - 1, 0));
  return {from: pf.toISOString().slice(0, 10), to: pt.toISOString().slice(0, 10)};
}
const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const dm = (d: string) => `${+d.slice(8, 10)}.${d.slice(5, 7)}`;

function delta(cur: number, prev: number) {
  if (!prev) return cur ? 'в прошлом периоде продаж не было' : '';
  const p = Math.round((cur / prev - 1) * 100);
  return `${p > 0 ? '+' : p < 0 ? '−' : ''}${Math.abs(p)}% к прошлому периоду`;
}

function Kpi({label, value, note}: {label: string; value: string; note?: string}) {
  return (
    <Card padding={4}>
      <VStack gap={1}>
        <Text size="sm" color="secondary">{label}</Text>
        <span className="adm-kpi">{value}</span>
        {note && <Text size="sm" color="secondary">{note}</Text>}
      </VStack>
    </Card>
  );
}

export default function Summary() {
  const [r, setR] = useState<Range>('month');
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => {
    setErr('');
    setData(null);
    const {from, to} = range(r);
    adm<Data>(`/summary?from=${from}&to=${to}`).then(setData).catch((e: AdminError) => setErr(e.message));
  }, [r]);
  useEffect(load, [load]);

  return (
    <VStack gap={5}>
      <SegmentedControl label="Период" value={r} onChange={(v) => setR(v as Range)}>
        <SegmentedControlItem value="today" label="День" />
        <SegmentedControlItem value="week" label="Неделя" />
        <SegmentedControlItem value="month" label="Месяц" />
        <SegmentedControlItem value="prev" label="Прошлый" />
      </SegmentedControl>

      {err ? (
        <EmptyState title="Сводка не загрузилась" description={err} actions={<Button label="Повторить" variant="primary" onClick={load} />} />
      ) : !data ? (
        <VStack gap={3}>
          <Grid columns={{minWidth: 160, repeat: 'fit'}} gap={3}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={104} index={i} />)}</Grid>
          <Skeleton height={240} />
        </VStack>
      ) : (
        <Body d={data} />
      )}
    </VStack>
  );
}

function Body({d}: {d: Data}) {
  const avg = d.cur.checks ? d.cur.revenue / d.cur.checks : 0;
  const prevAvg = d.prev.checks ? d.prev.revenue / d.prev.checks : 0;
  const days = d.series.length;
  const hours = Array.from({length: 13}, (_, i) => i + 8).map((h) => d.hours.find((x) => x.h === h) ?? {h, checks: 0, revenue: 0});
  const empty = !d.cur.checks && !d.app.orders;
  const f = d.forecast;
  const month = MONTHS[Number(f.month.slice(5, 7)) - 1];
  return (
    <VStack gap={5}>
      <Grid columns={{minWidth: 160, repeat: 'fit'}} gap={3}>
        <Kpi label="Выручка" value={rub(d.cur.revenue)} note={delta(d.cur.revenue, d.prev.revenue) || undefined} />
        <Kpi label="Чеков" value={int(d.cur.checks)} note={d.cur.refunds ? `возвратов на ${rub(d.cur.refunds)}` : delta(d.cur.checks, d.prev.checks) || undefined} />
        <Kpi label="Средний чек" value={rub(avg)} note={delta(avg, prevAvg) || undefined} />
        <Kpi label="Заказы в приложении" value={int(d.app.orders)} note={d.app.orders ? `на ${rub(d.app.total)}, оплачено ${int(d.app.paid)}` : 'пока ни одного'} />
        <Kpi label="Чистая прибыль" value={(d.profit.net < 0 ? '−' : '') + rub(Math.abs(d.profit.net))}
          note={d.profit.expensesTotal || d.profit.cost ? delta(d.profit.net, d.prevNet) || undefined : 'внесите расходы, иначе это просто выручка'} />
      </Grid>

      <Card padding={4}>
        <VStack gap={3}>
          <Heading level={2}>Откуда прибыль</Heading>
          <dl className="adm-dl adm-dl--pnl">
            <dt>Выручка</dt><dd>{rub(d.profit.revenue)}</dd>
            <dt>Себестоимость продуктов</dt>
            <dd>−{rub(d.profit.cost)}<small>{d.profit.coverage > 0.95 ? 'по техкартам и закупочным ценам' : d.profit.coverage > 0 ? `посчитана для ${Math.round(d.profit.coverage * 100)}% продаж` : 'не считается: в SIGMA нет закупочных цен'}</small></dd>
            <dt>Эквайринг</dt>
            <dd>−{rub(d.profit.acquiring)}<small>{d.profit.acquiringPct != null ? `${d.profit.acquiringPct}% от ${rub(d.cur.card)} по карте` : 'ставка не указана, раздел «Расходы»'}</small></dd>
            {d.profit.expenses.map((e) => (
              <Fragment key={e.category}><dt>{e.category}</dt><dd>−{rub(e.amount)}</dd></Fragment>
            ))}
            {!d.profit.expenses.length && (<><dt>Расходы</dt><dd>−{rub(0)}<small>не внесены, раздел «Расходы»</small></dd></>)}
            <dt className="adm-dl__sum">Чистая прибыль</dt><dd className="adm-dl__sum">{(d.profit.net < 0 ? '−' : '') + rub(Math.abs(d.profit.net))}</dd>
          </dl>
          <Text size="sm" color="secondary">Ежемесячные расходы разложены по дням: за неделю в прибыль попадает четверть аренды. Налог по патенту внесите в расходы.</Text>
        </VStack>
      </Card>

      {empty && (
        <Card padding={5}>
          <EmptyState title="За этот период продаж нет" description="Выберите другой период или нажмите «Обновить из кассы», если чеки пробивали только что." />
        </Card>
      )}

      <Grid columns={{minWidth: 300, repeat: 'fit'}} gap={3}>
        <Card padding={4}>
          <VStack gap={3}>
            <Heading level={2}>Деньги</Heading>
            <dl className="adm-dl">
              <dt>Наличные в кассе</dt>
              <dd>{d.shift ? rub(d.shift.drawer) : 'нет данных'}{d.shift && <small>{d.shift.closed ? `смена ${d.shift.no} закрыта` : `смена ${d.shift.no} открыта`}</small>}</dd>
              <dt>Картой и QR за период</dt>
              <dd>{rub(d.cur.card)}<small>придёт на счёт в Альфа-Банке за вычетом комиссии эквайринга</small></dd>
              <dt>Наличными за период</dt>
              <dd>{rub(d.cur.cash)}</dd>
              <dt>В товаре на складе</dt>
              <dd>{d.stock.priced ? rub(d.stock.value) : 'не посчитать'}<small>{d.stock.priced ? 'по закупочным ценам' : 'нет закупочных цен: приходов не было'}</small></dd>
            </dl>
            <Text size="sm" color="secondary">Остаток на расчётном счёте сюда не приходит: банк не подключён.</Text>
          </VStack>
        </Card>
        <Card padding={4}>
          <VStack gap={3}>
            <Heading level={2}>Прогноз на {month}</Heading>
            {f.ready ? (
              <>
                <span className="adm-kpi">{rub(f.projected)}</span>
                <Text color="secondary">
                  Уже {rub(f.toDate)}. Средний день за последние две недели — {rub(f.avgDay)}, до конца месяца {f.daysLeft} {f.daysLeft === 1 ? 'день' : f.daysLeft < 5 ? 'дня' : 'дней'}.
                </Text>
              </>
            ) : (
              <Text color="secondary">
                Пока {rub(f.toDate)} за месяц. Прогноз появится после трёх дней с продажами{f.days ? `, сейчас ${f.days}` : ''}.
              </Text>
            )}
            <Heading level={3}>Себестоимость</Heading>
            <Text color="secondary">
              {d.foodcost != null ? `Фудкост ${Math.round(d.foodcost * 100)}% от выручки по блюдам с техкартой.` : 'Посчитается, когда в SIGMA появятся приходы с закупочными ценами.'}
            </Text>
          </VStack>
        </Card>
      </Grid>

      {d.advice.length > 0 && (
        <Card padding={4}>
          <VStack gap={3}>
            <Heading level={2}>Что сделать</Heading>
            <ul className="adm-advice">
              {d.advice.map((a) => (
                <li key={a.title} data-tone={a.tone}>
                  <b>{a.title}</b>
                  <span>{a.text}</span>
                </li>
              ))}
            </ul>
          </VStack>
        </Card>
      )}

      {days > 1 && (
        <Card padding={4}>
          <VStack gap={2}>
            <Heading level={2}>Выручка по дням</Heading>
            <Bars data={d.series.map((x) => ({key: x.d, label: dm(x.d), value: x.revenue, note: `${dm(x.d)}, ${int(x.checks)} чеков`}))} format={rub} />
          </VStack>
        </Card>
      )}

      <Grid columns={{minWidth: 320, repeat: 'fit'}} gap={3}>
        <Card padding={4}>
          <VStack gap={2}>
            <Heading level={2}>Чеки по часам</Heading>
            <Bars data={hours.map((x) => ({key: String(x.h), label: String(x.h), value: x.checks, note: `с ${x.h}:00 до ${x.h + 1}:00, ${rub(x.revenue)}`}))} format={(n) => `${int(n)} чеков`} height={150} />
          </VStack>
        </Card>
        <Card padding={4}>
          <VStack gap={2}>
            <Heading level={2}>Что покупают</Heading>
            {d.top.length ? (
              <Table density="compact" idKey="name"
                data={d.top.map((t) => ({name: t.name, qty: t.unit === 'шт' ? `${int(t.qty)} шт` : `${int(t.qty)} чек.`, revenue: t.revenue ? rub(t.revenue) : '—'}))}
                columns={[
                  {key: 'name', header: 'Позиция'},
                  {key: 'qty', header: 'Продано', align: 'end', width: pixel(90)},
                  {key: 'revenue', header: 'На сумму', align: 'end', width: pixel(100)},
                ]} />
            ) : (
              <Text color="secondary">Продаж за период нет.</Text>
            )}
          </VStack>
        </Card>
      </Grid>

      <HStack gap={2}>
        <Text size="sm" color="secondary">
          Период {dm(d.period.from)}–{dm(d.period.to)}, сравнение с {dm(d.period.prevFrom)}–{dm(d.period.prevTo)}. Данные кассы SIGMA, время московское.
        </Text>
      </HStack>
    </VStack>
  );
}
