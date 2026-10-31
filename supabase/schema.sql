-- =====================================================================
-- Amba Traders — database schema (Supabase / PostgreSQL)
--
-- Run this whole file once in Supabase → SQL Editor → New query → Run.
-- Then run seed.sql to load the 26 current designs.
--
-- Security model
--   • Visitors (anon) can read active products, categories and stock,
--     and place an order ONLY through the place_order() function.
--   • Admins (users listed in public.admins) can read and change everything.
--   • Stock is deducted when an order is confirmed and restored if it is
--     cancelled or moved back to "new" — all inside the database, atomically.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Admins
-- ---------------------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  name       text,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id    text primary key,                 -- slug, e.g. 'roman-glass'
  name  text not null,
  blurb text,
  cover text,                             -- image URL/path
  sort  int  not null default 0
);

create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  dno         int  not null unique,       -- design number printed on the catalogue
  name        text not null,
  colour      text,
  category_id text references public.categories (id) on update cascade on delete set null,
  fabric      text,
  pieces      int  not null default 3,
  bottom      text,
  dupatta     text,
  sizes_note  text,                       -- e.g. 'M to XXL'
  description text,
  image       text,                       -- full catalogue card
  thumb       text,                       -- grid thumbnail
  model       text,                       -- cropped model shot
  price       numeric(10, 2) check (price is null or price >= 0),  -- wholesale rate per piece
  is_active   boolean not null default true,
  sort        int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.stock (
  product_id uuid not null references public.products (id) on delete cascade,
  size       text not null check (size in ('M', 'L', 'XL', 'XXL')),
  qty        int  not null default 0 check (qty >= 0),
  primary key (product_id, size)
);

-- Every new product gets M / L / XL / XXL stock rows automatically.
create or replace function public.tg_product_stock_rows()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.stock (product_id, size, qty)
  select new.id, s, 0 from unnest(array['M', 'L', 'XL', 'XXL']) as s
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists product_stock_rows on public.products;
create trigger product_stock_rows after insert on public.products
for each row execute function public.tg_product_stock_rows();

-- ---------------------------------------------------------------------
-- Customers, orders, payments
-- ---------------------------------------------------------------------
create table if not exists public.customers (
  id           uuid primary key default gen_random_uuid(),
  shop_name    text not null,
  contact_name text,
  phone        text not null unique,      -- 10 digits, no +91
  city         text,
  gstin        text,
  address      text,
  notes        text,
  created_at   timestamptz not null default now()
);

create sequence if not exists public.order_no_seq start 1001;

create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  order_no         text not null unique default ('AT-' || nextval('public.order_no_seq')),
  customer_id      uuid not null references public.customers (id) on delete restrict,
  source           text not null default 'website'
                   check (source in ('website', 'whatsapp', 'shop', 'phone', 'other')),
  status           text not null default 'new'
                   check (status in ('new', 'confirmed', 'packed', 'dispatched', 'delivered', 'cancelled')),
  stock_deducted   boolean not null default false,
  discount         numeric(12, 2) not null default 0 check (discount >= 0),
  notes            text,                  -- internal admin notes
  customer_note    text,                  -- note typed by the buyer on the website
  contact_snapshot jsonb,                 -- details the buyer submitted with this order
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.order_items (
  id         bigint generated always as identity primary key,
  order_id   uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  dno        int,
  name       text,
  size       text not null check (size in ('M', 'L', 'XL', 'XXL')),
  qty        int  not null check (qty > 0),
  rate       numeric(10, 2) not null default 0 check (rate >= 0),
  unique (order_id, product_id, size)
);

create table if not exists public.payments (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  amount     numeric(12, 2) not null check (amount > 0),
  mode       text not null default 'upi' check (mode in ('cash', 'upi', 'bank', 'cheque', 'other')),
  reference  text,
  paid_on    date not null default current_date,
  note       text,
  created_at timestamptz not null default now()
);

create table if not exists public.stock_movements (
  id         bigint generated always as identity primary key,
  product_id uuid references public.products (id) on delete cascade,
  size       text not null,
  change     int  not null,
  reason     text,
  order_id   uuid references public.orders (id) on delete set null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists orders_customer_idx   on public.orders (customer_id);
create index if not exists orders_created_idx    on public.orders (created_at desc);
create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists payments_order_idx    on public.payments (order_id);
create index if not exists movements_product_idx on public.stock_movements (product_id, created_at desc);

-- ---------------------------------------------------------------------
-- Views (security_invoker = RLS of the caller applies)
-- ---------------------------------------------------------------------
create or replace view public.order_summary with (security_invoker = true) as
select
  o.id, o.order_no, o.customer_id, o.source, o.status, o.stock_deducted, o.discount,
  o.notes, o.customer_note, o.contact_snapshot, o.created_at, o.updated_at,
  c.shop_name, c.contact_name, c.phone, c.city,
  coalesce(i.pieces, 0)                                      as pieces,
  coalesce(i.lines, 0)                                       as lines,
  coalesce(i.unpriced, 0)                                    as unpriced_lines,
  coalesce(i.subtotal, 0)                                    as subtotal,
  coalesce(i.subtotal, 0) - o.discount                       as total,
  coalesce(p.paid, 0)                                        as paid,
  coalesce(i.subtotal, 0) - o.discount - coalesce(p.paid, 0) as balance
from public.orders o
join public.customers c on c.id = o.customer_id
left join lateral (
  select sum(qty) as pieces, count(*) as lines, sum(qty * rate) as subtotal,
         count(*) filter (where rate = 0) as unpriced
  from public.order_items where order_id = o.id
) i on true
left join lateral (
  select sum(amount) as paid from public.payments where order_id = o.id
) p on true;

create or replace view public.customer_balances with (security_invoker = true) as
select
  c.*,
  count(s.id) filter (where s.status <> 'cancelled')                   as order_count,
  coalesce(sum(s.total) filter (where s.status <> 'cancelled'), 0)     as billed,
  coalesce(sum(s.paid), 0)                                             as paid,
  coalesce(sum(s.total) filter (where s.status <> 'cancelled'), 0)
    - coalesce(sum(s.paid), 0)                                         as balance,
  max(s.created_at)                                                    as last_order_at
from public.customers c
left join public.order_summary s on s.customer_id = c.id
group by c.id;

-- ---------------------------------------------------------------------
-- Public: place an order from the website
-- ---------------------------------------------------------------------
create or replace function public.place_order(p_customer jsonb, p_items jsonb, p_note text default null)
returns text
language plpgsql security definer
set search_path = public
as $$
declare
  v_phone    text := regexp_replace(coalesce(p_customer ->> 'phone', ''), '\D', '', 'g');
  v_shop     text := btrim(coalesce(p_customer ->> 'shop_name', ''));
  v_customer uuid;
  v_order    uuid;
  v_no       text;
  v_item     jsonb;
  v_prod     public.products%rowtype;
  v_size     text;
  v_qty      int;
begin
  if length(v_phone) = 12 and left(v_phone, 2) = '91' then v_phone := right(v_phone, 10); end if;
  if length(v_phone) <> 10 then raise exception 'Please enter a valid 10-digit mobile number'; end if;
  if v_shop = '' or length(v_shop) > 120 then raise exception 'Please enter your shop name'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Your order is empty';
  end if;
  if jsonb_array_length(p_items) > 120 then raise exception 'Too many lines in one order'; end if;

  -- Existing customers are matched by phone and never overwritten from the website.
  insert into public.customers (shop_name, contact_name, phone, city, gstin, address)
  values (
    left(v_shop, 120),
    nullif(left(btrim(coalesce(p_customer ->> 'contact_name', '')), 80), ''),
    v_phone,
    nullif(left(btrim(coalesce(p_customer ->> 'city', '')), 80), ''),
    nullif(upper(left(btrim(coalesce(p_customer ->> 'gstin', '')), 15)), ''),
    nullif(left(btrim(coalesce(p_customer ->> 'address', '')), 300), '')
  )
  on conflict (phone) do nothing;
  select id into v_customer from public.customers where phone = v_phone;

  insert into public.orders (customer_id, source, status, customer_note, contact_snapshot)
  values (
    v_customer, 'website', 'new',
    nullif(left(btrim(coalesce(p_note, '')), 1000), ''),
    jsonb_build_object(
      'shop_name', left(v_shop, 120),
      'contact_name', left(btrim(coalesce(p_customer ->> 'contact_name', '')), 80),
      'phone', v_phone,
      'city', left(btrim(coalesce(p_customer ->> 'city', '')), 80),
      'gstin', upper(left(btrim(coalesce(p_customer ->> 'gstin', '')), 15)),
      'address', left(btrim(coalesce(p_customer ->> 'address', '')), 300)
    )
  )
  returning id, order_no into v_order, v_no;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_size := v_item ->> 'size';
    v_qty  := nullif(v_item ->> 'qty', '')::int;
    if v_size is null or v_size not in ('M', 'L', 'XL', 'XXL') then raise exception 'Invalid size in order'; end if;
    if v_qty is null or v_qty < 1 or v_qty > 5000 then raise exception 'Invalid quantity in order'; end if;

    select * into v_prod from public.products
    where id = (v_item ->> 'product_id')::uuid and is_active;
    if not found then raise exception 'A design in your order is no longer available'; end if;

    insert into public.order_items (order_id, product_id, dno, name, size, qty, rate)
    values (v_order, v_prod.id, v_prod.dno, v_prod.name, v_size, v_qty, coalesce(v_prod.price, 0))
    on conflict (order_id, product_id, size) do update set qty = public.order_items.qty + excluded.qty;
  end loop;

  return v_no;
end $$;

-- ---------------------------------------------------------------------
-- Admin: change order status (deducts / restores stock)
-- ---------------------------------------------------------------------
create or replace function public.set_order_status(p_order uuid, p_status text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_o     public.orders%rowtype;
  v_needs boolean;
  r       record;
  v_rows  int;
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  if p_status not in ('new', 'confirmed', 'packed', 'dispatched', 'delivered', 'cancelled') then
    raise exception 'Invalid status';
  end if;

  select * into v_o from public.orders where id = p_order for update;
  if not found then raise exception 'Order not found'; end if;

  v_needs := p_status in ('confirmed', 'packed', 'dispatched', 'delivered');

  if v_needs and not v_o.stock_deducted then
    for r in
      select product_id, size, sum(qty)::int as qty, max(dno) as dno
      from public.order_items
      where order_id = p_order and product_id is not null
      group by product_id, size
    loop
      update public.stock set qty = qty - r.qty
      where product_id = r.product_id and size = r.size and qty >= r.qty;
      get diagnostics v_rows = row_count;
      if v_rows = 0 then
        raise exception 'Not enough stock for D.No % size % (needs %). Update stock first.', r.dno, r.size, r.qty;
      end if;
      insert into public.stock_movements (product_id, size, change, reason, order_id)
      values (r.product_id, r.size, -r.qty, 'Order ' || v_o.order_no, p_order);
    end loop;
    update public.orders set stock_deducted = true where id = p_order;

  elsif not v_needs and v_o.stock_deducted then
    for r in
      select product_id, size, sum(qty)::int as qty
      from public.order_items
      where order_id = p_order and product_id is not null
      group by product_id, size
    loop
      insert into public.stock (product_id, size, qty) values (r.product_id, r.size, r.qty)
      on conflict (product_id, size) do update set qty = public.stock.qty + excluded.qty;
      insert into public.stock_movements (product_id, size, change, reason, order_id)
      values (r.product_id, r.size, r.qty, 'Order ' || v_o.order_no || ' → ' || p_status, p_order);
    end loop;
    update public.orders set stock_deducted = false where id = p_order;
  end if;

  update public.orders set status = p_status, updated_at = now() where id = p_order;
end $$;

-- ---------------------------------------------------------------------
-- Admin: create or edit an order (WhatsApp / shop / phone orders too)
-- p_items: [{ "product_id": uuid, "size": "M", "qty": 4, "rate": 450 }, ...]
-- ---------------------------------------------------------------------
create or replace function public.admin_save_order(
  p_order    uuid,
  p_customer uuid,
  p_source   text,
  p_status   text,
  p_discount numeric,
  p_notes    text,
  p_items    jsonb
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_id   uuid := p_order;
  v_o    public.orders%rowtype;
  v_item jsonb;
  v_prod public.products%rowtype;
  v_size text;
  v_qty  int;
  v_rate numeric;
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  if p_customer is null then raise exception 'Choose a customer'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Add at least one item';
  end if;

  if v_id is null then
    insert into public.orders (customer_id, source, status, discount, notes)
    values (p_customer, coalesce(p_source, 'other'), 'new', coalesce(p_discount, 0), nullif(btrim(coalesce(p_notes, '')), ''))
    returning id into v_id;
  else
    select * into v_o from public.orders where id = v_id for update;
    if not found then raise exception 'Order not found'; end if;
    -- Put stock back before replacing items; it is re-deducted below if needed.
    if v_o.stock_deducted then perform public.set_order_status(v_id, 'new'); end if;
    update public.orders
       set customer_id = p_customer, source = coalesce(p_source, source),
           discount = coalesce(p_discount, 0), notes = nullif(btrim(coalesce(p_notes, '')), ''),
           updated_at = now()
     where id = v_id;
    delete from public.order_items where order_id = v_id;
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_size := v_item ->> 'size';
    v_qty  := nullif(v_item ->> 'qty', '')::int;
    if v_size is null or v_size not in ('M', 'L', 'XL', 'XXL') then raise exception 'Invalid size'; end if;
    if v_qty is null or v_qty < 1 then raise exception 'Quantity must be at least 1'; end if;
    select * into v_prod from public.products where id = (v_item ->> 'product_id')::uuid;
    if not found then raise exception 'Product not found'; end if;
    v_rate := coalesce(nullif(v_item ->> 'rate', '')::numeric, v_prod.price, 0);
    insert into public.order_items (order_id, product_id, dno, name, size, qty, rate)
    values (v_id, v_prod.id, v_prod.dno, v_prod.name, v_size, v_qty, v_rate)
    on conflict (order_id, product_id, size) do update set qty = public.order_items.qty + excluded.qty;
  end loop;

  perform public.set_order_status(v_id, coalesce(p_status, 'new'));
  return v_id;
end $$;

-- ---------------------------------------------------------------------
-- Admin: set stock for one size (logged)
-- ---------------------------------------------------------------------
create or replace function public.admin_set_stock(p_product uuid, p_size text, p_qty int, p_reason text default null)
returns void
language plpgsql security definer
set search_path = public
as $$
declare v_old int;
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  if p_size not in ('M', 'L', 'XL', 'XXL') then raise exception 'Invalid size'; end if;
  if p_qty is null or p_qty < 0 then raise exception 'Stock cannot be negative'; end if;
  select qty into v_old from public.stock where product_id = p_product and size = p_size;
  insert into public.stock (product_id, size, qty) values (p_product, p_size, p_qty)
  on conflict (product_id, size) do update set qty = excluded.qty;
  if coalesce(v_old, 0) <> p_qty then
    insert into public.stock_movements (product_id, size, change, reason)
    values (p_product, p_size, p_qty - coalesce(v_old, 0), coalesce(nullif(btrim(p_reason), ''), 'Manual update'));
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.admins          enable row level security;
alter table public.categories      enable row level security;
alter table public.products        enable row level security;
alter table public.stock           enable row level security;
alter table public.customers       enable row level security;
alter table public.orders          enable row level security;
alter table public.order_items     enable row level security;
alter table public.payments        enable row level security;
alter table public.stock_movements enable row level security;

drop policy if exists "admins read self" on public.admins;
create policy "admins read self" on public.admins for select to authenticated using (user_id = auth.uid());

drop policy if exists "public read categories" on public.categories;
create policy "public read categories" on public.categories for select using (true);
drop policy if exists "admin write categories" on public.categories;
create policy "admin write categories" on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read active products" on public.products;
create policy "public read active products" on public.products for select using (is_active or public.is_admin());
drop policy if exists "admin write products" on public.products;
create policy "admin write products" on public.products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read stock" on public.stock;
create policy "public read stock" on public.stock for select using (
  exists (select 1 from public.products p where p.id = product_id and (p.is_active or public.is_admin()))
);
drop policy if exists "admin write stock" on public.stock;
create policy "admin write stock" on public.stock for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

do $$
declare t text;
begin
  foreach t in array array['customers', 'orders', 'order_items', 'payments', 'stock_movements'] loop
    execute format('drop policy if exists "admin all" on public.%I', t);
    execute format('create policy "admin all" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- Table privileges. Newer Supabase projects no longer grant these by default;
-- Row Level Security above still decides which rows each role can see or change.
grant usage on schema public to anon, authenticated;
grant select on public.categories, public.products, public.stock to anon, authenticated;
grant select on public.admins to authenticated;
grant select, insert, update, delete on
  public.categories, public.products, public.stock, public.customers,
  public.orders, public.order_items, public.payments, public.stock_movements
  to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Functions: only place_order is callable by visitors.
revoke execute on function public.place_order(jsonb, jsonb, text) from public;
grant  execute on function public.place_order(jsonb, jsonb, text) to anon, authenticated;
revoke execute on function public.set_order_status(uuid, text) from public, anon;
revoke execute on function public.admin_save_order(uuid, uuid, text, text, numeric, text, jsonb) from public, anon;
revoke execute on function public.admin_set_stock(uuid, text, int, text) from public, anon;
grant  execute on function public.set_order_status(uuid, text) to authenticated;
grant  execute on function public.admin_save_order(uuid, uuid, text, text, numeric, text, jsonb) to authenticated;
grant  execute on function public.admin_set_stock(uuid, text, int, text) to authenticated;

grant select on public.order_summary, public.customer_balances to authenticated;

-- ---------------------------------------------------------------------
-- Storage bucket for product images (public read, admin write)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "public read product images" on storage.objects;
create policy "public read product images" on storage.objects for select
  using (bucket_id = 'product-images');
drop policy if exists "admin upload product images" on storage.objects;
create policy "admin upload product images" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "admin update product images" on storage.objects;
create policy "admin update product images" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "admin delete product images" on storage.objects;
create policy "admin delete product images" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
