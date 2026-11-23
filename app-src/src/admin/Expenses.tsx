// Расходы вне кассы и комиссия эквайринга — из них и выручки складывается чистая прибыль в сводке.
import {useCallback, useEffect, useState} from 'react';
import {VStack} from '@astryxdesign/core/VStack';
import {HStack} from '@astryxdesign/core/HStack';
import {Grid} from '@astryxdesign/core/Grid';
import {Card} from '@astryxdesign/core/Card';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Skeleton} from '@astryxdesign/core/Skeleton';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {TextInput} from '@astryxdesign/core/TextInput';
import {NumberInput} from '@astryxdesign/core/NumberInput';
import {DateInput} from '@astryxdesign/core/DateInput';
import {Selector} from '@astryxdesign/core/Selector';
import {Switch} from '@astryxdesign/core/Switch';
import {AlertDialog} from '@astryxdesign/core/AlertDialog';
import {useToast} from '@astryxdesign/core/Toast';
import {adm, rub, type AdminError} from './api';

type Expense = {id: string; day: string; category: string; amount: number; comment: string; monthly: boolean; until: string | null; createdBy: string};
type Data = {expenses: Expense[]; cats: string[]; acquiringPct: number | null};

const today = () => new Intl.DateTimeFormat('en-CA', {timeZone: 'Europe/Moscow'}).format(new Date());
const ru = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('ru-RU', {day: 'numeric', month: 'long', year: 'numeric'});

export default function Expenses() {
  const toast = useToast();
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState('');
  const [pct, setPct] = useState<number | null>(null);
  const [pctBusy, setPctBusy] = useState(false);
  const [f, setF] = useState({day: today(), category: '', amount: null as number | null, comment: '', monthly: false});
  const [ferr, setFerr] = useState<{field?: string; text: string} | null>(null);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState<Expense | null>(null);
  const [delBusy, setDelBusy] = useState(false);

  const load = useCallback(() => {
    setErr('');
    adm<Data>('/expenses').then((x) => (setD(x), setPct(x.acquiringPct))).catch((e: AdminError) => setErr(e.message));
  }, []);
  useEffect(load, [load]);

  const savePct = () => {
    setPctBusy(true);
    adm<{acquiringPct: number | null}>('/settings', {method: 'PATCH', body: {acquiringPct: pct}})
      .then((x) => (setPct(x.acquiringPct), toast({body: 'Комиссия сохранена'})))
      .catch((e: AdminError) => toast({body: e.message}))
      .finally(() => setPctBusy(false));
  };
  const add = () => {
    if (!f.category) return setFerr({field: 'category', text: 'Выберите статью.'});
    if (!f.amount || f.amount <= 0) return setFerr({field: 'amount', text: 'Впишите сумму.'});
    setBusy(true);
    adm('/expenses', {body: f})
      .then(() => {
        toast({body: f.monthly ? 'Добавлено, будет учитываться каждый месяц' : 'Расход добавлен'});
        setF({day: today(), category: '', amount: null, comment: '', monthly: false});
        load();
      })
      .catch((e: AdminError) => setFerr({field: e.field, text: e.message}))
      .finally(() => setBusy(false));
  };
  const remove = () => {
    if (!del) return;
    setDelBusy(true);
    adm(`/expenses/${del.id}`, {method: 'DELETE', body: {}})
      .then(() => (setDel(null), load()))
      .catch((e: AdminError) => toast({body: e.message}))
      .finally(() => setDelBusy(false));
  };

  if (err) return <EmptyState title="Расходы не загрузились" description={err} actions={<Button label="Повторить" variant="primary" onClick={load} />} />;
  if (!d) return <VStack gap={2}>{[0, 1, 2].map((i) => <Skeleton key={i} height={120} index={i} />)}</VStack>;
  const active = d.expenses.filter((e) => e.monthly && !e.until);
  const perMonth = active.reduce((a, e) => a + e.amount, 0);

  return (
    <VStack gap={5}>
      <Grid columns={{minWidth: 320, repeat: 'fit'}} gap={3}>
        <Card padding={4}>
          <VStack gap={3}>
            <Heading level={2}>Новый расход</Heading>
            <DateInput label="Дата" value={f.day as never} onChange={(x) => setF({...f, day: String(x ?? '')})}
              status={ferr?.field === 'day' ? {type: 'error', message: ferr.text} : undefined} />
            <Selector label="Статья" placeholder="Выберите" value={f.category} options={d.cats.map((c) => ({value: c, label: c}))}
              onChange={(v) => (setFerr(null), setF({...f, category: v}))} status={ferr?.field === 'category' ? {type: 'error', message: ferr.text} : undefined} />
            <NumberInput label="Сумма" units="₽" min={0} value={f.amount} onChange={(v) => (setFerr(null), setF({...f, amount: v}))}
              status={ferr?.field === 'amount' ? {type: 'error', message: ferr.text} : undefined} />
            <TextInput label="Комментарий" isOptional value={f.comment} onChange={(v) => setF({...f, comment: v})} placeholder="Например, аренда за декабрь" />
            <Switch label="Каждый месяц" description="Аренда, зарплата, связь: внесите один раз, сумма разложится по дням каждого месяца" labelPosition="start" labelSpacing="spread"
              value={f.monthly} onChange={(v) => setF({...f, monthly: v})} />
            {ferr && !['day', 'category', 'amount'].includes(ferr.field ?? '') && <Text color="secondary">{ferr.text}</Text>}
            <Button label="Добавить расход" variant="primary" isLoading={busy} onClick={add} />
          </VStack>
        </Card>
        <Card padding={4}>
          <VStack gap={3}>
            <Heading level={2}>Эквайринг Альфа-Банка</Heading>
            <Text color="secondary">Процент, который банк удерживает с оплат картой и QR. Он есть в договоре эквайринга или в выписке.</Text>
            <NumberInput label="Комиссия" units="%" min={0} max={10} step={0.1} value={pct} onChange={setPct} />
            <Button label="Сохранить комиссию" variant="secondary" isLoading={pctBusy} onClick={savePct} />
            <Heading level={3}>Постоянные расходы</Heading>
            <Text color="secondary">{active.length ? `${rub(perMonth)} в месяц, около ${rub(perMonth / 30)} в день.` : 'Пока не внесены.'}</Text>
          </VStack>
        </Card>
      </Grid>

      <VStack gap={2}>
        <Heading level={2}>Все расходы</Heading>
        {!d.expenses.length ? (
          <Card padding={5}><EmptyState isCompact title="Расходов пока нет" description="Начните с аренды и зарплаты: без них чистая прибыль в сводке будет завышена." /></Card>
        ) : (
          <Card padding={0}>
            <ul className="adm-rows">
              {d.expenses.map((e) => (
                <li key={e.id} className="adm-exp">
                  <span className="adm-row__t">
                    <b>{e.category}{e.comment ? `: ${e.comment}` : ''}</b>
                    <small>
                      {e.monthly ? (e.until ? `каждый месяц с ${ru(e.day)} по ${ru(e.until)}` : `каждый месяц с ${ru(e.day)}`) : ru(e.day)}
                      {e.createdBy ? `, внёс ${e.createdBy}` : ''}
                    </small>
                  </span>
                  <span className="adm-row__p">{rub(e.amount)}{e.monthly ? ' в мес.' : ''}</span>
                  {!(e.monthly && e.until) && <Button label={e.monthly ? 'Прекратить' : 'Удалить'} size="sm" variant="secondary" onClick={() => setDel(e)} />}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </VStack>
      <HStack gap={2}>
        <Text size="sm" color="secondary">Себестоимость продуктов считается по техкартам SIGMA и закупочным ценам из приходов, вносить её сюда не нужно.</Text>
      </HStack>

      <AlertDialog isOpen={!!del} onOpenChange={(v) => !v && setDel(null)}
        title={del?.monthly ? 'Прекратить ежемесячный расход?' : 'Удалить расход?'}
        description={del?.monthly ? 'С сегодняшнего дня он перестанет учитываться. Прошлые месяцы останутся в прибыли как были.' : 'Расход пропадёт из прибыли за свой день.'}
        actionLabel={del?.monthly ? 'Прекратить' : 'Удалить'} cancelLabel="Отмена" isActionLoading={delBusy} onAction={remove} />
    </VStack>
  );
}
