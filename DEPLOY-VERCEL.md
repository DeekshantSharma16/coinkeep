# Deploying CoinKeep to Vercel

## One-time prep

1. Make sure `.env` is filled with your real Supabase values (it is not uploaded to Git — that's intentional).
2. Confirm the app runs locally first: `npm install`, then `npm run dev`, sign up, reach the dashboard.

## Step 1 — Put the project on GitHub

1. Create a new repo on github.com (private is fine).
2. In your project folder:
   ```
   git init
   git add .
   git commit -m "CoinKeep"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/coinkeep.git
   git push -u origin main
   ```
   `.env` will NOT be pushed (it's gitignored now) — that's correct.

## Step 2 — Import into Vercel

1. Go to https://vercel.com, sign in with GitHub.
2. Click "Add New > Project", pick your coinkeep repo.
3. Framework preset: leave as detected / "Other". Build command is `npm run build` (already in vercel.json).

## Step 3 — Set the Nitro target + environment variables

In the Vercel import screen, open "Environment Variables" and add ALL of these:

```
NITRO_PRESET = vercel
SUPABASE_PROJECT_ID = fhwijeokhxezykrpkidk
SUPABASE_PUBLISHABLE_KEY = <your full sb_publishable_ key>
SUPABASE_URL = https://fhwijeokhxezykrpkidk.supabase.co
VITE_SUPABASE_PROJECT_ID = fhwijeokhxezykrpkidk
VITE_SUPABASE_PUBLISHABLE_KEY = <your full sb_publishable_ key>
VITE_SUPABASE_URL = https://fhwijeokhxezykrpkidk.supabase.co
```

`NITRO_PRESET = vercel` is the important one — it tells the build to produce Vercel-compatible output instead of the default Cloudflare output.

## Step 4 — Deploy

Click Deploy. Wait for the build. You'll get a URL like `coinkeep.vercel.app`.

## Step 5 — Tell Supabase about the new URL (REQUIRED for login)

In Supabase dashboard > Authentication > URL Configuration:
- Set "Site URL" to your Vercel URL, e.g. `https://coinkeep.vercel.app`
- Under "Redirect URLs", add:
  - `https://coinkeep.vercel.app/dashboard`
  - `https://coinkeep.vercel.app/auth/reset`

Without this, email confirmation and password reset links will break in production.

## Step 6 — PWA install

Vercel serves HTTPS, so the install prompt works for anyone. Open your Vercel URL in Chrome/Edge and click the install icon in the address bar, or on mobile use "Add to Home Screen".

## If the build fails

The most likely cause is the Nitro preset. If `NITRO_PRESET = vercel` alone doesn't work, the build log will usually name the fix. Send me the build log and I'll adjust. This is the one part I could not test in advance because it requires an actual build against Vercel's environment.

No em dashes were used in this file.
