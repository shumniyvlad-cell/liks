import {useEffect, useRef, useState, type ReactNode} from 'react';
import {HStack} from '@astryxdesign/core/HStack';
import {Heading} from '@astryxdesign/core/Heading';
import {Avatar} from '@astryxdesign/core/Avatar';
import {img, type Item, type Promo} from '../business';
import {addToCart, cartQty, rub, T, useStore} from '../store';
import {useUI} from './ctx';
import {PlusIcon} from './icons';
import {Art, ART_COLOR, type ArtName} from './brand';

/** Шапка: прозрачная вверху, стекло, когда под ней поехало содержимое. */
export function TopBar({children}: {children: ReactNode}) {
  const ref = useRef<HTMLElement>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const on = () => setStuck(scrollY > 6);
    on();
    addEventListener('scroll', on, {passive: true});
    return () => removeEventListener('scroll', on);
  }, []);
  return (
    <header ref={ref} className={`bar glass${stuck ? ' is-stuck' : ''}`}>
      <HStack className="bar__in col" justify="between" vAlign="center" gap={3}>
        {children}
      </HStack>
    </header>
  );
}

export function Me() {
  const {user} = useStore();
  const {go} = useUI();
  return <Avatar name={user?.name || 'Гость'} size="sm" tooltip={false} onClick={() => go('profile')} />;
}

export function Section({title, action, children}: {title: string; action?: ReactNode; children: ReactNode}) {
  return (
    <section className="section" aria-label={title}>
      <HStack justify="between" vAlign="center" paddingBlockEnd={3}>
        <Heading level={2}>{title}</Heading>
        {action}
      </HStack>
      {children}
    </section>
  );
}

/** Быстрое добавление: у напитков и сетов сначала выбор, остальное сразу в корзину. */
export function useQuickAdd() {
  const {open, toast} = useUI();
  return (m: Item) => {
    if (m.opts && (m.opts.size || m.opts.dish)) return open({k: 'dish', id: m.id});
    addToCart(m.id, {});
    toast(`${m.name} в корзине`);
  };
}

export function DishTile({m}: {m: Item}) {
  const s = useStore();
  const {open} = useUI();
  const add = useQuickAdd();
  const q = cartQty(m.id, s);
  return (
    <article className="dish-card">
      <button type="button" className="dish" onClick={() => open({k: 'dish', id: m.id})} aria-label={`${m.name}, ${priceText(m)}`}>
        <span className="dish__img">
          <img src={img(m.photo)} alt="" loading="lazy" width={380} height={475} />
          {m.tag && <span className="dish__tag">{m.tag}</span>}
        </span>
        <span className="dish__name">{T(m.name)}</span>
        <span className="dish__price">
          {priceText(m)}
          {m.old && <s>{rub(m.old)}</s>}
        </span>
      </button>
      {!m.soon && <AddButton q={q} name={m.name} onAdd={() => add(m)} className="dish__add" />}
    </article>
  );
}

/** Цена в карточке: «от» у напитков с размерами, «Цена скоро», пока кофейня её не назвала. */
const priceText = (m: Item) => (m.soon ? 'Цена скоро' : `${m.opts?.size ? 'от ' : ''}${rub(m.price)}`);

function AddButton({q, name, onAdd, className}: {q: number; name: string; onAdd: () => void; className: string}) {
  return (
    <button type="button" className={`${className}${q ? ' is-in' : ''}`} aria-label={q ? `${name}: в корзине ${q}, добавить ещё` : `Добавить: ${name}`} onClick={onAdd}>
      {q || <PlusIcon />}
    </button>
  );
}

export function DishRow({m}: {m: Item}) {
  const s = useStore();
  const {open} = useUI();
  const add = useQuickAdd();
  const q = cartQty(m.id, s);
  return (
    <div className="mrow-wrap">
    <button type="button" className="mrow" onClick={() => open({k: 'dish', id: m.id})}>
      <span className="mrow__img">
        <img src={img(m.photo)} alt="" loading="lazy" width={184} height={184} />
      </span>
      <span className="mrow__t">
        <b>{T(m.name)}</b>
        <span>{T(m.desc)}</span>
        <em className={m.soon ? 'is-soon' : undefined}>
          {priceText(m)}
          {m.old && <s>{rub(m.old)}</s>}
        </em>
      </span>
      </button>
      {m.soon ? <span className="addbtn-gap" aria-hidden="true" /> : <AddButton q={q} name={m.name} onAdd={() => add(m)} className="addbtn" />}
    </div>
  );
}

/** Цвет иллюстрации на плитке: на бумаге свой, на цветных — туман или пара из палитры, как на плакатах. */
export function artColor(p: Promo) {
  if (p.tone === 'paper') return ART_COLOR[p.art];
  const pair: Partial<Record<Promo['tone'], Partial<Record<ArtName, string>>>> = {forest: {steam: 'var(--sage)'}, berry: {steam: 'var(--oak)'}};
  return pair[p.tone]?.[p.art] ?? 'var(--mist)';
}

export function PromoTile({p, wide}: {p: Promo; wide?: boolean}) {
  const {open} = useUI();
  return (
    <button type="button" className={`tile tile--${p.tone} ${wide ? 'promo-row' : 'promo-tile'}`} onClick={() => open({k: 'promo', id: p.id})}>
      <span className="tile__kick">{T(p.kick)}</span>
      <span className="tile__t">{T(p.title)}</span>
      <span className="tile__s">{T(p.text)}</span>
      <Art name={p.art} className="tile__art" style={{color: artColor(p)}} />
    </button>
  );
}
