-- Observability: application logs + client RPC
create table if not exists public.app_logs (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  level text check (level in ('error','warn','info','perf')) not null,
  category text,
  message text,
  error_name text,
  stack text,
  route text,
  user_id uuid,
  session_id text,
  duration_ms integer,
  meta jsonb
);

alter table public.app_logs enable row level security;

-- definer RPC to insert logs safely
create or replace function public.log_client_event(
  p_level text,
  p_category text,
  p_message text,
  p_error_name text default null,
  p_stack text default null,
  p_route text default null,
  p_user_id uuid default null,
  p_session_id text default null,
  p_duration_ms integer default null,
  p_meta jsonb default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_logs(level, category, message, error_name, stack, route, user_id, session_id, duration_ms, meta)
  values (p_level, p_category, p_message, p_error_name, p_stack, p_route, p_user_id, p_session_id, p_duration_ms, p_meta);
end;
$$;

revoke all on function public.log_client_event(text,text,text,text,text,text,uuid,text,int,jsonb) from public;
grant execute on function public.log_client_event(text,text,text,text,text,text,uuid,text,int,jsonb) to anon, authenticated;

create index if not exists app_logs_created_at_idx on public.app_logs(created_at desc);
create index if not exists app_logs_level_idx on public.app_logs(level);

