// Админка Ликса: вход, каркас с разделами, состояние связи с кассой.
import {useCallback, useEffect, useRef, useState} from 'react';
import {AppShell} from '@astryxdesign/core/AppShell';
import {SideNav, SideNavHeading, SideNavItem} from '@astryxdesign/core/SideNav';
import {VStack} from '@astryxdesign/core/VStack';
import {HStack} from '@astryxdesign/core/HStack';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Card} from '@astryxdesign/core/Card';
import {Banner} from '@astryxdesign/core/Banner';
import {Skeleton} from '@astryxdesign/core/Skeleton';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Dialog} from '@astryxdesign/core/Dialog';
import {adm, ago, AdminError, setOnLogout, type Sync} from './api';
import Summary from './Summary';
import MenuPage from './MenuPage';
import StockPage from './StockPage';

type Me = {admin: {login: string; name: string}; sync: Sync; sigma: boolean};
const PAGES = [
  {id: 'summary', label: 'Сводка'},
  {id: 'menu', label: 'Меню'},
  {id: 'stock', label: 'Склад и поставки'},
] as const;
type PageId = (typeof PAGES)[number]['id'];
const fromHash = (): PageId => PAGES.find((p) => '#/' + p.id === location.hash)?.id ?? 'summary';

export default function Admin() {
  const [me, setMe] = useState<Me | null | 'loading' | 'offline'>('loading');
  const load = useCallback(() => {
    adm<Me>('/me')
      .then(setMe)
      .catch((e: AdminError) => setMe(e.status === 401 ? null : 'offline'));
  }, []);
  useEffect(() => {
    setOnLogout(() => setMe(null));
    load();
  }, [load]);

  if (me === 'loading')
    return (
      <VStack gap={3} padding={6}>
        <Skeleton height={32} width={240} />
        <Skeleton height={120} />
      </VStack>
    );
  if (me === 'offline')
    return (
      <VStack gap={3} padding={6} align="start">
        <Heading level={1}>Нет связи с сервером</Heading>
        <Text color="secondary">Проверьте интернет и повторите.</Text>
        <Button label="Повторить" variant="primary" onClick={() => (setMe('loading'), load())} />
      </VStack>
    );
  if (!me) return <Login onDone={load} />;
  return <Shell me={me} reload={load} />;
}

function Login({onDone}: {onDone: () => void}) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<{field?: string; text: string} | null>(null);
  const [busy, setBusy] = useState(false);
  const passRef = useRef<HTMLInputElement>(null);
  const send = () => {
    if (busy) return;
    if (!login.trim()) return setErr({field: 'login', text: 'Впишите логин.'});
    if (!password) return setErr({field: 'password', text: 'Впишите пароль.'});
    setBusy(true);
    adm('/login', {body: {login, password}})
      .then(onDone)
      .catch((e: AdminError) => {
        setErr({field: e.field ?? 'password', text: e.message});
        passRef.current?.focus();
      })
      .finally(() => setBusy(false));
  };
  return (
    <main className="adm-login">
      <Card padding={6} width="100%" maxWidth={400}>
        <VStack gap={4}>
          <VStack gap={1}>
            <Heading level={1}>
              <span className="display adm-title">Ликс</span>
            </Heading>
            <Text color="secondary">Админка кофейни: продажи из кассы, меню приложения, склад.</Text>
          </VStack>
          <TextInput label="Логин" autoComplete="username" hasAutoFocus value={login} onEnter={send}
            status={err?.field === 'login' ? {type: 'error', message: err.text} : undefined}
            onChange={(v) => (setErr(null), setLogin(v))} />
          <TextInput label="Пароль" type="password" autoComplete="current-password" value={password} onEnter={send} ref={passRef}
            status={err && err.field !== 'login' ? {type: 'error', message: err.text} : undefined}
            onChange={(v) => (setErr(null), setPassword(v))} />
          <Button label="Войти" variant="primary" size="lg" width="100%" isLoading={busy} onClick={send} />
        </VStack>
      </Card>
    </main>
  );
}

function Shell({me, reload}: {me: Me; reload: () => void}) {
  const [page, setPage] = useState<PageId>(fromHash);
  const [sync, setSync] = useState<Sync>(me.sync);
  const [syncing, setSyncing] = useState(false);
  const [syncErr, setSyncErr] = useState('');
  const [stamp, setStamp] = useState(0);
  const [pass, setPass] = useState(false);

  useEffect(() => {
    const on = () => setPage(fromHash());
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  const go = (p: PageId) => {
    location.hash = '/' + p;
    setPage(p);
  };
  const refresh = () => {
    setSyncing(true);
    setSyncErr('');
    adm<{sync: Sync}>('/sync', {body: {}})
      .then((r) => (setSync(r.sync), setStamp((x) => x + 1)))
      .catch((e: AdminError) => setSyncErr(e.message))
      .finally(() => setSyncing(false));
  };
  const logout = () => adm('/logout', {body: {}}).finally(reload);

  return (
    <AppShell
      contentPadding={0}
      sideNav={
        <SideNav
          header={<SideNavHeading heading="Ликс" superheading="Админка" />}
          footer={
            <VStack gap={2} padding={2}>
              <Text size="sm" color="secondary">{me.admin.name || me.admin.login}</Text>
              <HStack gap={2}>
                <Button label="Пароль" size="sm" variant="secondary" onClick={() => setPass(true)} />
                <Button label="Выйти" size="sm" variant="secondary" onClick={logout} />
              </HStack>
            </VStack>
          }
        >
          {PAGES.map((p) => (
            <SideNavItem key={p.id} label={p.label} isSelected={page === p.id} href={'#/' + p.id} onClick={(e) => (e.preventDefault(), go(p.id))} />
          ))}
        </SideNav>
      }
    >
      <main className="adm-main">
        <HStack gap={3} justify="between" align="center" wrap="wrap" className="adm-top">
          <Heading level={1}>
            <span className="display adm-title">{PAGES.find((p) => p.id === page)!.label}</span>
          </Heading>
          <HStack gap={3} align="center" wrap="wrap">
            <StatusDot variant={sync.ok ? 'success' : 'error'} label={sync.ok ? `Касса: обновлено ${ago(sync.at)}` : `Касса: ${sync.error ?? 'нет связи'}`} />
            <Button label="Обновить из кассы" size="sm" variant="secondary" isLoading={syncing} onClick={refresh} />
          </HStack>
        </HStack>
        {syncErr && <Banner status="error" title="Не обновилось" description={syncErr} />}
        {!me.sigma && <Banner status="warning" title="Касса не подключена" description="На сервере не заданы данные SIGMA. Цены и продажи берутся из последней копии." />}
        {page === 'summary' && <Summary key={stamp} />}
        {page === 'menu' && <MenuPage key={stamp} />}
        {page === 'stock' && <StockPage key={stamp} />}
      </main>
      <PasswordDialog isOpen={pass} onClose={() => setPass(false)} />
    </AppShell>
  );
}

function PasswordDialog({isOpen, onClose}: {isOpen: boolean; onClose: () => void}) {
  const [old, setOld] = useState('');
  const [next, setNext] = useState('');
  const [err, setErr] = useState<{field?: string; text: string} | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const close = () => (setOld(''), setNext(''), setErr(null), setDone(false), onClose());
  const save = () => {
    if (next.length < 10) return setErr({field: 'next', text: 'Не короче 10 символов.'});
    setBusy(true);
    adm('/password', {body: {old, next}})
      .then(() => setDone(true))
      .catch((e: AdminError) => setErr({field: e.field, text: e.message}))
      .finally(() => setBusy(false));
  };
  return (
    <Dialog isOpen={isOpen} onOpenChange={(v) => !v && close()} aria-label="Смена пароля" purpose="form">
      <VStack gap={4} padding={5}>
        <Heading level={2}>Смена пароля</Heading>
        {done ? (
          <>
            <Text>Пароль сменён. На других устройствах нужно войти заново.</Text>
            <Button label="Готово" variant="primary" onClick={close} />
          </>
        ) : (
          <>
            <TextInput label="Старый пароль" type="password" autoComplete="current-password" value={old} onChange={(v) => (setErr(null), setOld(v))}
              status={err?.field === 'old' ? {type: 'error', message: err.text} : undefined} />
            <TextInput label="Новый пароль" type="password" autoComplete="new-password" description="Не короче 10 символов" value={next} onChange={(v) => (setErr(null), setNext(v))}
              onEnter={save} status={err && err.field !== 'old' ? {type: 'error', message: err.text} : undefined} />
            <HStack gap={2} justify="end">
              <Button label="Отмена" variant="secondary" onClick={close} />
              <Button label="Сменить пароль" variant="primary" isLoading={busy} onClick={save} />
            </HStack>
          </>
        )}
      </VStack>
    </Dialog>
  );
}
