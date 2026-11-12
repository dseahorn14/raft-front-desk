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

## Appointment and employee information

Dashboard includes appointment details with all clients linked through `raft.scheduledfor`, counselor and scheduling employee names/IDs, and room names/numbers. Client Lookup shows the same relationship labels alongside its existing appointment and family details. Selecting an existing appointment in Add/Edit Record shows its relationship summary above the unchanged editor.

Employee Information appears on Dashboard only for Admin. The loader explicitly selects `employee.wage` only for Admin; Scheduler queries omit wages, notes, and assignments, and Counselor queries omit wages. Unknown staff roles are rejected before querying. Existing database grants and policies remain the final authorization boundary.

Run `node --test tests/access-and-details.test.mjs` and `npm run build`. Tests use synthetic fixtures and mocked queries, without live records or writes. Manually verify:

1. Admin: Dashboard statistics are unchanged; appointment details show every linked client and correct staff/room labels; Employee Information shows names, person IDs, and wages.
2. Scheduler: no Employee Information or wages; inspect Network requests to confirm no wage, notes, or assignment columns are selected. Appointment scheduling and client/family lookup remain available.
3. Counselor: no wages; only existing appointment notes and client assignments can be edited. Scheduling fields remain disabled and new scheduling records cannot be created.
4. On a designated test record, save an authorized change and confirm the success message, then refresh records. A rejected save must show an explicit error and no success message. Do not use production records for write tests.

Exactly four navigation screens remain: Home, Client Lookup, Dashboard, and Add/Edit Record. No schema, authentication, permission, or database record changes are part of this update.

### Staff directory and wage display

Home now includes a compact Staff Directory with employee names/IDs and reporting relationships. It uses separate explicit queries for `employee.personid,supervisorid` and the names of visible employees in `person`; it never requests wages, even for Admin. Existing access restrictions can produce an empty directory or an unavailable message with Retry. An inaccessible supervisor is labeled unavailable with the referenced ID; a null supervisor is shown as `None`.

Admin Dashboard Employee Information formats wages as US currency with two decimal places under `Wage ($)` and resolves supervisors through the employee relationship and person names. No wage time unit is assumed. Missing wages display `Not available`, not zero. Scheduler and Counselor wage selections remain excluded.

After Pages deployment, check Home's employee/reporting names for each role. As Admin, check Dashboard currency formatting and supervisor names/IDs, including `None` for employees without supervisors. In browser Network tools, verify Home requests only directory columns and Scheduler/Counselor requests never select wages. Recheck the existing four screens. Automated coverage includes formatting, null/restricted supervisors, wage-free directory queries/rendering, access failures, and existing role/query boundaries.

## AI Development Process

### AI tool used

OpenAI Codex assisted with implementing, reviewing, testing, and documenting the RAFT Front Desk website and its GitHub Pages deployment.

### Initial prompt

The original request was to build a four-screen RAFT front-desk website connected to the existing Supabase database. The screens were Home, Client Lookup, Dashboard, and Add/Edit Record. The website needed staff authentication and role-based access for Admin, Scheduler, and Counselor while respecting existing database relationships and permissions. This is a summary of the request, not an exact quotation of the original prompt.

### What needed fixing

Database connectivity and authorization needed investigation during development. The cloud environment initially blocked the Supabase hostname; its updated configuration allowed connectivity checks. Later, the deployed website allowed sign-in but showed zero clients, appointments, and rooms even though records existed in SQL Editor. Investigation checked schema selection, JWT role expectations, and query error handling. The frontend selected the `raft` schema and surfaced failed queries rather than converting errors into empty results. Row-level security filtering or a different deployed project remained possible explanations; the exact authenticated permission issue was not confirmed by those checks, and no database permission or authentication changes were made during the investigation.

The initial appointment presentation also lacked enough relationship details: staff needed to see every linked client, counselor names, the employee who scheduled an appointment, and room names rather than relying on IDs alone. Role-specific information needed refinement so Admin could see useful employee wage information without requesting or exposing wages to Scheduler or Counselor. Scheduler queries also needed to continue excluding appointment notes and client assignments, while Counselor editing remained limited to permitted notes and assignments.

### Changes after the initial implementation

- **Appointment details:** Added all associated clients with full names and client IDs using `scheduledfor`, plus counselor names/IDs, `Scheduled by` employee names/IDs, and room names/numbers. These details make appointments easier to understand without manually matching database IDs, while preserving appointment editing and existing client/family lookup.
- **Admin employee information:** Added an Admin-only Employee Information section to the existing Dashboard. Explicit column selections retrieve wages only for Admin, keeping sensitive information out of Scheduler and Counselor requests rather than merely hiding it in the interface.
- **Currency formatting:** Formatted wages as US currency with two decimal places under `Wage ($)`. No hourly unit was assumed because the repository documentation did not confirm one. This makes amounts easier to read consistently.
- **Supervisor relationships:** Resolved supervisors through `employee.supervisorid`, `employee.personid`, and the `person` table, displaying full names and IDs, `None` for no supervisor, and an unavailable label when details cannot be accessed. This clarifies reporting relationships without changing records.
- **Home Staff Directory:** Added a compact directory of employee names and reporting relationships using separate wage-free queries for every role. It helps staff identify reporting lines while handling restricted access gracefully and retaining exactly four screens.
- **Feedback and validation:** Improved record-save success and error messages and added automated tests for relationship displays, currency formatting, restricted information, and role-specific queries. Production builds were run before pushing the feature updates. These checks support usability and frontend correctness; live database authorization still requires verification with authorized staff sessions.

The follow-up changes were committed after the original implementation, preserving the original `a5d5baa` commit in repository history. They retained authentication, Dashboard statistics, family roles, and Add/Edit Record functionality without adding DELETE operations, tables, migrations, or changes to existing database records.
