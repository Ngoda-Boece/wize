-- Wize — initial schema
-- Every user-owned table has Row Level Security enabled. Policies always
-- compare against auth.uid(); the application never trusts a user id sent by
-- the browser.

create extension if not exists pgcrypto;

-- ─── Helpers ───────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── profiles ──────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  onboarding_completed boolean not null default false,
  learning_interests text[] not null default '{}'
    check (cardinality(learning_interests) <= 8),
  experience_level text check (experience_level in ('decouverte', 'intermediaire', 'avance')),
  learning_goal text check (learning_goal in ('connaissances', 'raisonnement', 'convictions', 'projet', 'culture')),
  interaction_preference text check (interaction_preference in ('bienveillant', 'exigeant', 'socratique', 'equilibre')),
  -- When false, profile data is not injected into AI prompts.
  personalization_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "profiles: owner can read" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: owner can insert" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy "profiles: owner can update" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "profiles: owner can delete" on public.profiles
  for delete to authenticated using (id = (select auth.uid()));

-- Create an empty profile for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 80))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── learning_objectives ───────────────────────────────────────────────────
create table public.learning_objectives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '' check (char_length(description) <= 1000),
  kind text not null check (kind in ('understand', 'skill', 'explore', 'decision')),
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  -- completed_at is set if and only if the objective is completed.
  check ((status = 'completed') = (completed_at is not null))
);

create index learning_objectives_user_idx on public.learning_objectives (user_id, created_at desc);
create trigger learning_objectives_updated_at before update on public.learning_objectives
  for each row execute function public.set_updated_at();

alter table public.learning_objectives enable row level security;

create policy "objectives: owner can read" on public.learning_objectives
  for select to authenticated using (user_id = (select auth.uid()));
create policy "objectives: owner can insert" on public.learning_objectives
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "objectives: owner can update" on public.learning_objectives
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "objectives: owner can delete" on public.learning_objectives
  for delete to authenticated using (user_id = (select auth.uid()));

-- ─── conversations ─────────────────────────────────────────────────────────
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  subject text not null check (char_length(subject) between 1 and 500),
  mode text not null check (mode in ('sparring', 'mentor', 'socratic', 'laboratory')),
  status text not null default 'active' check (status in ('active', 'completed')),
  objective_id uuid references public.learning_objectives (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- History is listed per user by most recent activity.
create index conversations_user_updated_idx on public.conversations (user_id, updated_at desc);
create trigger conversations_updated_at before update on public.conversations
  for each row execute function public.set_updated_at();

alter table public.conversations enable row level security;

create policy "conversations: owner can read" on public.conversations
  for select to authenticated using (user_id = (select auth.uid()));
create policy "conversations: owner can insert" on public.conversations
  for insert to authenticated with check (
    user_id = (select auth.uid())
    -- An attached objective must belong to the same user.
    and (objective_id is null or exists (
      select 1 from public.learning_objectives o
      where o.id = objective_id and o.user_id = (select auth.uid())
    ))
  );
create policy "conversations: owner can update" on public.conversations
  for update to authenticated using (user_id = (select auth.uid())) with check (
    user_id = (select auth.uid())
    and (objective_id is null or exists (
      select 1 from public.learning_objectives o
      where o.id = objective_id and o.user_id = (select auth.uid())
    ))
  );
create policy "conversations: owner can delete" on public.conversations
  for delete to authenticated using (user_id = (select auth.uid()));

-- ─── messages ──────────────────────────────────────────────────────────────
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 100000),
  -- 'partial' = assistant reply interrupted mid-stream (kept and labelled).
  status text not null default 'complete' check (status in ('complete', 'partial')),
  mode text check (mode in ('sparring', 'mentor', 'socratic', 'laboratory')),
  -- Client-generated idempotency key: a retried submission cannot be stored twice.
  client_id text check (char_length(client_id) <= 64),
  created_at timestamptz not null default now(),
  unique (conversation_id, client_id)
);

create index messages_conversation_created_idx on public.messages (conversation_id, created_at);

alter table public.messages enable row level security;

create policy "messages: owner can read" on public.messages
  for select to authenticated using (user_id = (select auth.uid()));
-- Messages can only be appended to a conversation the user owns.
create policy "messages: owner can insert into own conversation" on public.messages
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = (select auth.uid())
    )
  );
-- No update policy: messages are immutable. Deletion happens through the
-- conversation (on delete cascade).
create policy "messages: owner can delete" on public.messages
  for delete to authenticated using (user_id = (select auth.uid()));

-- ─── session_summaries ─────────────────────────────────────────────────────
create table public.session_summaries (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null unique references public.conversations (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Validated server-side with Zod (see src/lib/ai/schemas.ts) before storage.
  summary jsonb not null check (jsonb_typeof(summary) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index session_summaries_user_created_idx on public.session_summaries (user_id, created_at desc);
create trigger session_summaries_updated_at before update on public.session_summaries
  for each row execute function public.set_updated_at();

alter table public.session_summaries enable row level security;

create policy "summaries: owner can read" on public.session_summaries
  for select to authenticated using (user_id = (select auth.uid()));
create policy "summaries: owner can insert for own conversation" on public.session_summaries
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = (select auth.uid())
    )
  );
create policy "summaries: owner can update" on public.session_summaries
  for update to authenticated using (user_id = (select auth.uid())) with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = (select auth.uid())
    )
  );
create policy "summaries: owner can delete" on public.session_summaries
  for delete to authenticated using (user_id = (select auth.uid()));

-- ─── Grants ────────────────────────────────────────────────────────────────
-- Anonymous visitors get nothing; authenticated users are further restricted by RLS.
revoke all on public.profiles, public.learning_objectives, public.conversations,
  public.messages, public.session_summaries from anon;
grant select, insert, update, delete on public.profiles, public.learning_objectives,
  public.conversations, public.session_summaries to authenticated;
grant select, insert, delete on public.messages to authenticated;
-- Supabase grants ALL by default; messages must stay immutable.
revoke update, truncate on public.messages from authenticated;
