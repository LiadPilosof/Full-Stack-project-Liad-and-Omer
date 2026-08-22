# Heads up before you build the roles table

Found something in the signup form on `signup-feature` that we need to fix before
the database is built on top of it, because it changes how roles have to be stored.

## The problem

`client/public/signup.html` lets the user pick their own role with radio buttons
(Worker / Manager / Accounting), and `signup.ts` passes it into the signup call:

```ts
await supabase.auth.signUp({
  email, password,
  options: { data: { full_name: fullName, company, role } },   // <-- role from a radio button
});
```

Anything in `options.data` goes into Supabase's `user_metadata`, and
**`user_metadata` is writable by the user themselves**. Even if we removed the
radio buttons from the HTML, anyone with an account could open the browser console
and run:

```js
await supabase.auth.updateUser({ data: { role: 'accounting' } });
```

There is no way to stop that — it is a legitimate call on the public anon key, by
design. So if any RLS policy or page check reads `role` from user metadata, every
employee can promote themselves to the bookkeeper role and read the whole
company's salaries. That is the one failure this product cannot have.

## The rule this gives us

**Role has to live in a table we control, and can only be written by someone who
already has authority.** Never in `user_metadata`, never in the signup payload,
never in a JWT claim the user can influence.

## What that looks like in the schema

A membership row per (person, company) carrying the role:

```sql
create type app_role as enum ('employee', 'manager', 'bookkeeper');

create table memberships (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role       app_role not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  unique (company_id, profile_id)
);
```

Then RLS policies read **this table**, not the JWT:

```sql
-- security definer so a policy on memberships can read memberships
-- without recursing; search_path pinned so the table can't be shadowed
create or replace function app.has_role(p_company uuid, p_roles app_role[])
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from memberships m
    where m.profile_id = (select auth.uid())
      and m.company_id = p_company
      and m.is_active
      and m.role = any(p_roles)
  );
$$;
```

The important part: the only thing we trust from the user is `auth.uid()`, which
Supabase derives from the signed JWT and the user cannot forge. Everything else is
looked up server-side.

## What this means for signup

Signing up no longer chooses a role. Two options, and I think we want the second:

1. Everyone who signs up is an `employee`, and a bookkeeper upgrades them later.
2. Signup is **invite-only** — the bookkeeper creates the employee record and
   invites them by email, so the role is decided before the account exists.

Option 2 matches how this actually works in real life: an employee doesn't
self-register with their payroll provider, the bookkeeper onboards them. It also
means no stranger can create an account against our company at all.

So the signup form loses the role radio buttons and the company text field — both
come from the invite instead.

## What I'd ask you to build

- `profiles` (id = `auth.users.id`, filled by an `after insert` trigger on
  `auth.users` so it can never be missing)
- `companies`
- `memberships` as above
- `app.has_role()` and `app.my_employee_ids()` helpers
- RLS **enabled on every table** — with RLS on and no policy, the table is
  deny-all, which is the safe default to start from

Full schema with all the tables, constraints, and every policy written out is in
`docs/technical-design/01-database.md` and `02-rls.md` — grab whatever is useful,
and push back on anything you'd do differently.

One thing worth keeping while you work: turn RLS on from the very first migration
rather than "adding security later". Retrofitting policies onto a schema that was
built assuming open access means auditing every query we've already written.
