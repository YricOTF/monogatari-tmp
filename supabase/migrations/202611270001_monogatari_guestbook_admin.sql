begin;
create extension if not exists pgcrypto with schema extensions;

create table if not exists monogatari_guestbook.admin_access (
  singleton boolean primary key default true check (singleton),
  password_hash text not null,
  failures integer not null default 0,
  window_started_at timestamptz
);
create table if not exists monogatari_guestbook.admin_sessions (
  token_hash bytea primary key,
  expires_at timestamptz not null
);
alter table monogatari_guestbook.admin_access enable row level security;
alter table monogatari_guestbook.admin_sessions enable row level security;
revoke all on table monogatari_guestbook.admin_access, monogatari_guestbook.admin_sessions
  from public, anon, authenticated;

create or replace function public.monogatari_guestbook_admin_login(p_password text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  settings monogatari_guestbook.admin_access%rowtype;
  now_at timestamptz := pg_catalog.clock_timestamp();
  session_token uuid;
begin
  if p_password is null or p_password !~ '^[0-9]{6}$' then
    return pg_catalog.jsonb_build_object('status', 'invalid');
  end if;
  select * into settings from monogatari_guestbook.admin_access where singleton for update;
  if not found then
    return pg_catalog.jsonb_build_object('status', 'unavailable');
  end if;
  if settings.window_started_at is null or settings.window_started_at <= now_at - interval '1 hour' then
    settings.failures := 0;
    settings.window_started_at := now_at;
  end if;
  if settings.failures >= 5 then
    return pg_catalog.jsonb_build_object('status', 'locked');
  end if;
  if extensions.crypt(p_password, settings.password_hash) is distinct from settings.password_hash then
    update monogatari_guestbook.admin_access
      set failures = settings.failures + 1, window_started_at = settings.window_started_at
      where singleton;
    return pg_catalog.jsonb_build_object('status', 'invalid');
  end if;
  update monogatari_guestbook.admin_access set failures = 0, window_started_at = null where singleton;
  delete from monogatari_guestbook.admin_sessions where expires_at <= now_at;
  session_token := pg_catalog.gen_random_uuid();
  insert into monogatari_guestbook.admin_sessions(token_hash, expires_at)
    values (extensions.digest(session_token::text, 'sha256'), now_at + interval '1 hour');
  return pg_catalog.jsonb_build_object('status', 'ok', 'token', session_token);
end;
$$;

create or replace function monogatari_guestbook.require_admin(p_token uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (
    select 1 from monogatari_guestbook.admin_sessions
    where token_hash = extensions.digest(p_token::text, 'sha256')
      and expires_at > pg_catalog.clock_timestamp()
  ) then
    raise exception using errcode = 'PT401', message = 'Session expired';
  end if;
end;
$$;

create or replace function public.monogatari_guestbook_admin_list(p_token uuid, p_published boolean, p_offset integer)
returns table (id uuid, nickname text, message text, created_at timestamptz, published_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  perform monogatari_guestbook.require_admin(p_token);
  return query
    select m.id, m.nickname, m.message, m.created_at, m.published_at
    from monogatari_guestbook.messages as m
    where (m.published_at is not null) = p_published
    order by m.created_at desc, m.id desc
    limit 31 offset greatest(0, p_offset);
end;
$$;

create or replace function public.monogatari_guestbook_admin_review(p_token uuid, p_id uuid, p_publish boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform monogatari_guestbook.require_admin(p_token);
  if p_publish is null then
    raise exception using errcode = '22023', message = 'Missing review action';
  end if;
  update monogatari_guestbook.messages as m
    set published_at = case when p_publish then coalesce(m.published_at, pg_catalog.now()) else null end
    where m.id = p_id;
  if not found then raise exception using errcode = 'PT404', message = 'Message not found'; end if;
end;
$$;

create or replace function public.monogatari_guestbook_admin_logout(p_token uuid)
returns void language sql security definer set search_path = '' as $$
  delete from monogatari_guestbook.admin_sessions
  where token_hash = extensions.digest(p_token::text, 'sha256');
$$;

revoke all on function monogatari_guestbook.require_admin(uuid),
  public.monogatari_guestbook_admin_login(text),
  public.monogatari_guestbook_admin_list(uuid, boolean, integer),
  public.monogatari_guestbook_admin_review(uuid, uuid, boolean),
  public.monogatari_guestbook_admin_logout(uuid) from public, anon, authenticated;
grant execute on function public.monogatari_guestbook_admin_login(text),
  public.monogatari_guestbook_admin_list(uuid, boolean, integer),
  public.monogatari_guestbook_admin_review(uuid, uuid, boolean),
  public.monogatari_guestbook_admin_logout(uuid) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
