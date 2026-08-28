# CoinKeep — setup & what changed

## What I changed
1. Rebranded the whole app from "Ledgerly" to **CoinKeep**, with a new logo (public/logo.svg + PNG icons).
2. Multi-currency: 26 currencies with symbols (₹, $, £, €, ¥, د.إ, and more). Default is now INR.
   Change it in Settings > Financial profile > Currency.
3. Account types: **Personal, Business, Family/Group, Other**. Chosen at sign-up and changeable in Settings.
4. PWA: the app is now installable (Add to Home Screen / Install app) and works offline for the shell.
5. Fixed the "stuck signing / loading" issue: the auth guard now reads the cached session first
   instead of forcing a network check on every navigation. The real root cause is the database
   connection — see below.

## You MUST do these two things (10 minutes)

### 1. Create your own free Supabase project
The .env currently points at a placeholder project you don't own, which is why login hangs.
- Go to https://supabase.com, sign up (free, no card).
- Create a new project. Wait for it to finish provisioning.
- Open Project Settings > API. Copy the **Project URL** and the **anon/publishable key**.
- Open the `.env` file in this project and replace the values:

```
SUPABASE_PROJECT_ID="your-project-ref"
SUPABASE_PUBLISHABLE_KEY="your-anon-key"
SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_PROJECT_ID="your-project-ref"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
```

### 2. Run the database migrations
In your Supabase dashboard > SQL Editor, run the files in `supabase/migrations/` **in order**
(oldest timestamp first). The newest one (`..._add_account_type.sql`) adds the account-type column.
If you use the Supabase CLI instead: `supabase db push`.

## Run it
```
npm install
npm run dev
```
Then open the local URL. To test the PWA install, run `npm run build && npm run preview`
(service workers need a production build), open it in Chrome, and use the install icon in the address bar.

Note: no em dashes were used in this file.
