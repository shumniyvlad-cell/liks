// Postgres: подключение и схема. Схема создаётся при запуске и только дополняется,
// данные гостей при обновлении не трогаем.

import postgres from 'postgres';

export const sql = postgres(process.env.DATABASE_URL ?? 'postgres://liks@127.0.0.1:5432/liks', {
  max: 10,
  idle_timeout: 30,
  onnotice: () => {},
});

export async function migrate() {
  await sql.unsafe(`
    create table if not exists users (
      id bigserial primary key,
      phone text not null unique,
      name text not null default '',
      bday date,
      points int not null default 0 check (points >= 0),
      stamps int not null default 0 check (stamps between 0 and 5),
      sub int not null default 0 check (sub >= 0),
      card text not null unique,
      created_at timestamptz not null default now()
    );
    create table if not exists auth_codes (
      phone text primary key,
      code_hash text not null,
      expires_at timestamptz not null,
      attempts int not null default 0,
      sent_at timestamptz not null default now()
    );
    create table if not exists sessions (
      token_hash text primary key,
      user_id bigint not null references users on delete cascade,
      expires_at timestamptz not null,
      created_at timestamptz not null default now()
    );
    create table if not exists orders (
      id bigserial primary key,
      no int not null,
      user_id bigint not null references users,
      created_at timestamptz not null default now(),
      mode text not null,
      how text not null,
      pay text not null,
      paid boolean not null default false,
      status text not null default 'new',
      items jsonb not null,
      lines jsonb not null,
      details jsonb not null,
      totals jsonb not null,
      total int not null
    );
    alter table orders add column if not exists spend jsonb not null default '{}';
    alter table orders add column if not exists credit jsonb not null default '{}';
    alter table orders add column if not exists credited boolean not null default false;
    create index if not exists orders_user_idx on orders (user_id, created_at desc);
    create index if not exists orders_day_idx on orders (created_at desc);

    -- Согласие на обработку ПДн: когда и с какой редакцией политики.
    alter table users add column if not exists consent_at timestamptz;
    alter table users add column if not exists consent_ver text;

    -- Админка: вход по логину и паролю (scrypt), своя сессия.
    create table if not exists admins (
      id bigserial primary key,
      login text not null unique,
      name text not null default '',
      pass_hash text not null,
      created_at timestamptz not null default now()
    );
    create table if not exists admin_sessions (
      token_hash text primary key,
      admin_id bigint not null references admins on delete cascade,
      expires_at timestamptz not null,
      created_at timestamptz not null default now()
    );

    -- Мелкие настройки и секреты сервера (токен SIGMA хранится зашифрованным).
    create table if not exists kv (
      key text primary key,
      value text not null,
      updated_at timestamptz not null default now()
    );

    -- Копия кассы SIGMA: позиции меню с ценами, чеки, остатки, приходы, смены.
    create table if not exists sigma_items (
      id text primary key,            -- позиция меню SIGMA (menuProduct)
      product_id text not null,       -- товар каталога
      variation_id text not null,
      name text not null,
      price numeric not null,
      unit text not null,
      weight numeric,                 -- выход по техкарте, г
      cost numeric,                   -- себестоимость по техкарте и закупочным ценам
      seen_at timestamptz not null default now()
    );
    create table if not exists sigma_ops (
      id text primary key,
      at timestamptz not null,
      method text not null,           -- Cash | Card | …
      kind text not null,             -- Payment | Refund
      sum numeric not null,
      discount numeric not null default 0,
      cashier text not null default '',
      lines jsonb not null
    );
    create index if not exists sigma_ops_at_idx on sigma_ops (at desc);
    create table if not exists sigma_stock (
      id text primary key,
      name text not null,
      unit text not null,
      remainder numeric not null,
      buy_price numeric not null default 0,
      buy_amount numeric not null default 0,
      seen_at timestamptz not null default now()
    );
    create table if not exists sigma_waybills (
      id text primary key,
      at timestamptz,
      sum numeric not null default 0,
      supplier text not null default '',
      status text not null default '',
      data jsonb not null
    );
    create table if not exists sigma_shifts (
      id text primary key,
      no text not null,
      opened timestamptz,
      closed timestamptz,
      total numeric not null default 0,
      cash numeric not null default 0,
      card numeric not null default 0,
      drawer numeric not null default 0
    );

    -- Меню приложения: карточка блюда (фото, описание, раздел, граммовка) и связь с позициями кассы.
    -- Цена всегда из кассы.
    create table if not exists menu_items (
      id text primary key,
      sort int not null default 0,
      data jsonb not null,
      updated_at timestamptz not null default now()
    );
  `);
}
