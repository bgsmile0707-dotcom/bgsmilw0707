-- Run once in this project's Supabase SQL Editor. Re-running preserves orders and catalog edits.
begin;

create table if not exists public.storefront_products (
  id text primary key,
  name text not null,
  price integer not null check (price > 0 and price <= 1000000),
  variants text[] not null check (cardinality(variants) > 0),
  stock integer not null default 0 check (stock >= 0),
  active boolean not null default true,
  is_demo boolean not null default true
);

create table if not exists public.storefront_orders (
  id uuid primary key,
  created_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending','confirmed','shipped','cancelled')),
  customer_name text not null,
  phone text not null,
  email text,
  delivery text not null check (delivery in ('home','seven','family')),
  address text,
  store_name text,
  store_code text,
  note text,
  items jsonb not null,
  subtotal integer not null check (subtotal > 0),
  shipping integer not null check (shipping >= 0),
  total integer not null check (total = subtotal + shipping),
  is_demo boolean not null,
  request_hash text not null
);

alter table public.storefront_products enable row level security;
alter table public.storefront_orders enable row level security;
revoke all on public.storefront_products, public.storefront_orders from anon, authenticated;
grant select on public.storefront_products to anon, authenticated;
grant all on public.storefront_products, public.storefront_orders to service_role;
drop policy if exists storefront_visible_products on public.storefront_products;
create policy storefront_visible_products on public.storefront_products
  for select to anon, authenticated using (active = true);
-- No public order policy: customers cannot list, read, update or delete any orders.

insert into public.storefront_products (id,name,price,variants,stock) values
 ('mug','日常陶瓷馬克杯',480,array['霧白 / 350ml','墨綠 / 350ml'],20),
 ('tote','輕日常帆布提袋',590,array['原色 / 標準款','黑色 / 標準款'],15),
 ('book','靈感隨行筆記本',280,array['米白 / 橫線','米白 / 空白'],30),
 ('mug-pair','雙人日常杯組',880,array['霧白雙杯組'],10),
 ('tote-large','週末大容量提袋',690,array['原色 / 加大款'],12),
 ('book-set','生活紀錄雙本組',490,array['橫線＋空白'],18)
on conflict (id) do nothing;

create or replace function public.storefront_place_order(
  p_request_id uuid,
  p_customer jsonb,
  p_items jsonb,
  p_expected_total integer
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_order public.storefront_orders%rowtype;
  v_product public.storefront_products%rowtype;
  v_line jsonb;
  v_lines jsonb := '[]'::jsonb;
  v_hash text;
  v_subtotal integer := 0;
  v_shipping integer;
  v_qty integer;
  v_total_qty integer;
  v_product_id text;
  v_demo boolean := false;
begin
  if p_request_id is null or p_customer is null or jsonb_typeof(p_customer) <> 'object'
     or p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'INVALID_REQUEST' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) not between 1 and 20 or octet_length(p_customer::text) > 4000 then
    raise exception 'INVALID_REQUEST' using errcode = '22023';
  end if;
  if length(btrim(coalesce(p_customer->>'name',''))) not between 1 and 30
     or coalesce(p_customer->>'phone','') !~ '^09[0-9]{8}$'
     or coalesce(p_customer->>'delivery','') not in ('home','seven','family')
     or length(coalesce(p_customer->>'note','')) > 300
     or length(coalesce(p_customer->>'email','')) > 254
     or (coalesce(p_customer->>'email','') <> '' and p_customer->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$') then
    raise exception 'INVALID_CUSTOMER' using errcode = '22023';
  end if;
  if p_customer->>'delivery' = 'home' then
    if length(btrim(coalesce(p_customer->>'address',''))) not between 1 and 150 then
      raise exception 'INVALID_ADDRESS' using errcode = '22023';
    end if;
    v_shipping := 100;
  else
    if length(btrim(coalesce(p_customer->>'store',''))) not between 1 and 50
       or coalesce(p_customer->>'storeCode','') !~ '^[0-9]{6}$' then
      raise exception 'INVALID_STORE' using errcode = '22023';
    end if;
    v_shipping := 60;
  end if;
  for v_line in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_line) <> 'object' or coalesce(v_line->>'id','') = ''
       or jsonb_typeof(v_line->'qty') is distinct from 'number'
       or coalesce(v_line->>'qty','') !~ '^([1-9]|10)$'
       or length(coalesce(v_line->>'variant','')) not between 1 and 100 then
      raise exception 'INVALID_ITEM' using errcode = '22023';
    end if;
  end loop;
  if exists (select 1 from jsonb_array_elements(p_items) x group by x->>'id',x->>'variant' having count(*) > 1) then
    raise exception 'DUPLICATE_ITEM' using errcode = '22023';
  end if;
  v_hash := md5(p_customer::text || p_items::text || coalesce(p_expected_total::text,''));
  -- Serialize retries for one random request UUID; never create the same order twice.
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
  select * into v_order from public.storefront_orders where id = p_request_id;
  if found then
    if v_order.request_hash <> v_hash then
      raise exception 'REQUEST_CONFLICT' using errcode = '22023';
    end if;
  else
    -- Acquire product locks in a consistent order, then check stock across all variants.
    for v_product_id in select distinct value->>'id' from jsonb_array_elements(p_items) order by 1 loop
      select * into v_product from public.storefront_products where id = v_product_id and active for update;
      if not found then raise exception 'PRODUCT_UNAVAILABLE' using errcode = '22023'; end if;
      select sum((value->>'qty')::integer) into v_total_qty from jsonb_array_elements(p_items) where value->>'id' = v_product_id;
      if v_total_qty > v_product.stock then raise exception 'OUT_OF_STOCK' using errcode = '22023'; end if;
      v_demo := v_demo or v_product.is_demo;
      for v_line in select value from jsonb_array_elements(p_items) where value->>'id' = v_product_id loop
        if not (v_line->>'variant' = any(v_product.variants)) then
          raise exception 'INVALID_VARIANT' using errcode = '22023';
        end if;
        v_qty := (v_line->>'qty')::integer;
        v_subtotal := v_subtotal + v_product.price * v_qty;
        v_lines := v_lines || jsonb_build_array(jsonb_build_object('id',v_product.id,'name',v_product.name,'variant',v_line->>'variant','qty',v_qty,'price',v_product.price));
      end loop;
      update public.storefront_products set stock = stock - v_total_qty where id = v_product_id;
    end loop;
    if p_expected_total is null or p_expected_total <> v_subtotal + v_shipping then
      -- Any earlier stock updates roll back with this exception.
      raise exception 'PRICE_CHANGED' using errcode = '22023';
    end if;
    insert into public.storefront_orders
      (id,customer_name,phone,email,delivery,address,store_name,store_code,note,items,subtotal,shipping,total,is_demo,request_hash)
    values
      (p_request_id,btrim(p_customer->>'name'),p_customer->>'phone',nullif(p_customer->>'email',''),p_customer->>'delivery',
       case when p_customer->>'delivery' = 'home' then btrim(p_customer->>'address') end,
       case when p_customer->>'delivery' <> 'home' then btrim(p_customer->>'store') end,
       case when p_customer->>'delivery' <> 'home' then p_customer->>'storeCode' end,
       nullif(p_customer->>'note',''),v_lines,v_subtotal,v_shipping,v_subtotal+v_shipping,v_demo,v_hash)
    returning * into v_order;
  end if;
  -- Only this submitter receives their receipt. No anonymous order lookup endpoint.
  return jsonb_build_object('id',v_order.id,'createdAt',v_order.created_at,'status','已收到，待商家確認',
    'items',v_order.items,'subtotal',v_order.subtotal,'shipping',v_order.shipping,'total',v_order.total,'isDemo',v_order.is_demo);
end;
$$;
revoke all on function public.storefront_place_order(uuid,jsonb,jsonb,integer) from public;
grant execute on function public.storefront_place_order(uuid,jsonb,jsonb,integer) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
