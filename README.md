# RAFT front desk

React + Vite frontend for Richmond Area Family Therapy, using Supabase JavaScript. This initial scaffold includes responsive navigation for Home, Client Lookup, Dashboard, and Add/Edit Record and email/password authentication with persistent sessions and sign-out.

## Run locally

Use Node.js 22.12+ (validated with Node.js 24).

```sh
npm ci
cp .env.example .env.local
# Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local
npm run dev
```

Use only a Supabase publishable or legacy anon key in this frontend. Never use a service-role key. Environment files containing local values are ignored by Git.

## Validate

```sh
npm run build
npm run preview
```

Without connection settings, confirm that the login page explains the missing setup and disables sign-in. With valid settings, sign in with an existing staff account, navigate all four screens, refresh to verify session persistence, and sign out. Confirm the workspace is hidden after sign-out. Use the role-specific acceptance checks below to validate database behavior with your existing staff accounts.

## GitHub Pages

The production URL is https://dseahorn14.github.io/raft-front-desk/.
Vite uses `/raft-front-desk/` as its base path so built assets load correctly.

In Settings → Secrets and variables → Actions → Variables, add these repository variables:

- `VITE_SUPABASE_URL`: your Supabase project's HTTPS URL.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: that project's publishable key (or legacy anon key), never a secret or service-role key.

These values are embedded in the public browser bundle by Vite. Cloud environment variables do not automatically become GitHub Actions variables. Database access continues to depend on existing Supabase authentication and database permissions.

In Settings → Pages, select GitHub Actions as the source. Pushes to `main` and manual runs of **Deploy to GitHub Pages** install locked dependencies with `npm ci`, build, upload `dist`, and deploy it. A missing variable stops the build with a setup message.

After adding or changing variables, open Actions → Deploy to GitHub Pages → Run workflow → main. Confirm both build and deploy succeed, then open the URL above. Check that CSS and JavaScript load without 404 errors and the login form is enabled. Manually sign in with an existing staff account, navigate all four screens, refresh, and sign out. Do not share passwords or session tokens.

Navigation uses React state rather than URL paths: every screen stays at `/raft-front-desk/`, so GitHub Pages does not need an SPA rewrite or 404 fallback. Refresh restores the existing session and opens Home; it does not retain the selected screen or unsaved edits. Local dev and preview URLs also use `/raft-front-desk/`.

## Vercel

Import this repository as a Vite project. Build command: `npm run build`. Output directory: `dist`. Add the two VITE_SUPABASE environment variables in Vercel project settings before building. Navigation uses local React state and needs no server routing configuration.

No follow-up feature-change commit has been created; this initial implementation awaits live role-specific testing.

## Connected database implementation

The four screens now use explicit column lists in the existing `raft` schema. Role verification requires both `user.app_metadata.staff_role` and the matching JWT `role` (`raft_admin`, `raft_scheduler`, or `raft_counselor`). Unrecognized roles are blocked. Scheduler queries omit wages, notes, and assignments; counselor queries omit wages. Admin can edit all listed record types, scheduler can edit clients/people/rooms/scheduling, and counselors can edit only existing notes and assignments. There are no delete controls or delete calls.

Client Lookup searches names, IDs, phone numbers, and email; displays contact details, appointments, memberships and family roles. Dashboard paginates database reads and calculates totals from returned rows. Statistics reflect the records the signed-in role can access.

Creation uses explicitly supplied IDs, with uniqueness enforced by the database; never calculate a new ID using max+1. Client creation here attaches an existing eligible person. Because deferred completeness rules may require atomic writes across tables, creation of entirely new person/client records can remain blocked without an existing authorized transaction RPC. Do not add a database function or change constraints as part of this frontend setup.

### Initial acceptance checks

Use the three existing staff accounts with your own passwords. Do not put passwords in the repository or chat.

1. Sign in, confirm the displayed role, refresh, navigate every screen, and sign out.
2. Compare client details, family roles, appointment counts, and room minutes with known database records.
3. Admin: verify wages are visible in the employee editor. Test an authorized update on a designated test record.
4. Scheduler: verify notes, assignments, and wages are absent. Test a scheduling update. Verify database requests with forbidden columns are rejected, even outside this UI.
5. Counselor: verify wages are absent and only notes/assignments can be updated. Confirm the database rejects scheduling updates even outside this UI.
6. Verify anonymous reads and DELETE operations are denied using your existing security test process; do not attempt destructive operations on production records.
7. Verify helpful errors for duplicate IDs, invalid foreign keys, required business rules, and revoked permissions.

Live authenticated access and writes have not been verified by the developer: account passwords were not provided, and this cloud instance initially denied the Supabase hostname at its network proxy. A successful build does not establish database authorization correctness. No database schema changes or migrations were executed.

Developer validation: production build passed. Browser tests with simulated Supabase responses passed for all three roles, covering client/family lookup, statistics rendering, editor restrictions, explicit role-specific query columns, mobile layout, and a counselor notes-only update payload. These simulations are not evidence that live PostgreSQL grants are correct.
