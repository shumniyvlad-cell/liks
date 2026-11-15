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
  `);
}
