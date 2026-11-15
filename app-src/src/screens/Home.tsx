import {useEffect, useState} from 'react';
import {VStack} from '@astryxdesign/core/VStack';
import {HStack} from '@astryxdesign/core/HStack';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {ClockIcon, MapPinIcon} from '@heroicons/react/24/outline';
import {byId, cafe, img, MENU, MODES, PROMOS, type ModeId} from '../business';
import {addToCart, isOpen, rub, set, stage, T, useStore, vibrate} from '../store';
import {useUI} from '../ui/ctx';
import {CarIcon, MODE_ICON} from '../ui/icons';
import {LoyaltyCard} from '../ui/LoyaltyCard';
import {LogoFull} from '../ui/brand';
import {DishTile, Me, PromoTile, Section, TopBar} from '../ui/parts';

const greeting = () => {
  const h = new Date().getHours();
  return h < 5 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер';
};

function LiveOrder() {
  const {order} = useStore();
  const {open} = useUI();
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 3000);
    return () => clearInterval(t);
  }, []);
  if (!order) return null;
  const i = stage(order), last = i >= order.steps.length - 1;
  if (last && Date.now() - order.at > 30 * 60e3) return null;
  const left = Math.max(0, Math.ceil((order.eta - Date.now()) / 60e3));
  return (
    <button type="button" className="live" onClick={() => open({k: 'status'})} aria-label={`Заказ №${order.no}: ${order.steps[i][0]}. Подробнее`}>
      <b>Заказ №{order.no}</b>
      <span className="live__eta">{last ? 'Готово' : `${left} мин`}</span>
      <span>{order.steps[i][0]}</span>
      <span className="live__bar" aria-hidden="true">
        <i style={{width: `${Math.round(((i + 1) / order.steps.length) * 100)}%`}} />
      </span>
    </button>
  );
}

function cardNote(stamps: number, logged: boolean) {
  if (!logged) return 'Войдите по номеру: пять кофе дают шестой бесплатно, с каждого заказа возвращаются баллы.';
  if (stamps >= 5) return 'Шестой кофе готов, включите его в корзине.';
  const left = 5 - stamps;
  return `Ещё ${left} кофе, и шестой от нас. Нажмите на карту, чтобы показать код на кассе.`;
}

export function Home() {
  const s = useStore();
  const {open, go, toast} = useUI();
  const hits = MENU.filter((m) => m.hit);
  const last = s.user?.orders[0];

  const pick = (m: ModeId) => {
    set({mode: m, when: 'asap'});
    vibrate(5);
  };
  const repeat = () => {
    if (!last) return;
    last.lines.forEach((l) => addToCart(l.id, l.o, l.qty));
    toast('Прошлый заказ в корзине');
    open({k: 'cart'});
  };

  return (
    <>
      <TopBar>
        <LogoFull className="logo" title={`Ликс, кофейня в ${cafe.city === 'Вологда' ? 'Вологде' : cafe.city}`} />
        <Me />
      </TopBar>

      <VStack className="col" gap={8} paddingBlockStart={2}>
        <div className="home-grid">
          <VStack gap={4}>
            <VStack gap={2} className="hello">
              <HStack gap={2} vAlign="center">
                <StatusDot variant={isOpen() ? 'success' : 'neutral'} label={isOpen() ? 'Открыто' : 'Закрыто'} />
                <Text size="sm" weight="semibold" color="secondary">
                  {isOpen() ? `Открыто до ${cafe.close}:00` : `Откроемся в ${cafe.open}:00`}
                </Text>
              </HStack>
              <h1>
                {greeting()}
                {s.user?.name ? `, ${s.user.name}` : ''}
              </h1>
            </VStack>
            <LiveOrder />
            <LoyaltyCard />
            <Text color="secondary" size="sm">
              {T(cardNote(s.user?.stamps ?? 0, !!s.user))}
            </Text>
          </VStack>

          <VStack gap={3}>
            <Heading level={2}>Как забрать</Heading>
            <div className="modes" role="radiogroup" aria-label="Как забрать">
              {(Object.keys(MODES) as ModeId[]).map((k) => {
                const I = MODE_ICON[k];
                return (
                  <button key={k} type="button" role="radio" aria-checked={s.mode === k} className="mode" onClick={() => pick(k)}>
                    <I />
                    {MODES[k].name}
                  </button>
                );
              })}
            </div>
            <Text color="secondary" size="sm" aria-live="polite">
              {T(MODES[s.mode].note)}
            </Text>
            {last && (
              <button type="button" className="mrow" style={{marginTop: 8}} onClick={repeat}>
                <span className="mrow__img">
                  <img src={img(byId(last.lines[0]?.id ?? 'cappuccino').photo)} alt="" width={184} height={184} />
                </span>
                <span className="mrow__t">
                  <b>Повторить прошлый заказ</b>
                  <span>{T(last.items.join(', '))}</span>
                  <em>{rub(last.total)}</em>
                </span>
              </button>
            )}
          </VStack>
        </div>

        <Section title="Сейчас выгодно" action={<Button label="Все акции" variant="ghost" size="sm" onClick={() => go('promos')} />}>
          <div className="rail" role="list" aria-label="Акции">
            {PROMOS.slice(0, 6).map((p) => (
              <span role="listitem" key={p.id}>
                <PromoTile p={p} />
              </span>
            ))}
          </div>
        </Section>

        <Section title="Чаще всего берут" action={<Button label="Всё меню" variant="ghost" size="sm" onClick={() => go('menu')} />}>
          <div className="grid2">
            {hits.map((m) => (
              <DishTile key={m.id} m={m} />
            ))}
          </div>
        </Section>

        <article className="about" aria-labelledby="about-h">
          <div className="about__photo">
            <img src={img('facade')} alt="Фасад кофейни Ликс: красная вывеска и большие окна" loading="lazy" width={960} height={1280} />
          </div>
          <VStack gap={3} padding={5}>
            <Heading level={2} id="about-h">
              {T('Красная вывеска у парковки')}
            </Heading>
            <Text color="secondary">{T('Маленькая кофейня с завтраками весь день и десертами к кофе. Можно зайти, а можно не выходить из машины.')}</Text>
            <VStack gap={2} paddingBlock={1}>
              <span className="fact">
                <ClockIcon aria-hidden="true" />
                Ежедневно {cafe.open}:00–{cafe.close}:00
              </span>
              <span className="fact">
                <MapPinIcon aria-hidden="true" />
                {cafe.address ? `${cafe.address}, ` : ''}
                {cafe.city}
              </span>
              <span className="fact">
                <CarIcon />
                Своя парковка у входа
              </span>
            </VStack>
            <HStack gap={2} wrap="wrap">
              {cafe.address && (
                <Button label="Маршрут" variant="secondary" href={`https://yandex.ru/maps/?text=${encodeURIComponent(`Ликс ${cafe.address} ${cafe.city}`)}`} target="_blank" />
              )}
              {cafe.phone && <Button label="Позвонить" variant="secondary" href={`tel:${cafe.phone.replace(/[^+\d]/g, '')}`} />}
              <Button label="Открыть меню" variant="primary" onClick={() => go('menu')} />
            </HStack>
          </VStack>
        </article>
      </VStack>
    </>
  );
}
