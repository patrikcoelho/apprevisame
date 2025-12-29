create extension if not exists "pgcrypto";

do $$ begin
  if not exists (select 1 from pg_type where typname = 'study_type') then
    create type study_type as enum ('Concurso', 'Faculdade');
  end if;
end $$;

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  objective text,
  best_time text,
  study_type study_type not null default 'Concurso',
  plan text not null default 'Gratuito',
  active_template_id uuid,
  theme text,
  language text,
  date_format text,
  notify_email boolean,
  notify_app boolean,
  notify_daily boolean,
  notify_daily_time time,
  notify_weekly boolean,
  notify_weekly_day text,
  notify_weekly_time time,
  notify_overdue_top boolean,
  notify_priority text,
  created_at timestamptz not null default now()
);

create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  study_type study_type not null,
  is_default boolean not null default false,
  owner_user_id uuid references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists subjects_default_unique
  on subjects (lower(name), study_type)
  where owner_user_id is null;

create unique index if not exists subjects_custom_unique
  on subjects (lower(name), study_type, owner_user_id)
  where owner_user_id is not null;

create table if not exists user_subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  subject_id uuid not null references subjects on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists user_subjects_unique
  on user_subjects (user_id, subject_id);

create table if not exists templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cadence_days int[] not null,
  study_type study_type not null,
  is_default boolean not null default false,
  owner_user_id uuid references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists templates_default_unique
  on templates (lower(name), study_type)
  where owner_user_id is null;

create unique index if not exists templates_custom_unique
  on templates (lower(name), study_type, owner_user_id)
  where owner_user_id is not null;

alter table profiles
  add constraint profiles_active_template_fk
  foreign key (active_template_id) references templates(id);

create table if not exists studies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  subject_id uuid not null references subjects on delete cascade,
  topic text not null,
  notes text,
  studied_at timestamptz not null default now(),
  questions_total int,
  questions_correct int,
  created_at timestamptz not null default now()
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  study_id uuid not null references studies on delete cascade,
  due_at timestamptz not null,
  status text not null default 'pendente',
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table reviews
  add constraint reviews_status_check
  check (status in ('pendente', 'concluida', 'adiada'));

create index if not exists reviews_due_at_idx on reviews (due_at);
create index if not exists reviews_user_idx on reviews (user_id);
create index if not exists studies_user_idx on studies (user_id);

alter table profiles enable row level security;
alter table subjects enable row level security;
alter table user_subjects enable row level security;
alter table templates enable row level security;
alter table studies enable row level security;
alter table reviews enable row level security;

create policy "Profiles are viewable by owner"
  on profiles for select
  using (auth.uid() = id);

create policy "Profiles are insertable by owner"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Profiles are updatable by owner"
  on profiles for update
  using (auth.uid() = id);

create policy "Subjects are readable"
  on subjects for select
  using (is_default or owner_user_id = auth.uid());

create policy "Users can insert subjects"
  on subjects for insert
  with check (owner_user_id = auth.uid() and is_default = false);

create policy "Users can update own subjects"
  on subjects for update
  using (owner_user_id = auth.uid() and is_default = false);

create policy "Users can delete own subjects"
  on subjects for delete
  using (owner_user_id = auth.uid() and is_default = false);

create policy "Users can read own subject links"
  on user_subjects for select
  using (user_id = auth.uid());

create policy "Users can insert own subject links"
  on user_subjects for insert
  with check (user_id = auth.uid());

create policy "Users can delete own subject links"
  on user_subjects for delete
  using (user_id = auth.uid());

create policy "Templates are readable"
  on templates for select
  using (is_default or owner_user_id = auth.uid());

create policy "Users can insert templates"
  on templates for insert
  with check (owner_user_id = auth.uid() and is_default = false);

create policy "Users can update own templates"
  on templates for update
  using (owner_user_id = auth.uid() and is_default = false);

create policy "Users can delete own templates"
  on templates for delete
  using (owner_user_id = auth.uid() and is_default = false);

create policy "Users can read own studies"
  on studies for select
  using (user_id = auth.uid());

create policy "Users can insert own studies"
  on studies for insert
  with check (user_id = auth.uid());

create policy "Users can update own studies"
  on studies for update
  using (user_id = auth.uid());

create policy "Users can delete own studies"
  on studies for delete
  using (user_id = auth.uid());

create policy "Users can read own reviews"
  on reviews for select
  using (user_id = auth.uid());

create policy "Users can insert own reviews"
  on reviews for insert
  with check (user_id = auth.uid());

create policy "Users can update own reviews"
  on reviews for update
  using (user_id = auth.uid());

create policy "Users can delete own reviews"
  on reviews for delete
  using (user_id = auth.uid());
