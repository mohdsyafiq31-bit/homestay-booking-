-- Homestay Calendar: run this once in Supabase (SQL Editor, then New query, then Run).
-- BEFORE running, change CHANGE-ME-PASSCODE below to your own strong staff passcode.

create table if not exists settings (key text primary key, value text not null);
insert into settings values ('passcode', 'SRIKILIM') on conflict (key) do nothing;

-- One row per room type per night. The primary key makes double booking impossible.
create table if not exists nights (id text primary key, data jsonb not null);

alter table settings enable row level security;   -- no policies: the passcode can never be read through the API
alter table nights enable row level security;
drop policy if exists "anyone can edit and view nights" on nights;
create policy "anyone can view and edit nights" on nights for select using (true);
-- No insert/update/delete policies: changes only happen through the functions below.

create or replace function check_pass(p text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p is distinct from (select value from settings where key = 'passcode') then
    raise exception 'passcode' using errcode = 'PT401';
  end if;
end $$;
revoke execute on function check_pass(text) from public, anon, authenticated;

create or replace function book_night(p_id text, p_data jsonb, p_pass text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform check_pass(p_pass);
  if p_id !~ '^t[1-7]_\d{4}-\d{2}-\d{2}$' or coalesce(trim(p_data->>'name'), '') = '' then
    raise exception 'invalid' using errcode = 'PT400';
  end if;
  insert into nights (id, data) values (p_id, p_data);  -- duplicate id raises a conflict (HTTP 409)
end $$;

create or replace function update_income(p_id text, p_income numeric, p_pass text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform check_pass(p_pass);
  if p_income is null or p_income < 0 then raise exception 'invalid' using errcode = 'PT400'; end if;
  update nights set data = jsonb_set(data, '{income}', to_jsonb(p_income)) where id = p_id;
end $$;

create or replace function cancel_night(p_id text, p_pass text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform check_pass(p_pass);
  delete from nights where id = p_id;
end $$;

grant execute on function book_night(text, jsonb, text), update_income(text, numeric, text), cancel_night(text, text) to anon, authenticated;
update settings set value = 'SRIKILIM' where key = 'passcode';