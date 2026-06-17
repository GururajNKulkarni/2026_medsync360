-- Duty swap notifications
-- In-app notifications delivered to the doctor affected by a duty swap or
-- assignment. The swap itself applies immediately; this table is the
-- "notify only" delivery channel (Option A).

create table if not exists public.duty_notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.users(id) on delete cascade,
  actor_id     uuid references public.users(id) on delete set null,
  duty_id      uuid references public.duty_roster(id) on delete cascade,
  type         text not null default 'duty_swap',
  title        text not null,
  message      text not null,
  is_read      boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists idx_duty_notifications_recipient
  on public.duty_notifications (recipient_id, is_read, created_at desc);

alter table public.duty_notifications enable row level security;

-- Recipients can read their own notifications
drop policy if exists "Recipients can read their notifications" on public.duty_notifications;
create policy "Recipients can read their notifications"
  on public.duty_notifications for select
  using (recipient_id = auth.uid());

-- Recipients can mark their own notifications as read
drop policy if exists "Recipients can update their notifications" on public.duty_notifications;
create policy "Recipients can update their notifications"
  on public.duty_notifications for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- Authenticated users can create notifications they originate
drop policy if exists "Actors can create notifications" on public.duty_notifications;
create policy "Actors can create notifications"
  on public.duty_notifications for insert
  with check (actor_id = auth.uid());
