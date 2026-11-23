// Склад и поставки из SIGMA: остатки товаров по закупочным ценам и документы прихода.
import {useCallback, useEffect, useState} from 'react';
import {VStack} from '@astryxdesign/core/VStack';
import {Card} from '@astryxdesign/core/Card';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Skeleton} from '@astryxdesign/core/Skeleton';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Table, pixel} from '@astryxdesign/core/Table';
import {TextInput} from '@astryxdesign/core/TextInput';
import {adm, int, rub, type AdminError} from './api';

type Stock = {id: string; name: string; unit: string; remainder: number; buyPrice: number; value: number};
type Waybill = {id: string; at: string | null; sum: number; supplier: string; status: string};
type Data = {stock: Stock[]; waybills: Waybill[]};

const qty = (n: number, u: string) => `${new Intl.NumberFormat('ru-RU', {maximumFractionDigits: 3}).format(n)} ${u}`;

export default function StockPage() {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const load = useCallback(() => {
    setErr('');
    adm<Data>('/stock').then(setD).catch((e: AdminError) => setErr(e.message));
  }, []);
  useEffect(load, [load]);
  if (err) return <EmptyState title="Склад не загрузился" description={err} actions={<Button label="Повторить" variant="primary" onClick={load} />} />;
  if (!d) return <VStack gap={2}>{[0, 1, 2].map((i) => <Skeleton key={i} height={120} index={i} />)}</VStack>;

  const total = d.stock.reduce((s, x) => s + x.value, 0);
  const list = d.stock.filter((s) => s.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <VStack gap={5}>
      <Card padding={4}>
        <VStack gap={3}>
          <Heading level={2}>Поставки</Heading>
          {d.waybills.length ? (
            <Table density="compact" idKey="id"
              data={d.waybills.map((w) => ({id: w.id, at: w.at ? new Date(w.at).toLocaleDateString('ru-RU') : '—', supplier: w.supplier || '—', status: w.status || '—', sum: rub(w.sum)}))}
              columns={[
                {key: 'at', header: 'Дата', width: pixel(110)},
                {key: 'supplier', header: 'Поставщик'},
                {key: 'status', header: 'Статус', width: pixel(120)},
                {key: 'sum', header: 'Сумма', align: 'end', width: pixel(120)},
              ]} />
          ) : (
            <EmptyState isCompact title="Приходов ещё не было"
              description="Поставки заводят в SIGMA: «Документы → Приходы». С закупочными ценами здесь появятся деньги в складе, а в сводке — себестоимость и маржа." />
          )}
        </VStack>
      </Card>

      <Card padding={4}>
        <VStack gap={3}>
          <Heading level={2}>Остатки</Heading>
          <Text color="secondary">{int(d.stock.length)} товаров и ингредиентов, в товаре {rub(total)} по закупочным ценам.</Text>
          <TextInput label="Найти" isLabelHidden placeholder="Найти товар" value={q} onChange={setQ} width={280} />
          <Table density="compact" idKey="id" isStriped
            data={list.map((s) => ({id: s.id, name: s.name, left: qty(s.remainder, s.unit), price: s.buyPrice ? rub(s.buyPrice) : '—', value: s.value ? rub(s.value) : '—', neg: s.remainder < 0}))}
            columns={[
              {key: 'name', header: 'Товар'},
              {key: 'left', header: 'Остаток', align: 'end', width: pixel(120), renderCell: (r) => <span className={r.neg ? 'adm-neg' : undefined}>{r.left}</span>},
              {key: 'price', header: 'Закупка', align: 'end', width: pixel(110)},
              {key: 'value', header: 'В деньгах', align: 'end', width: pixel(120)},
            ]} />
        </VStack>
      </Card>
    </VStack>
  );
}
