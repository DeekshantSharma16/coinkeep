-- Make INR the default currency for new profiles and backfill untouched rows.
ALTER TABLE public.profiles ALTER COLUMN currency SET DEFAULT 'INR';

-- Backfill profiles still on the old USD default that have no financial context yet,
-- so existing empty accounts pick up INR without overriding a deliberate choice.
UPDATE public.profiles
SET currency = 'INR'
WHERE currency = 'USD'
  AND monthly_income_target = 0
  AND savings_goal = 0;
