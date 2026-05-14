# roomche

> make your room a database.

## what this is

roomche is a personal inventory app. photograph everything you own, the app cuts the background out, names and categorizes it, stores it as a structured object. goal: answer "what do i own, where is it, why do i keep it, and would i ever throw it out" — for every single thing.

end-state (later): a pixelated 2D replica of your actual room, populated with the items you've photographed, in roughly the spots they actually live.

**single-user (me) for now**, designed so adding multi-user later isn't a rewrite. RLS is already enforcing per-user isolation; the rest is just hardening.

## user flow

1. landing — `make your room a database.` + cta
2. login — google oauth
3. onboarding survey — questions tbd, currently a stub button that sets `onboarded_at`
4. app home — browse, search, add items
5. add item — take/upload photo → bg removed → name (manual or AI-suggested) → category → location → optional metadata → save
6. items live in a database that knows about: containers (a suitcase IS an item that contains other items), locations (rooms/closets), tags, categories
7. eventually — render a pixel-art version of the room from the database

## stack

- **next.js 16** + app router + typescript + tailwind v4 + react 19
- **supabase** — postgres, storage, auth. project ref: `ptjpvefasdpnrkycufxx`
- **shadcn/ui** — primitives, added on demand
- **react query** — client-side server state (not yet added)
- **zod** — boundary validation
- pnpm

### next.js 16 caveats

next 16 has breaking changes from training data. before writing routing/caching/fetch/proxy code, read the relevant doc in `node_modules/next/dist/docs/`.

- `middleware.ts` is renamed to **`proxy.ts`** (function name is `proxy`, not `middleware`). lives at `src/proxy.ts`.
- async `cookies()`, `headers()`, `searchParams`.

## data model

```
auth.users            (managed by supabase)
profiles              user_id pk → auth.users, display_name, onboarded_at, created_at
locations             id, user_id, name, created_at
items                 id, user_id, name, category, image_url, image_url_nobg,
                      location_id → locations, container_id → items (self-ref),
                      is_container, why_kept, would_discard ('never'|'maybe'|'soon'),
                      notes, created_at, updated_at
tags                  id, user_id, name, unique(user_id, name)
item_tags             item_id → items, tag_id → tags, pk(item_id, tag_id)
```

a suitcase containing other items = an `item` with `is_container=true`; nested items reference it via `container_id`. recursion allowed.

a trigger on `auth.users` insert creates a matching `profiles` row using `raw_user_meta_data ->> 'full_name'`.

`items.updated_at` auto-updates via trigger.

## security posture

current state — solid for single-user, needs additions for multi-user:

**in place:**
- RLS on every table. policies are `user_id = auth.uid()` for select/insert/update/delete. `item_tags` policy delegates to the parent item's ownership.
- private storage bucket `item-images`, paths keyed `<user_id>/...`, policies enforce per-folder access.
- profile trigger function is `security definer` with locked `search_path = ''` and `execute` revoked from `public/anon/authenticated` (advisors clean).
- google oauth only — no passwords stored or hashed by us.
- all mutations via server actions. service-role key never leaves `.claude/settings.local.json` (gitignored).
- proxy refreshes sessions every request, redirects unauthenticated users away from `/app` and `/onboarding`.

**deferred until multi-user:**
- no CSRF tokens on server actions (rely on same-origin).
- no rate limiting on auth/actions.
- no CSP/security headers configured in `next.config.ts`.
- `display_name` from google metadata trusted as-is (no sanitization).
- no audit log.

## engineering rules

these are not suggestions.

### comments

- **don't write them by default.**
- only when the WHY is non-obvious: hidden constraint, workaround, subtle invariant, surprising behavior.
- never explain WHAT the code does — names should do that.
- never reference task/pr/issue numbers.

### components

- one responsibility per component.
- files over ~250 lines must be split.
- colocate small subcomponents; hoist shared ones to `src/components/`.
- feature-scoped code lives in `src/features/<feature>/`.

### state

- server state → react query, or rsc + server actions where it fits cleanly.
- local ui state → `useState`/`useReducer`.
- no redux/zustand unless genuinely needed.
- no prop-drilling > 2 levels.

### typescript

- `strict: true`. no `any` without a `// FIXME:` + reason.
- prefer `type` for unions, `interface` for extendable objects.
- validate at boundaries with zod (form input, fetch responses, env vars).

### ui

- no ai-slop. no generic gradient hero + 3 feature cards. no purple-to-pink.
- use the `frontend-design` skill when building real screens.
- placeholder pages can be plain typography. final pages must look intentional.

### code style

- self-documenting names beat comments.
- three similar lines beats a premature abstraction.
- no backwards-compat shims, dead-code re-exports, "in case we need it later" code.
- delete unused code completely. no `// removed:` markers.

## folder layout

```
src/
  app/                  # routes (app router)
    page.tsx            # landing
    login/              # google oauth entry
    onboarding/         # post-signup stub
    app/                # signed-in home
    auth/callback/      # oauth code exchange
    layout.tsx
  components/           # shared ui (empty for now)
  features/
    auth/actions.ts     # signInWithGoogle, signOut
    onboarding/actions.ts
    items/actions.ts    # seedDummyItem (placeholder)
  lib/
    env.ts              # zod-validated env
    database.types.ts   # generated supabase types
    supabase/
      client.ts         # browser client
      server.ts         # server client
      proxy.ts          # updateSession helper for proxy.ts
  proxy.ts              # next 16 proxy: session refresh + route guards
supabase/
  migrations/           # version-controlled sql
    0001_init.sql
    0002_rls.sql
    0003_storage.sql
    0004_profile_trigger.sql
    0005_harden_functions.sql
```

## supabase

- project ref: `ptjpvefasdpnrkycufxx`
- url: `https://ptjpvefasdpnrkycufxx.supabase.co`
- MCP wired in `.claude/settings.local.json` (gitignored) with service-role key
- schema migrations live in `supabase/migrations/`. write the sql file, apply via `mcp__supabase__apply_migration`
- never commit service-role keys
- run `mcp__supabase__get_advisors` after any DDL to catch missing RLS / function issues

## what's built

- next.js 16 scaffold (ts, tailwind v4, app router, src/, `@/*` alias)
- landing at `/` with tagline + cta
- `/login` with google oauth button
- `/auth/callback` exchanges the code, branches to `/onboarding` or `/app` based on `profiles.onboarded_at`
- `/onboarding` stub: greets user, "i'm in" button sets `onboarded_at`
- `/app`: lists items, shows seed-dummy-item button if empty, sign-out
- `src/proxy.ts`: session refresh + redirect guards on `/app` and `/onboarding`
- supabase clients (browser + server) typed with generated `Database` type
- all 5 migrations applied. zero security advisors.

## what's NOT built yet

- onboarding survey content (questions tbd)
- image upload ui + storage write path
- background removal pipeline (likely u2net or rmbg via hugging face inference api)
- ai item-naming
- item crud beyond the seed action (real add/list/detail/edit)
- container ui (item-in-item nesting)
- pixel room renderer
- final visual design (placeholder typography only right now)

## google oauth setup (one-time)

needed before login works locally:

1. google cloud console → apis & services → credentials → create oauth 2.0 client id (web application).
2. authorized redirect uri: `https://ptjpvefasdpnrkycufxx.supabase.co/auth/v1/callback`
3. copy client id + secret.
4. supabase dashboard → authentication → providers → google → enable, paste credentials, save.
5. for local: also add `http://localhost:3000` (or whichever port) to authorized javascript origins.

## verification before saying "done"

- `pnpm tsc --noEmit` — zero errors
- `pnpm lint` — zero errors
- if ui changed: actually run `pnpm dev` and click through the affected flow before reporting done
- after DDL changes: `mcp__supabase__get_advisors` returns no security warnings
