-- Track when a user last changed their own password, for display on the
-- Settings page. Supabase Auth doesn't expose this directly (auth.users
-- updated_at changes for unrelated reasons too), so we record it ourselves
-- right after a successful supabase.auth.updateUser({ password }) call.
-- Not in the guard_user_self_update() denylist, so it's already
-- self-editable like phone — no trigger change needed.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_changed_at timestamptz;
