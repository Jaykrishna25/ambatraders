-- Run once in Supabase → SQL Editor if admin login says "not an admin"
-- or the website can't load products. Safe to run more than once.
grant usage on schema public to anon, authenticated;
grant select on public.categories, public.products, public.stock to anon, authenticated;
grant select on public.admins to authenticated;
grant select, insert, update, delete on
  public.categories, public.products, public.stock, public.customers,
  public.orders, public.order_items, public.payments, public.stock_movements
  to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant select on public.order_summary, public.customer_balances to authenticated;
grant execute on function public.place_order(jsonb, jsonb, text) to anon, authenticated;
grant execute on function public.set_order_status(uuid, text) to authenticated;
grant execute on function public.admin_save_order(uuid, uuid, text, text, numeric, text, jsonb) to authenticated;
grant execute on function public.admin_set_stock(uuid, text, int, text) to authenticated;
grant execute on function public.is_admin() to anon, authenticated;
