# Deploy Winglex Creator Lab on Vercel

This is the standard Next.js version. It builds into .next, runs on Vercel's Node.js runtime, and uses Supabase for email/password sign-in and saved workspaces.

## 1. Set up Supabase
1. Create a Supabase project (https://supabase.com/dashboard).
2. Open its SQL Editor. Paste the contents of supabase/setup.sql and run it.
3. In Authentication → Users, add an app user with your email and a strong password. Enable auto-confirm when creating that user, or complete its email verification.
4. In Authentication settings, disable public signups. This app has no signup screen.
5. Copy the project's URL and publishable API key from the project's Connect/API Keys settings.

Your app login is the user you created in step 3. The code checks that the verified user's email matches ALLOWED_EMAIL. Each workspace row is also protected by Supabase row-level security and owned by that user's ID.

## 2. Configure your existing Vercel project
Under Settings → Environment Variables, add:

| Name | Value |
| --- | --- |
| SUPABASE_URL | Your project URL, such as https://your-project-ref.supabase.co |
| SUPABASE_PUBLISHABLE_KEY | Your Supabase publishable key (sb_publishable_...) |
| ALLOWED_EMAIL | The exact email of the confirmed app user you created |

Set them for Production and for Preview if you will use preview deployments.
A legacy anon key is also accepted via SUPABASE_ANON_KEY instead of SUPABASE_PUBLISHABLE_KEY. Do not use a service-role key: this implementation intentionally accesses data with the signed-in user's permissions.

Under Settings → Build and Deployment:
- Framework Preset: Next.js
- Root Directory: repository root (leave blank)
- Build Command: npm run build, or disable its override
- Install Command: npm ci, or disable its override
- Output Directory: disable the override; leave the framework default
- Node.js Version: 22.x

vercel.json also specifies Next.js and the normal install/build commands.
Do not set the output directory to dist or out. next build generates .next automatically.

## 3. Apply the update to your existing Git checkout
Extract this archive to /Users/bobby/Downloads/winglex-creator-lab-vercel.
Keep your existing repository at /Users/bobby/Downloads/winglex-creator-lab.

Run:
```bash
bash /Users/bobby/Downloads/winglex-creator-lab-vercel/apply-vercel-update.sh /Users/bobby/Downloads/winglex-creator-lab
cd /Users/bobby/Downloads/winglex-creator-lab
git add -A
git commit -m "Migrate Creator Lab to Next.js on Vercel"
git push
```

The update script requires a clean checkout, backs up the previously committed source beside your repository, removes obsolete Cloudflare runtime files, copies the new source, and preserves your .git directory and remote. If it says there are uncommitted files, commit or stash them before retrying. Do not run git init again.

If you prefer manual replacement, use the extracted folder as the new repository contents while retaining your existing .git directory. The update script is safer because merely overwriting files leaves old Cloudflare TypeScript files behind.

Pushing starts a new deployment if your GitHub repository is connected to Vercel. If needed, choose Redeploy in Vercel after adding environment variables.

## 4. Open and verify
- Open the Vercel deployment URL. You should see the sign-in page.
- Sign in as the confirmed app user created in Supabase.
- Edit the campaign budget and click Save changes.
- Reload to confirm it persists.
- Use Sign out to end the browser session.

Sessions last up to one hour and do not silently refresh in this initial internal release. If a session expires while editing, open the Sign in link in a new tab, sign in, then retry saving in your original tab. The UI preserves the unsaved edits. Password reset/MFA/team invitations are not implemented in the app; manage the user in Supabase.

## Transfer saved work from the original app
The initial eight creators are included. Existing saved changes in the original Cloudflare database are not automatically migrated.
1. In the original app, open Actual results → Export workspace backup.
2. In the Vercel app, open Actual results → Import backup.
3. Review the restored workspace and click Save changes.

## Local development
Requires Node.js 22.13 or newer.
```bash
npm ci
cp .env.example .env.local
```
Fill .env.local with the same three values, then:
```bash
npm run dev
```
Open http://localhost:3000. Local development uses the configured Supabase project, so use a separate Supabase project for isolated development data if needed.

Build and run:
```bash
npm run build
npm start
```

Run model/CSV regression tests:
```bash
npm test
```

## Implementation notes
- UI, creator review, editable assumptions, scenarios and CSV results remain intact.
- Authentication is checked in the page and every workspace API request.
- Supabase's access token is held in an HttpOnly, SameSite cookie, with Secure and a __Host- prefix in production. No refresh token is persisted.
- The original creator seed is server-only; it is not bundled into public browser JavaScript.
- Workspaces use Supabase Postgres, owner-specific row-level security, and revision checks to prevent stale overwrites.
- No Supabase service-role secret is required.
- SQL setup creates a new winglex_workspaces table; it does not access the original Sites/D1 database.
- Supporting dependencies from the original lockfile are retained to keep installation reproducible. Vinext and Cloudflare are not used by the build, routes, or persistence in this export.
- Multi-user / multi-brand access controls remain future work. This release allows one configured email.
- Keep the repository private because lib/seed.ts includes the source tracker and creator commercial information.

## References
- Next.js on Vercel: https://vercel.com/docs/frameworks/full-stack/nextjs
- Supabase API keys: https://supabase.com/docs/guides/getting-started/api-keys
- Supabase password sign-in: https://supabase.com/docs/guides/auth/passwords
- Supabase row-level security: https://supabase.com/docs/guides/database/postgres/row-level-security
