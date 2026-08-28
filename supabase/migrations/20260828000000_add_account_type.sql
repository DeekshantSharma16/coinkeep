-- Add account_type to profiles (personal | business | family | other)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'personal';

-- Default new accounts to INR instead of USD
ALTER TABLE public.profiles
  ALTER COLUMN currency SET DEFAULT 'INR';

-- Update the signup trigger so full_name AND account_type are captured
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, account_type)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url',
    COALESCE(NEW.raw_user_meta_data ->> 'account_type', 'personal')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
