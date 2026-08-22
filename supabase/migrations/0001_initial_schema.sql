-- ============================================================================
-- SMB Payroll & Bookkeeping Portal - Complete Initial Database Schema
-- Run this script in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ============================================================================

-- 1. EXTENSIONS
create extension if not exists pg_trgm;      -- Trigram search for employee names
create extension if not exists btree_gist;   -- Exclusion constraints for leave overlaps
create extension if not exists citext;       -- Case-insensitive email text

-- 2. CUSTOM TYPES
do $$ begin
  create type app_role as enum ('employee', 'manager', 'bookkeeper');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type component_kind as enum ('earning', 'deduction', 'employer_contribution');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type request_status as enum ('pending', 'approved', 'rejected', 'cancelled');
exception when duplicate_object then null;
end $$;

-- 3. CORE TABLES (Created first so helper functions and policies can reference them)

-- Profiles table (one per login, 1:1 with auth.users)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null check (length(btrim(full_name)) between 2 and 120),
  email       citext not null unique,
  phone       text check (phone is null or phone ~ '^\+?[0-9\-\s]{7,20}$'),
  locale      text not null default 'en' check (locale in ('he', 'en')),
  created_at  timestamptz not null default now()
);

-- Companies table (the tenant)
create table if not exists public.companies (
  id        uuid primary key default gen_random_uuid(),
  name      text not null check (length(btrim(name)) >= 2),
  tax_id    text not null unique,                 -- Tax ID / Company Registration #
  timezone  text not null default 'Asia/Jerusalem',
  currency  char(3) not null default 'ILS',
  week_start_day smallint not null default 0 check (week_start_day between 0 and 6),
  weekend_days   smallint[] not null default '{5,6}',  -- Fri, Sat
  managers_can_view_payslip_files boolean not null default false,
  created_at timestamptz not null default now()
);

-- Memberships table (authorization links)
create table if not exists public.memberships (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  role        app_role not null,
  is_active   boolean not null default true,
  invited_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  unique (company_id, profile_id)
);
create index if not exists idx_memberships_profile_active on public.memberships (profile_id) where is_active;
create index if not exists idx_memberships_company_role on public.memberships (company_id, role) where is_active;

-- Employees table (HR record)
create table if not exists public.employees (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  membership_id   uuid unique references public.memberships(id) on delete set null,
  employee_number text not null,
  full_name       text not null,
  national_id_last4 char(4),
  department      text,
  job_title       text,
  manager_id      uuid references public.employees(id) on delete set null,
  employment_type text not null default 'monthly'
                  check (employment_type in ('monthly', 'hourly', 'contractor')),
  start_date      date not null default current_date,
  end_date        date check (end_date is null or end_date >= start_date),
  status          text not null default 'active'
                  check (status in ('active', 'on_leave', 'terminated')),
  created_at      timestamptz not null default now(),
  unique (company_id, employee_number),
  check (manager_id is distinct from id)
);
create index if not exists idx_employees_company_status on public.employees (company_id, status);
create index if not exists idx_employees_manager on public.employees (manager_id) where manager_id is not null;
create index if not exists idx_employees_name_trgm on public.employees using gin (full_name gin_trgm_ops);

-- Payroll periods table
create table if not exists public.payroll_periods (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  year        smallint not null check (year between 2000 and 2100),
  month       smallint not null check (month between 1 and 12),
  status      text not null default 'draft'
              check (status in ('draft', 'published', 'locked')),
  published_at timestamptz,
  published_by uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  unique (company_id, year, month),
  check ((status = 'draft') = (published_at is null))
);

-- Payslips table
create table if not exists public.payslips (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  period_id     uuid not null references public.payroll_periods(id) on delete cascade,
  employee_id   uuid references public.employees(id) on delete restrict,
  gross_pay     numeric(12,2) not null default 0 check (gross_pay >= 0),
  net_pay       numeric(12,2) not null default 0 check (net_pay >= 0),
  total_deductions numeric(12,2) not null default 0 check (total_deductions >= 0),
  employer_cost numeric(12,2) check (employer_cost >= 0),
  paid_days     numeric(5,2) check (paid_days >= 0),
  file_path     text,                       -- object key in payslips bucket
  file_size     integer check (file_size is null or file_size between 1 and 10485760),
  file_checksum text,                       -- sha256 for duplicate detection
  status        text not null default 'unassigned'
                check (status in ('unassigned', 'assigned', 'published')),
  uploaded_by   uuid not null references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (period_id, employee_id),
  check (net_pay <= gross_pay),
  check (status = 'unassigned' or employee_id is not null)
);
create index if not exists idx_payslips_employee_period on public.payslips (employee_id, period_id);
create index if not exists idx_payslips_unassigned on public.payslips (company_id, status) where status = 'unassigned';

-- Payslip components table
create table if not exists public.payslip_components (
  id          uuid primary key default gen_random_uuid(),
  payslip_id  uuid not null references public.payslips(id) on delete cascade,
  kind        component_kind not null,
  code        text not null,     -- 'base', 'overtime', 'income_tax', 'ni', 'pension'
  label       text not null,     -- e.g. 'Base Salary', 'Income Tax'
  amount      numeric(12,2) not null check (amount >= 0),
  sort_order  smallint not null default 0,
  unique (payslip_id, kind, code)
);
create index if not exists idx_payslip_components_payslip on public.payslip_components (payslip_id);

-- Recalculation function and trigger
create or replace function public.recalc_payslip_totals() returns trigger
language plpgsql as $$
declare pid uuid := coalesce(new.payslip_id, old.payslip_id);
begin
  update public.payslips p set
    gross_pay = coalesce((select sum(amount) from public.payslip_components
                          where payslip_id = pid and kind = 'earning'), 0),
    total_deductions = coalesce((select sum(amount) from public.payslip_components
                                 where payslip_id = pid and kind = 'deduction'), 0),
    updated_at = now()
  where p.id = pid;
  update public.payslips set net_pay = gross_pay - total_deductions where id = pid;
  return null;
end $$;

drop trigger if exists trg_recalc_payslip_totals on public.payslip_components;
create trigger trg_recalc_payslip_totals
after insert or update or delete on public.payslip_components
for each row execute function public.recalc_payslip_totals();

-- Leave Types table
create table if not exists public.leave_types (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  code        text not null,   -- 'vacation', 'sick', 'reserve_duty', 'unpaid'
  name        text not null,
  is_paid     boolean not null default true,
  requires_approval boolean not null default true,
  accrual_days_per_month numeric(5,2) not null default 0,
  max_carryover_days     numeric(5,2) not null default 0,
  is_active   boolean not null default true,
  unique (company_id, code)
);

-- Leave Entitlements table
create table if not exists public.leave_entitlements (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  employee_id   uuid not null references public.employees(id) on delete cascade,
  leave_type_id uuid not null references public.leave_types(id) on delete cascade,
  year          smallint not null check (year between 2000 and 2100),
  entitled_days numeric(5,2) not null default 0 check (entitled_days >= 0),
  carried_over_days numeric(5,2) not null default 0 check (carried_over_days >= 0),
  adjustment_days numeric(5,2) not null default 0,
  note          text,
  updated_by    uuid references public.profiles(id),
  updated_at    timestamptz not null default now(),
  unique (employee_id, leave_type_id, year)
);

-- Time Off Requests table
create table if not exists public.time_off_requests (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  employee_id   uuid not null references public.employees(id) on delete cascade,
  leave_type_id uuid not null references public.leave_types(id) on delete restrict,
  start_date    date not null,
  end_date      date not null,
  working_days  numeric(5,2) not null check (working_days > 0),
  reason        text check (length(reason) <= 500),
  status        request_status not null default 'pending',
  decided_by    uuid references public.profiles(id),
  decided_at    timestamptz,
  decision_note text check (length(decision_note) <= 500),
  created_at    timestamptz not null default now(),
  check (end_date >= start_date),
  check (end_date - start_date <= 90),
  check ((status in ('approved','rejected')) = (decided_at is not null))
);

-- Prevent overlapping active leave requests with GiST exclusion constraint
do $$ begin
  alter table public.time_off_requests
    add constraint no_overlapping_active_leave
    exclude using gist (
      employee_id with =,
      daterange(start_date, end_date, '[]') with &&
    ) where (status in ('pending', 'approved'));
exception when duplicate_object then null;
end $$;

create index if not exists idx_time_off_employee_status on public.time_off_requests (employee_id, status);
create index if not exists idx_time_off_company_pending on public.time_off_requests (company_id, status) where status = 'pending';
create index if not exists idx_time_off_dates on public.time_off_requests (start_date, end_date);

-- Documents table (Form 106, Form 101, contracts)
create table if not exists public.documents (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete cascade, -- null = company-wide
  kind        text not null check (kind in ('form_106', 'form_101', 'contract', 'pension_report', 'other')),
  title       text not null,
  tax_year    smallint check (tax_year between 2000 and 2100),
  file_path   text not null,
  file_size   integer not null check (file_size between 1 and 10485760),
  uploaded_by uuid not null references public.profiles(id),
  created_at  timestamptz not null default now()
);
create index if not exists idx_documents_lookup on public.documents (employee_id, kind, tax_year);

-- Company Holidays table
create table if not exists public.company_holidays (
  company_id   uuid not null references public.companies(id) on delete cascade,
  holiday_date date not null,
  name         text not null,
  is_half_day  boolean not null default false,
  primary key (company_id, holiday_date)
);

-- Audit Log table
create table if not exists public.audit_log (
  id          bigserial primary key,
  company_id  uuid not null references public.companies(id) on delete cascade,
  actor_profile_id uuid references public.profiles(id),
  action      text not null,
  entity      text not null,
  entity_id   uuid,
  diff        jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists idx_audit_log_company on public.audit_log (company_id, created_at desc);
create index if not exists idx_audit_log_entity on public.audit_log (entity, entity_id);

-- 4. APP PRIVATE SCHEMA & HELPER FUNCTIONS

create schema if not exists app;
grant usage on schema app to authenticated;

-- Helper: Check if current user has one of the specified roles in a company
create or replace function app.has_role(p_company uuid, p_roles app_role[])
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.memberships m
    where m.profile_id = (select auth.uid())
      and m.company_id = p_company
      and m.is_active
      and m.role = any(p_roles)
  );
$$;

-- Helper: Get current user's employee ID in a specific company
create or replace function app.my_employee_id(p_company uuid)
returns uuid
language sql stable security definer set search_path = public, pg_temp
as $$
  select e.id from public.employees e
  join public.memberships m on m.id = e.membership_id
  where m.profile_id = (select auth.uid())
    and m.is_active
    and e.company_id = p_company
  limit 1;
$$;

-- Helper: Get all employee IDs belonging to current user across companies
create or replace function app.my_employee_ids()
returns setof uuid
language sql stable security definer set search_path = public, pg_temp
as $$
  select e.id from public.employees e
  join public.memberships m on m.id = e.membership_id
  where m.profile_id = (select auth.uid()) and m.is_active;
$$;

-- Helper: Check if current user is direct manager of an employee
create or replace function app.manages_employee(p_employee uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.employees target
    join public.employees mgr on mgr.id = target.manager_id
    join public.memberships m on m.id = mgr.membership_id
    where target.id = p_employee
      and m.profile_id = (select auth.uid())
      and m.is_active
      and m.role = 'manager'
  );
$$;

grant execute on all functions in schema app to authenticated;

-- 5. DERIVED VIEWS

create or replace view public.v_monthly_pay with (security_invoker = true) as
select
  p.employee_id,
  p.company_id,
  pp.year, pp.month,
  make_date(pp.year, pp.month, 1) as period_start,
  p.gross_pay, p.net_pay, p.total_deductions, p.employer_cost,
  case when p.gross_pay > 0
       then round(p.total_deductions / p.gross_pay, 4) end as deduction_ratio
from public.payslips p
join public.payroll_periods pp on pp.id = p.period_id
where p.status = 'published' and pp.status in ('published', 'locked');

create or replace view public.v_salary_stats with (security_invoker = true) as
with ranked as (
  select *, row_number() over (partition by employee_id order by period_start desc) as rn
  from public.v_monthly_pay
), last12 as (
  select * from ranked where rn <= 12
)
select
  employee_id,
  count(*)                                as periods_counted,
  round(avg(net_pay), 2)                  as avg_net,
  round(avg(gross_pay), 2)                as avg_gross,
  round(stddev_samp(net_pay), 2)          as stddev_net,
  case when avg(net_pay) > 0
       then round(stddev_samp(net_pay) / avg(net_pay), 4) end as volatility,
  min(net_pay) as min_net,
  max(net_pay) as max_net,
  round(avg(deduction_ratio), 4)          as avg_deduction_ratio,
  max(net_pay) filter (where rn = 1)      as latest_net,
  max(net_pay) filter (where rn = 2)      as previous_net
from last12
group by employee_id;

create or replace view public.v_leave_balance with (security_invoker = true) as
select
  e.id as employee_id,
  e.company_id,
  lt.id as leave_type_id,
  lt.name as leave_type_name,
  ent.year,
  ent.entitled_days + ent.carried_over_days + ent.adjustment_days as total_days,
  coalesce(sum(r.working_days) filter (where r.status = 'approved'), 0) as used_days,
  coalesce(sum(r.working_days) filter (where r.status = 'pending'), 0)  as pending_days,
  ent.entitled_days + ent.carried_over_days + ent.adjustment_days
    - coalesce(sum(r.working_days) filter (where r.status in ('approved','pending')), 0)
    as available_days
from public.employees e
join public.leave_entitlements ent on ent.employee_id = e.id
join public.leave_types lt on lt.id = ent.leave_type_id
left join public.time_off_requests r
  on r.employee_id = e.id
 and r.leave_type_id = lt.id
 and extract(year from r.start_date) = ent.year
group by e.id, e.company_id, lt.id, lt.name, ent.year,
         ent.entitled_days, ent.carried_over_days, ent.adjustment_days;

-- 6. RPC FUNCTIONS

-- Manager Leave Decision RPC
create or replace function public.decide_time_off(
  p_request_id uuid,
  p_approve boolean,
  p_note text default null
) returns public.time_off_requests
language plpgsql security definer set search_path = public, pg_temp
as $$
declare r public.time_off_requests;
begin
  select * into r from public.time_off_requests where id = p_request_id for update;
  if not found then
    raise exception 'REQUEST_NOT_FOUND' using errcode = 'P0002';
  end if;

  if not app.manages_employee(r.employee_id) then
    raise exception 'NOT_YOUR_TEAM' using errcode = '42501';
  end if;

  if r.status <> 'pending' then
    raise exception 'ALREADY_DECIDED' using errcode = 'P0001';
  end if;

  update public.time_off_requests set
    status = case when p_approve then 'approved' else 'rejected' end::public.request_status,
    decided_by = (select auth.uid()),
    decided_at = now(),
    decision_note = left(p_note, 500)
  where id = p_request_id
  returning * into r;

  insert into public.audit_log (company_id, actor_profile_id, action, entity, entity_id, diff)
  values (r.company_id, (select auth.uid()),
          case when p_approve then 'time_off.approve' else 'time_off.reject' end,
          'time_off_requests', r.id,
          jsonb_build_object('status', r.status, 'note', p_note));

  return r;
end $$;

grant execute on function public.decide_time_off(uuid, boolean, text) to authenticated;

-- Employee Leave Cancellation RPC
create or replace function public.cancel_time_off(
  p_request_id uuid
) returns public.time_off_requests
language plpgsql security definer set search_path = public, pg_temp
as $$
declare r public.time_off_requests;
begin
  select * into r from public.time_off_requests where id = p_request_id for update;
  if not found then
    raise exception 'REQUEST_NOT_FOUND' using errcode = 'P0002';
  end if;

  if r.employee_id not in (select app.my_employee_ids()) then
    raise exception 'NOT_YOUR_REQUEST' using errcode = '42501';
  end if;

  if r.status <> 'pending' then
    raise exception 'CANNOT_CANCEL_DECIDED_REQUEST' using errcode = 'P0001';
  end if;

  update public.time_off_requests set
    status = 'cancelled'::public.request_status
  where id = p_request_id
  returning * into r;

  insert into public.audit_log (company_id, actor_profile_id, action, entity, entity_id, diff)
  values (r.company_id, (select auth.uid()),
          'time_off.cancel', 'time_off_requests', r.id,
          jsonb_build_object('status', 'cancelled'));

  return r;
end $$;

grant execute on function public.cancel_time_off(uuid) to authenticated;

-- Publish Payroll Period RPC
create or replace function public.publish_payroll_period(
  p_period_id uuid
) returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare period_row public.payroll_periods;
begin
  select * into period_row from public.payroll_periods where id = p_period_id for update;
  if not found then
    raise exception 'PERIOD_NOT_FOUND' using errcode = 'P0002';
  end if;

  if not app.has_role(period_row.company_id, array['bookkeeper']::app_role[]) then
    raise exception 'NOT_BOOKKEEPER' using errcode = '42501';
  end if;

  update public.payroll_periods set
    status = 'published',
    published_at = now(),
    published_by = (select auth.uid())
  where id = p_period_id;

  update public.payslips set
    status = 'published',
    updated_at = now()
  where period_id = p_period_id and status = 'assigned';

  insert into public.audit_log (company_id, actor_profile_id, action, entity, entity_id, diff)
  values (period_row.company_id, (select auth.uid()),
          'payslip.publish', 'payroll_periods', p_period_id,
          jsonb_build_object('status', 'published', 'year', period_row.year, 'month', period_row.month));
end $$;

grant execute on function public.publish_payroll_period(uuid) to authenticated;

-- 7. AUTH SIGNUP TRIGGER (Handles new users automatically from signup forms)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_full_name text;
  v_phone text;
  v_signup_type text;
  v_role_text text;
  v_target_role app_role;
  v_company_name text;
  v_tax_id text;
  v_company_id uuid;
  v_membership_id uuid;
  v_employee_num text;
begin
  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  if length(btrim(v_full_name)) < 2 then
    v_full_name := 'New User';
  end if;
  v_phone := new.raw_user_meta_data->>'phone';
  v_signup_type := coalesce(new.raw_user_meta_data->>'signup_type', 'worker');
  v_role_text := coalesce(new.raw_user_meta_data->>'role', 'employee');
  v_company_name := new.raw_user_meta_data->>'company_name';
  v_tax_id := coalesce(new.raw_user_meta_data->>'tax_id', new.raw_user_meta_data->>'company_tax_id');

  -- 1. Create or update profile
  insert into public.profiles (id, full_name, email, phone, locale)
  values (new.id, v_full_name, new.email, v_phone, 'en')
  on conflict (id) do update
  set full_name = excluded.full_name,
      phone = coalesce(excluded.phone, profiles.phone);

  -- 2. If Bookkeeper signup: create company and link membership
  if v_signup_type = 'bookkeeper' and v_tax_id is not null and length(btrim(v_tax_id)) > 0 then
    v_company_name := coalesce(v_company_name, 'My Company');
    
    insert into public.companies (name, tax_id)
    values (v_company_name, v_tax_id)
    on conflict (tax_id) do update set name = excluded.name
    returning id into v_company_id;

    insert into public.memberships (company_id, profile_id, role, is_active)
    values (v_company_id, new.id, 'bookkeeper'::app_role, true)
    on conflict (company_id, profile_id) do update set role = 'bookkeeper'::app_role, is_active = true;

    -- Create default leave types for the company if none exist
    insert into public.leave_types (company_id, code, name, accrual_days_per_month, is_paid)
    values
      (v_company_id, 'vacation', 'Annual Vacation', 1.00, true),
      (v_company_id, 'sick', 'Sick Leave', 1.50, true),
      (v_company_id, 'reserve_duty', 'Reserve Duty', 0, true)
    on conflict (company_id, code) do nothing;

  -- 3. If Worker / Manager signup:
  elsif v_signup_type = 'worker' then
    if v_role_text = 'manager' then
      v_target_role := 'manager'::app_role;
    else
      v_target_role := 'employee'::app_role;
    end if;

    -- Try to find company by tax_id or name
    if v_tax_id is not null and length(btrim(v_tax_id)) > 0 then
      select id into v_company_id from public.companies where tax_id = v_tax_id limit 1;
    elsif v_company_name is not null and length(btrim(v_company_name)) > 0 then
      select id into v_company_id from public.companies where name ilike v_company_name limit 1;
    end if;

    -- If company exists, create membership and link employee record
    if v_company_id is not null then
      insert into public.memberships (company_id, profile_id, role, is_active)
      values (v_company_id, new.id, v_target_role, true)
      on conflict (company_id, profile_id) do update set role = v_target_role, is_active = true
      returning id into v_membership_id;

      -- Check if employee record already exists with matching name/email
      v_employee_num := coalesce(new.raw_user_meta_data->>'employee_number', substr(md5(random()::text), 1, 6));
      insert into public.employees (company_id, membership_id, employee_number, full_name, job_title, department, start_date)
      values (v_company_id, v_membership_id, v_employee_num, v_full_name, new.raw_user_meta_data->>'job_title', new.raw_user_meta_data->>'department', current_date)
      on conflict (company_id, employee_number) do update set membership_id = v_membership_id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 8. ROW LEVEL SECURITY (RLS) POLICIES

alter table public.profiles            enable row level security;
alter table public.companies           enable row level security;
alter table public.memberships         enable row level security;
alter table public.employees           enable row level security;
alter table public.payroll_periods     enable row level security;
alter table public.payslips            enable row level security;
alter table public.payslip_components  enable row level security;
alter table public.leave_types         enable row level security;
alter table public.leave_entitlements  enable row level security;
alter table public.time_off_requests   enable row level security;
alter table public.documents           enable row level security;
alter table public.company_holidays    enable row level security;
alter table public.audit_log           enable row level security;

-- Profiles Policies
drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self" on public.profiles for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists "profiles_select_colleagues" on public.profiles;
create policy "profiles_select_colleagues" on public.profiles for select to authenticated
  using (exists (
    select 1 from public.employees e
    join public.memberships m on m.id = e.membership_id
    where m.profile_id = profiles.id
      and (app.manages_employee(e.id) or app.has_role(e.company_id, array['bookkeeper']::app_role[]))
  ));

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Memberships Policies
drop policy if exists "memberships_select_own" on public.memberships;
create policy "memberships_select_own" on public.memberships for select to authenticated
  using (profile_id = (select auth.uid()));

drop policy if exists "memberships_select_by_bookkeeper" on public.memberships;
create policy "memberships_select_by_bookkeeper" on public.memberships
  for select to authenticated
  using (app.has_role(company_id, array['bookkeeper']::app_role[]));

drop policy if exists "memberships_write_by_bookkeeper" on public.memberships;
create policy "memberships_write_by_bookkeeper" on public.memberships
  for all to authenticated
  using (app.has_role(company_id, array['bookkeeper']::app_role[]))
  with check (app.has_role(company_id, array['bookkeeper']::app_role[]));

-- Companies Policies
drop policy if exists "companies_select_members" on public.companies;
create policy "companies_select_members" on public.companies for select to authenticated
  using (app.has_role(id, array['employee','manager','bookkeeper']::app_role[]));

-- Employees Policies
drop policy if exists "employees_select_self" on public.employees;
create policy "employees_select_self" on public.employees for select to authenticated
  using (id in (select app.my_employee_ids()));

drop policy if exists "employees_select_team" on public.employees;
create policy "employees_select_team" on public.employees for select to authenticated
  using (app.manages_employee(id));

drop policy if exists "employees_select_bookkeeper" on public.employees;
create policy "employees_select_bookkeeper" on public.employees for select to authenticated
  using (app.has_role(company_id, array['bookkeeper']::app_role[]));

drop policy if exists "employees_write_bookkeeper" on public.employees;
create policy "employees_write_bookkeeper" on public.employees
  for all to authenticated
  using (app.has_role(company_id, array['bookkeeper']::app_role[]))
  with check (app.has_role(company_id, array['bookkeeper']::app_role[]));

-- Payroll Periods Policies
drop policy if exists "periods_select_members" on public.payroll_periods;
create policy "periods_select_members" on public.payroll_periods for select to authenticated
  using (app.has_role(company_id, array['employee','manager','bookkeeper']::app_role[]));

drop policy if exists "periods_write_bookkeeper" on public.payroll_periods;
create policy "periods_write_bookkeeper" on public.payroll_periods for all to authenticated
  using (app.has_role(company_id, array['bookkeeper']::app_role[]))
  with check (app.has_role(company_id, array['bookkeeper']::app_role[]));

-- Payslips Policies
drop policy if exists "payslips_select_own_published" on public.payslips;
create policy "payslips_select_own_published" on public.payslips for select to authenticated
  using (
    employee_id in (select app.my_employee_ids())
    and status = 'published'
  );

drop policy if exists "payslips_select_team_published" on public.payslips;
create policy "payslips_select_team_published" on public.payslips for select to authenticated
  using (app.manages_employee(employee_id) and status = 'published');

drop policy if exists "payslips_select_bookkeeper" on public.payslips;
create policy "payslips_select_bookkeeper" on public.payslips for select to authenticated
  using (app.has_role(company_id, array['bookkeeper']::app_role[]));

drop policy if exists "payslips_write_bookkeeper" on public.payslips;
create policy "payslips_write_bookkeeper" on public.payslips for all to authenticated
  using (app.has_role(company_id, array['bookkeeper']::app_role[]))
  with check (
    app.has_role(company_id, array['bookkeeper']::app_role[])
    and uploaded_by = (select auth.uid())
  );

-- Payslip Components Policies
drop policy if exists "components_select_via_parent" on public.payslip_components;
create policy "components_select_via_parent" on public.payslip_components
  for select to authenticated
  using (exists (select 1 from public.payslips p where p.id = payslip_id));

drop policy if exists "components_write_bookkeeper" on public.payslip_components;
create policy "components_write_bookkeeper" on public.payslip_components
  for all to authenticated
  using (exists (
    select 1 from public.payslips p
    where p.id = payslip_id
      and app.has_role(p.company_id, array['bookkeeper']::app_role[])
  ))
  with check (exists (
    select 1 from public.payslips p
    where p.id = payslip_id
      and app.has_role(p.company_id, array['bookkeeper']::app_role[])
  ));

-- Leave Types Policies
drop policy if exists "leave_types_select_members" on public.leave_types;
create policy "leave_types_select_members" on public.leave_types for select to authenticated
  using (app.has_role(company_id, array['employee','manager','bookkeeper']::app_role[]));

drop policy if exists "leave_types_write_bookkeeper" on public.leave_types;
create policy "leave_types_write_bookkeeper" on public.leave_types for all to authenticated
  using (app.has_role(company_id, array['bookkeeper']::app_role[]))
  with check (app.has_role(company_id, array['bookkeeper']::app_role[]));

-- Leave Entitlements Policies
drop policy if exists "entitlements_select_own" on public.leave_entitlements;
create policy "entitlements_select_own" on public.leave_entitlements for select to authenticated
  using (employee_id in (select app.my_employee_ids()));

drop policy if exists "entitlements_select_team" on public.leave_entitlements;
create policy "entitlements_select_team" on public.leave_entitlements for select to authenticated
  using (app.manages_employee(employee_id));

drop policy if exists "entitlements_select_bookkeeper" on public.leave_entitlements;
create policy "entitlements_select_bookkeeper" on public.leave_entitlements for select to authenticated
  using (app.has_role(company_id, array['bookkeeper']::app_role[]));

drop policy if exists "entitlements_write_bookkeeper" on public.leave_entitlements;
create policy "entitlements_write_bookkeeper" on public.leave_entitlements for all to authenticated
  using (app.has_role(company_id, array['bookkeeper']::app_role[]))
  with check (app.has_role(company_id, array['bookkeeper']::app_role[]));

-- Time Off Requests Policies
drop policy if exists "requests_select_own" on public.time_off_requests;
create policy "requests_select_own" on public.time_off_requests for select to authenticated
  using (employee_id in (select app.my_employee_ids()));

drop policy if exists "requests_select_team" on public.time_off_requests;
create policy "requests_select_team" on public.time_off_requests for select to authenticated
  using (app.manages_employee(employee_id));

drop policy if exists "requests_select_bookkeeper" on public.time_off_requests;
create policy "requests_select_bookkeeper" on public.time_off_requests for select to authenticated
  using (app.has_role(company_id, array['bookkeeper']::app_role[]));

drop policy if exists "requests_insert_own_pending" on public.time_off_requests;
create policy "requests_insert_own_pending" on public.time_off_requests
  for insert to authenticated
  with check (
    employee_id in (select app.my_employee_ids())
    and status = 'pending'
    and decided_by is null
    and decided_at is null
    and start_date >= current_date
  );

-- Revoke direct update/delete on time_off_requests (status transitions must use decide_time_off / cancel_time_off RPCs)
revoke update, delete on public.time_off_requests from authenticated;

-- Documents Policies
drop policy if exists "documents_select_own" on public.documents;
create policy "documents_select_own" on public.documents for select to authenticated
  using (
    employee_id in (select app.my_employee_ids())
    or (employee_id is null
        and app.has_role(company_id, array['employee','manager','bookkeeper']::app_role[]))
  );

drop policy if exists "documents_select_team" on public.documents;
create policy "documents_select_team" on public.documents for select to authenticated
  using (employee_id is not null and app.manages_employee(employee_id));

drop policy if exists "documents_write_bookkeeper" on public.documents;
create policy "documents_write_bookkeeper" on public.documents for all to authenticated
  using (app.has_role(company_id, array['bookkeeper']::app_role[]))
  with check (app.has_role(company_id, array['bookkeeper']::app_role[]));

-- Company Holidays Policies
drop policy if exists "holidays_select_members" on public.company_holidays;
create policy "holidays_select_members" on public.company_holidays for select to authenticated
  using (app.has_role(company_id, array['employee','manager','bookkeeper']::app_role[]));

drop policy if exists "holidays_write_bookkeeper" on public.company_holidays;
create policy "holidays_write_bookkeeper" on public.company_holidays for all to authenticated
  using (app.has_role(company_id, array['bookkeeper']::app_role[]))
  with check (app.has_role(company_id, array['bookkeeper']::app_role[]));

-- Audit Log Policies
drop policy if exists "audit_select_bookkeeper" on public.audit_log;
create policy "audit_select_bookkeeper" on public.audit_log for select to authenticated
  using (app.has_role(company_id, array['bookkeeper']::app_role[]));

revoke insert, update, delete on public.audit_log from authenticated;

-- 9. STORAGE BUCKETS SETUP
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('payslips',  'payslips',  false, 10485760, array['application/pdf']),
  ('documents', 'documents', false, 10485760, array['application/pdf','image/png','image/jpeg'])
on conflict (id) do nothing;

-- Storage Policies
drop policy if exists "payslips_read" on storage.objects;
create policy "payslips_read" on storage.objects for select to authenticated
using (
  bucket_id = 'payslips'
  and (
    (storage.foldername(name))[2]::uuid in (select app.my_employee_ids())
    or app.has_role((storage.foldername(name))[1]::uuid, array['bookkeeper']::app_role[])
    or (
      app.manages_employee((storage.foldername(name))[2]::uuid)
      and exists (
        select 1 from public.companies c
        where c.id = (storage.foldername(name))[1]::uuid
          and c.managers_can_view_payslip_files
      )
    )
  )
);

drop policy if exists "payslips_write" on storage.objects;
create policy "payslips_write" on storage.objects for insert to authenticated
with check (
  bucket_id = 'payslips'
  and app.has_role((storage.foldername(name))[1]::uuid, array['bookkeeper']::app_role[])
);

drop policy if exists "payslips_delete" on storage.objects;
create policy "payslips_delete" on storage.objects for delete to authenticated
using (
  bucket_id = 'payslips'
  and app.has_role((storage.foldername(name))[1]::uuid, array['bookkeeper']::app_role[])
);
