alter table public.company_subscriptions
  drop constraint if exists company_subscriptions_plan_check;

update public.company_subscriptions
set plan = 'pmo'
where plan = 'enterprise';

alter table public.company_subscriptions
  add constraint company_subscriptions_plan_check
  check (plan in ('free', 'pro', 'pmo'));
