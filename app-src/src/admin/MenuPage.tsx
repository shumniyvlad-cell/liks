// Меню: карточки приложения и позиции кассы. Цена правится здесь и сразу пишется в SIGMA.
import {useCallback, useEffect, useState} from 'react';
import {VStack} from '@astryxdesign/core/VStack';
import {HStack} from '@astryxdesign/core/HStack';
import {Card} from '@astryxdesign/core/Card';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Badge} from '@astryxdesign/core/Badge';
import {Banner} from '@astryxdesign/core/Banner';
import {Skeleton} from '@astryxdesign/core/Skeleton';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Drawer} from '@astryxdesign/core/Drawer';
import {TextInput} from '@astryxdesign/core/TextInput';
import {TextArea} from '@astryxdesign/core/TextArea';
import {NumberInput} from '@astryxdesign/core/NumberInput';
import {Selector} from '@astryxdesign/core/Selector';
import {Switch} from '@astryxdesign/core/Switch';
import {FileInput} from '@astryxdesign/core/FileInput';
import {useToast} from '@astryxdesign/core/Toast';
import {img, type Item} from '../business';
import {adm, rub, toMenuPhoto, type AdminError} from './api';

type Link = {id: string; name: string; price: number; unit: string; weight: number | null; cost: number | null};
type Card_ = Item & {sigma?: string[]; hidden?: boolean};
type Row = {id: string; sort: number; card: Card_; status: Status; links: Link[]};
type Status = 'live' | 'soon' | 'hidden' | 'nophoto' | 'unlinked' | 'gone';
type View = {cats: {id: string; name: string}[]; items: Row[]; free: Link[]; created?: string};

const STATUS: Record<Status, {label: string; v: 'success' | 'warning' | 'neutral' | 'error'}> = {
  live: {label: 'В приложении', v: 'success'},
  soon: {label: 'Цена скоро', v: 'warning'},
  hidden: {label: 'Скрыто', v: 'neutral'},
  nophoto: {label: 'Нужно фото', v: 'warning'},
  unlinked: {label: 'Нет в кассе', v: 'neutral'},
  gone: {label: 'Убрано из кассы', v: 'error'},
};

const priceLine = (r: Row) => (r.links.length ? r.links.map((l) => (l.price > 0 ? rub(l.price) : 'без цены')).join(' / ') : '—');

export default function MenuPage() {
  const [view, setView] = useState<View | null>(null);
  const [err, setErr] = useState('');
  const [edit, setEdit] = useState<string | null>(null);
  const load = useCallback(() => {
    setErr('');
    adm<View>('/menu').then(setView).catch((e: AdminError) => setErr(e.message));
  }, []);
  useEffect(load, [load]);

  if (err) return <EmptyState title="Меню не загрузилось" description={err} actions={<Button label="Повторить" variant="primary" onClick={load} />} />;
  if (!view) return <VStack gap={2}>{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} height={72} index={i} />)}</VStack>;

  const row = view.items.find((r) => r.id === edit) ?? null;
  const shown = view.items.filter((r) => r.status !== 'unlinked');
  const offCash = view.items.filter((r) => r.status === 'unlinked');
  return (
    <VStack gap={5}>
      <Banner status="info" title="Цены живут в кассе SIGMA"
        description="Меняете цену здесь — она сразу меняется на кассе и в приложении. Фото, описание, граммовка и раздел — только для приложения." />
      {view.cats.map((c) => {
        const list = shown.filter((r) => r.card.cat === c.id);
        if (!list.length) return null;
        return (
          <VStack gap={2} key={c.id}>
            <Heading level={2}>{c.name}</Heading>
            <Card padding={0}>
              <ul className="adm-rows">
                {list.map((r) => (
                  <li key={r.id}>
                    <button type="button" className="adm-row" onClick={() => setEdit(r.id)}>
                      {r.card.photo ? <img src={img(r.card.photo)} alt="" width={56} height={70} loading="lazy" /> : <span className="adm-row__nophoto" aria-hidden="true" />}
                      <span className="adm-row__t">
                        <b>{r.card.name}</b>
                        <small>{r.links.map((l) => l.name).join(', ')}{r.card.weight ? `, ${r.card.weight}` : ''}</small>
                      </span>
                      <span className="adm-row__p">{priceLine(r)}</span>
                      <Badge variant={STATUS[r.status].v} label={STATUS[r.status].label} />
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          </VStack>
        );
      })}

      <Free view={view} onAdded={(v) => (setView(v), v.created && setEdit(v.created))} />

      {offCash.length > 0 && (
        <VStack gap={2}>
          <Heading level={2}>Нет в кассе</Heading>
          <Text color="secondary">Этих блюд нет в SIGMA, поэтому в приложении их не видно. Заведут в кассе с таким же названием — появятся сами.</Text>
          <Text>{offCash.map((r) => r.card.name).join(', ')}</Text>
        </VStack>
      )}

      <Editor row={row} cats={view.cats} onClose={() => setEdit(null)} onSaved={setView} />
    </VStack>
  );
}

function Free({view, onAdded}: {view: View; onAdded: (v: View) => void}) {
  const [cat, setCat] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState<Record<string, string>>({});
  if (!view.free.length) return null;
  const add = (l: Link) => {
    if (!cat[l.id]) return setErr({...err, [l.id]: 'Выберите раздел.'});
    setBusy(l.id);
    adm<View>('/menu', {body: {sigma: l.id, cat: cat[l.id]}})
      .then(onAdded)
      .catch((e: AdminError) => setErr({...err, [l.id]: e.message}))
      .finally(() => setBusy(''));
  };
  return (
    <VStack gap={2}>
      <Heading level={2}>Есть в кассе, нет в приложении</Heading>
      <Text color="secondary">Добавьте позицию, загрузите фото и включите показ — блюдо появится в приложении с ценой кассы.</Text>
      <Card padding={0}>
        <ul className="adm-rows">
          {view.free.map((l) => (
            <li key={l.id} className="adm-free">
              <span className="adm-row__t">
                <b>{l.name}</b>
                <small>{l.price > 0 ? rub(l.price) : 'без цены'}{l.weight ? `, по техкарте ${l.weight} г` : ''}</small>
              </span>
              <Selector label="Раздел" isLabelHidden placeholder="Раздел" value={cat[l.id]} width={170}
                options={view.cats.map((c) => ({value: c.id, label: c.name}))}
                status={err[l.id] ? {type: 'error', message: err[l.id]} : undefined}
                onChange={(v) => (setCat({...cat, [l.id]: v}), setErr({...err, [l.id]: ''}))} />
              <Button label="Добавить" variant="secondary" size="sm" isLoading={busy === l.id} onClick={() => add(l)} />
            </li>
          ))}
        </ul>
      </Card>
    </VStack>
  );
}

function sizeLabel(row: Row, i: number) {
  const size = row.card.opts?.size;
  if (size && size.length === row.links.length) return `Цена, ${size[i][0]}`;
  return row.links.length > 1 ? `Цена: ${row.links[i].name}` : 'Цена';
}

function Editor({row, cats, onClose, onSaved}: {row: Row | null; cats: View['cats']; onClose: () => void; onSaved: (v: View) => void}) {
  const toast = useToast();
  const [f, setF] = useState({name: '', desc: '', weight: '', cat: '', hit: false, show: false, prices: [] as number[]});
  const [err, setErr] = useState<{field?: string; text: string} | null>(null);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoErr, setPhotoErr] = useState('');
  useEffect(() => {
    if (!row) return;
    setF({name: row.card.name, desc: row.card.desc, weight: row.card.weight ?? '', cat: row.card.cat, hit: !!row.card.hit,
      show: !row.card.hidden, prices: row.links.map((l) => l.price)});
    setErr(null);
    setPhotoErr('');
    // открываем на новой позиции, а не при каждом сохранении
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row?.id]);

  const save = () => {
    if (!row) return;
    if (f.name.trim().length < 2) return setErr({field: 'name', text: 'Название — хотя бы два символа.'});
    setBusy(true);
    const changed = f.prices.some((p, i) => p !== row.links[i]?.price);
    adm<View>(`/menu/${row.id}`, {method: 'PATCH', body: {name: f.name, desc: f.desc, weight: f.weight, cat: f.cat, hit: f.hit, hidden: !f.show,
      ...(changed ? {prices: f.prices} : {})}})
      .then((v) => {
        onSaved(v);
        toast({body: changed ? 'Сохранено, цена в кассе обновлена' : 'Сохранено'});
        onClose();
      })
      .catch((e: AdminError) => setErr({field: e.field, text: e.message}))
      .finally(() => setBusy(false));
  };
  const upload = async (file: File | File[] | null) => {
    if (!row || !file || Array.isArray(file)) return;
    setPhotoBusy(true);
    setPhotoErr('');
    try {
      const v = await adm<View>(`/menu/${row.id}/photo`, {raw: await toMenuPhoto(file)});
      onSaved(v);
    } catch (e) {
      setPhotoErr((e as Error).message);
    } finally {
      setPhotoBusy(false);
    }
  };
  const techWeight = row?.links.find((l) => l.weight)?.weight;
  return (
    <Drawer isOpen={!!row} onOpenChange={(v) => !v && onClose()} label="Позиция меню" width={460} purpose="form" experimental={{isFullWidthOnMobile: true}}>
      {row && (
        <VStack gap={4} padding={5}>
          <VStack gap={1}>
            <Heading level={2}>{row.card.name}</Heading>
            <Text size="sm" color="secondary">В кассе: {row.links.map((l) => l.name).join(', ') || 'нет'}</Text>
          </VStack>
          <HStack gap={3} align="end">
            {row.card.photo ? <img className="adm-photo" src={img(row.card.photo)} alt="" width={120} height={150} /> : <span className="adm-photo adm-row__nophoto" aria-hidden="true" />}
            <FileInput label="Фото" accept="image/jpeg,image/png,image/webp,image/heic" value={null} onChange={upload} isLoading={photoBusy}
              description="Обрежем до 4:5 по центру" placeholder="Загрузить" status={photoErr ? {type: 'error', message: photoErr} : undefined} />
          </HStack>
          <TextInput label="Название в приложении" value={f.name} onChange={(v) => (setErr(null), setF({...f, name: v}))}
            status={err?.field === 'name' ? {type: 'error', message: err.text} : undefined} />
          <TextArea label="Описание" value={f.desc} onChange={(v) => setF({...f, desc: v})} isOptional />
          <TextInput label="Выход" description={techWeight ? `По техкарте около ${techWeight} г. Пишите как гостю: «250 г», «300 мл».` : 'Как гостю: «250 г», «300 мл».'}
            value={f.weight} onChange={(v) => setF({...f, weight: v})} isOptional />
          <Selector label="Раздел" value={f.cat} options={cats.map((c) => ({value: c.id, label: c.name}))} onChange={(v) => setF({...f, cat: v})}
            status={err?.field === 'cat' ? {type: 'error', message: err.text} : undefined} />
          {row.links.map((l, i) => (
            <NumberInput key={l.id} label={sizeLabel(row, i)} units="₽" min={0} max={100000} isIntegerOnly value={f.prices[i]}
              description={i === 0 ? 'Пишется в кассу SIGMA. 0 — в приложении «Цена скоро».' : undefined}
              status={err?.field === 'price' && i === 0 ? {type: 'error', message: err.text} : undefined}
              onChange={(v) => setF({...f, prices: f.prices.map((p, j) => (j === i ? v : p))})} />
          ))}
          <Switch label="Показывать в приложении" labelPosition="start" labelSpacing="spread" value={f.show} onChange={(v) => setF({...f, show: v})}
            description={row.card.photo ? undefined : 'Сначала загрузите фото'} isDisabled={!row.card.photo} />
          <Switch label="Метка «хит»" labelPosition="start" labelSpacing="spread" value={f.hit} onChange={(v) => setF({...f, hit: v})} />
          {err && !['name', 'price', 'cat'].includes(err.field ?? '') && <Banner status="error" title="Не сохранилось" description={err.text} />}
          <HStack gap={2} justify="end">
            <Button label="Отмена" variant="secondary" onClick={onClose} />
            <Button label="Сохранить" variant="primary" isLoading={busy} onClick={save} />
          </HStack>
        </VStack>
      )}
    </Drawer>
  );
}
