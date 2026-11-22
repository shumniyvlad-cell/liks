import {VStack} from '@astryxdesign/core/VStack';
import {HStack} from '@astryxdesign/core/HStack';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {ProgressBar} from '@astryxdesign/core/ProgressBar';
import {List, ListItem} from '@astryxdesign/core/List';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {
  QrCodeIcon, ClockIcon, CakeIcon, ShareIcon, PhoneIcon, ArrowRightStartOnRectangleIcon, ChevronRightIcon,
} from '@heroicons/react/24/outline';
import {cafe, LEVELS} from '../business';
import {level, plural, set, signOut, T, useStore, type Mode} from '../store';
import {useToast} from '@astryxdesign/core/Toast';
import {useUI} from '../ui/ctx';
import {LoyaltyCard} from '../ui/LoyaltyCard';
import {TopBar} from '../ui/parts';

const ic = {width: 22, height: 22, 'aria-hidden': true} as const;
const chev = <ChevronRightIcon width={18} height={18} aria-hidden="true" />;

export function Profile() {
  const {user, theme} = useStore();
  const {open} = useUI();
  const showToast = useToast();

  const settings = (
    <VStack gap={3}>
      <Heading level={2}>Оформление</Heading>
      <SegmentedControl label="Тема" layout="fill" value={theme} onChange={(v) => set({theme: v as Mode})}>
        <SegmentedControlItem value="system" label="Как в системе" />
        <SegmentedControlItem value="light" label="Светлая" />
        <SegmentedControlItem value="dark" label="Тёмная" />
      </SegmentedControl>
      <Text color="secondary" size="sm">
        {T(`Ликс, кофейня. ${cafe.city}, ежедневно ${cafe.open}:00–${cafe.close}:00.`)}
      </Text>
    </VStack>
  );

  if (!user)
    return (
      <>
        <TopBar>
          <Heading level={1}>Профиль</Heading>
        </TopBar>
        <VStack className="col" gap={6} paddingBlockStart={2}>
          <LoyaltyCard />
          <VStack gap={3}>
            <Heading level={2}>{T('Карта гостя в телефоне')}</Heading>
            <ul className="perks">
              <li>{T('−20% на первый заказ в приложении')}</li>
              <li>{T('Шестой кофе в подарок после пяти')}</li>
              <li>{T('До 10% заказа возвращается баллами')}</li>
              <li>{T('Капучино в подарок на день рождения')}</li>
            </ul>
            <Button label="Войти по номеру" variant="primary" size="lg" width="100%" onClick={() => open({k: 'auth'})} />
          </VStack>
          {settings}
        </VStack>
      </>
    );

  const lv = level(user), n = user.orders.length, next = LEVELS.find((l) => l.from > n);
  return (
    <>
      <TopBar>
        <Heading level={1}>{user.name || 'Профиль'}</Heading>
        <Text color="secondary" size="sm">
          {user.phone}
        </Text>
      </TopBar>
      <VStack className="col" gap={6} paddingBlockStart={2}>
        <LoyaltyCard />

        <VStack gap={2}>
          <HStack justify="between" vAlign="center">
            <Heading level={2}>{lv.name}</Heading>
            <Text color="secondary" size="sm">
              кешбэк {lv.cash}% баллами
            </Text>
          </HStack>
          <ProgressBar label="До следующего уровня" isLabelHidden value={next ? n - lv.from : 1} max={next ? next.from - lv.from : 1} />
          <Text color="secondary" size="sm">
            {next
              ? T(`Ещё ${next.from - n} ${plural(next.from - n, 'заказ', 'заказа', 'заказов')} до уровня «${next.name}» с кешбэком ${next.cash}%.`)
              : 'Максимальный уровень. Спасибо, что вы с нами.'}
          </Text>
        </VStack>

        <div className="stats">
          <span className="stat">
            <b>{user.points}</b>
            <span>{plural(user.points, 'балл', 'балла', 'баллов')}</span>
          </span>
          <span className="stat">
            <b>{user.stamps}/5</b>
            <span>чашек до подарка</span>
          </span>
          <span className="stat">
            <b>{user.sub}</b>
            <span>{plural(user.sub, 'чашка', 'чашки', 'чашек')} абонемента</span>
          </span>
        </div>

        <List hasDividers edge="outset">
          <ListItem label="Карта для кассы" startContent={<QrCodeIcon {...ic} />} endContent={chev} onClick={() => open({k: 'qr'})} />
          <ListItem
            label="Мои заказы"
            startContent={<ClockIcon {...ic} />}
            endContent={<HStack gap={2} vAlign="center"><Text color="secondary">{n}</Text>{chev}</HStack>}
            onClick={() => open({k: 'history'})}
          />
          <ListItem
            label="Пригласить друга"
            description="Другу −20%, вам 150 баллов"
            startContent={<ShareIcon {...ic} />}
            endContent={chev}
            onClick={() => open({k: 'promo', id: 'friend'})}
          />
          <ListItem
            label="День рождения"
            description={user.bday ? new Date(user.bday).toLocaleDateString('ru-RU', {day: 'numeric', month: 'long'}) : 'Укажите, и капучино будет в подарок'}
            startContent={<CakeIcon {...ic} />}
            endContent={chev}
            onClick={() => open({k: 'bday'})}
          />
          {cafe.phone && <ListItem label="Позвонить в кофейню" startContent={<PhoneIcon {...ic} />} href={`tel:${cafe.phone.replace(/[^+\d]/g, '')}`} />}
          <ListItem
            label="Выйти"
            startContent={<ArrowRightStartOnRectangleIcon {...ic} />}
            onClick={() => {
              const undo = signOut();
              showToast({
                body: 'Вы вышли. Баллы и чашки сохранены за номером',
                endContent: <Button label="Вернуть" variant="ghost" size="sm" onClick={undo} />,
              });
            }}
          />
        </List>
        {settings}
      </VStack>
    </>
  );
}
