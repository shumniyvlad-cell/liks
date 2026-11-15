import {lazy, Suspense, useCallback, useEffect, useMemo, useState} from 'react';
import {HStack} from '@astryxdesign/core/HStack';
import {useToast} from '@astryxdesign/core/Toast';
import {BookOpenIcon, TagIcon, UserIcon} from '@heroicons/react/24/outline';
import {BookOpenIcon as BookSolid, TagIcon as TagSolid, UserIcon as UserSolid} from '@heroicons/react/24/solid';
import {byId} from './business';
import {cartCount, plural, refreshMe, rub, totals, useStore} from './store';
import {UICtx, type Sheet, type TabId, type UI} from './ui/ctx';
import {CupIcon, CupSolid} from './ui/icons';
import {useSheetBack} from './useSheetBack';
import {Home} from './screens/Home';

// Всё, кроме главной, грузится отдельно: первый экран открывается быстрее.
const Menu = lazy(() => import('./screens/Menu').then((m) => ({default: m.Menu})));
const Promos = lazy(() => import('./screens/Promos').then((m) => ({default: m.Promos})));
const Profile = lazy(() => import('./screens/Profile').then((m) => ({default: m.Profile})));
const Sheets = lazy(() => import('./sheets/Sheets').then((m) => ({default: m.Sheets})));

const TABS: {id: TabId; label: string; icon: typeof UserIcon; on: typeof UserIcon}[] = [
  {id: 'home', label: 'Ликс', icon: CupIcon as typeof UserIcon, on: CupSolid as typeof UserIcon},
  {id: 'menu', label: 'Меню', icon: BookOpenIcon, on: BookSolid},
  {id: 'promos', label: 'Акции', icon: TagIcon, on: TagSolid},
  {id: 'profile', label: 'Профиль', icon: UserIcon, on: UserSolid},
];
const fromHash = (): TabId => TABS.find((t) => t.id === location.hash.replace('#/', ''))?.id ?? 'home';

export default function App() {
  const [tab, setTab] = useState<TabId>(fromHash);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [sheetsWanted, setSheetsWanted] = useState(false);
  const s = useStore();
  const showToast = useToast();
  const n = cartCount(s);

  // Баллы и чашки могли начислить на кассе: при запуске берём свежие с сервера.
  useEffect(() => void refreshMe(), []);

  // Вкладка живёт в адресе: ссылку можно отправить, «Назад» работает как в приложении.
  useEffect(() => {
    const onHash = () => {
      setTab(fromHash());
      scrollTo({top: 0});
    };
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);

  const close = useCallback(() => setSheet(null), []);
  useSheetBack(sheet !== null, close);

  const ui: UI = useMemo(
    () => ({
      sheet,
      open: (next) => {
        setSheetsWanted(true);
        setSheet(next);
      },
      close,
      go: (next) => {
        setSheet(null);
        if (next === fromHash()) return scrollTo({top: 0, behavior: 'smooth'});
        location.hash = next === 'home' ? '/' : `/${next}`;
      },
      toast: (body) => showToast({body}),
    }),
    [sheet, close, showToast],
  );

  return (
    <UICtx.Provider value={ui}>
      <div className="app">
        {tab === 'home' && <Home />}
        <Suspense fallback={null}>
          {tab === 'menu' && <Menu />}
          {tab === 'promos' && <Promos />}
          {tab === 'profile' && <Profile />}
        </Suspense>

        {n > 0 && tab !== 'profile' && (
          <button className="orderbar" type="button" onClick={() => ui.open({k: 'cart'})} aria-label={`Ваш заказ: ${n} ${plural(n, 'позиция', 'позиции', 'позиций')}, ${rub(totals(s).sub)}. Оформить`}>
            <span className="orderbar__n">{n}</span>
            <span className="orderbar__t">
              <b>Ваш заказ</b>
              <small>{s.cart.map((l) => byId(l.id).name).join(', ')}</small>
            </span>
            <span className="orderbar__go">{rub(totals(s).sub)}</span>
          </button>
        )}

        <nav className="dock glass" aria-label="Разделы">
          <HStack gap={1} vAlign="center">
            {TABS.map((t) => {
              const on = tab === t.id;
              const I = on ? t.on : t.icon;
              return (
                <button key={t.id} className="dock__item" type="button" aria-current={on ? 'page' : undefined} onClick={() => ui.go(t.id)}>
                  <I aria-hidden="true" />
                  {t.label}
                </button>
              );
            })}
          </HStack>
        </nav>

        <Suspense fallback={null}>{sheetsWanted && <Sheets />}</Suspense>
      </div>
    </UICtx.Provider>
  );
}
