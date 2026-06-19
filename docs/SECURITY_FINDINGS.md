# Security findings: roomche

Scope: server actions, the Python bg-remove spawn, the Claude Agent SDK call, Supabase RLS and storage, `next.config.ts` headers, `proxy.ts` session handling, and env handling. Single-user today, moving toward multi-user.

What was already applied to the working tree is listed at the bottom. Everything below is a finding that was NOT auto-applied, with the reason. Severity is rated for the multi-user target, since that is the stated direction.

## High

### H1. Claude Agent SDK runs with `bypassPermissions` and reads an attacker-influenced image path
File: `src/features/items/process-action.ts:77-89`

`classify()` calls `query({ options: { permissionMode: "bypassPermissions", allowedTools: ["Read"] } })`. The prompt embeds `imagePath`, and the model is told to look at a file on disk. Two compounding issues:

1. `bypassPermissions` disables the SDK permission prompt entirely. Today `allowedTools` is restricted to `["Read"]`, which bounds the blast radius, but the mode is the wrong default for server code processing user supplied images. If `allowedTools` is ever widened (or a future SDK default changes), there is no second gate.
2. The image content is user controlled. A crafted image containing text instructions is a classic prompt injection vector. With `Read` allowed and a path under the OS temp dir interpolated into the prompt, a successful injection could coax the model into reading other files the process can access and returning their contents in the JSON it emits, which then flows into `name` / `category` / `location` and gets persisted.

Recommended fix:
- Drop `bypassPermissions`. Use the default permission mode (or `plan`) and supply an explicit `canUseTool` callback that allows `Read` only for paths inside the per request `work` temp directory, denying everything else.
- Constrain the working directory: pass `options.cwd` (or the equivalent sandbox/`additionalDirectories` option) so `Read` cannot escape the temp dir.
- Pass the image as an explicit input rather than instructing the model to open an arbitrary path, so the only readable surface is the one image.
- Treat the returned strings as fully untrusted (they already are length clamped and lowercased, which is good; keep validating with zod at the boundary, see M2).

Why not auto-applied: changing `permissionMode` / `canUseTool` is auth flow and item-processing-pipeline logic, which is explicitly off limits for automated edits here, and getting the `canUseTool` path allowlist wrong could break the classify step. Needs a human to choose the exact SDK option names for the installed `@anthropic-ai/claude-agent-sdk` version and to test the flow end to end.

### H2. No CSP, and a strict one needs nonces this app does not yet emit
File: `next.config.ts` (CSP intentionally omitted), interacts with `src/app/layout.tsx:97-100`

The hardening that was applied adds `X-Frame-Options: DENY`, HSTS, nosniff, Referrer-Policy, and Permissions-Policy, but deliberately does not add `Content-Security-Policy`. A real CSP is the single biggest missing control. It was not auto-applied because:

- The app router injects inline bootstrap/hydration scripts. A correct `script-src` needs a per request nonce wired through `proxy.ts` and consumed by the framework, or it needs `'unsafe-inline'`, which defeats the purpose.
- `layout.tsx` renders a JSON-LD block via `dangerouslySetInnerHTML` inside a `<script type="application/ld+json">`. Under a nonce based `script-src` this tag also needs the nonce, or it gets blocked.
- `connect-src` must allow the Supabase project origin (`https://ptjpvefasdpnrkycufxx.supabase.co` and its `wss://` for realtime if used) and Google OAuth endpoints. `img-src` must allow the Supabase storage signed URL origin and `data:` (the process flow renders `data:image/png;base64,...` previews). Getting any of these wrong breaks images, auth, or data fetches.

Recommended fix (nonce based, app router):
1. In `proxy.ts`, generate a `crypto.randomUUID()` style nonce per request, set it on a request header, and emit a `Content-Security-Policy` response header like:
   `default-src 'self'; script-src 'self' 'nonce-<n>' 'strict-dynamic'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://ptjpvefasdpnrkycufxx.supabase.co; font-src 'self' data:; connect-src 'self' https://ptjpvefasdpnrkycufxx.supabase.co https://accounts.google.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`
2. Read the nonce in `layout.tsx` via `headers()` and pass it to the JSON-LD `<script nonce={...}>`.
3. Keep `style-src 'unsafe-inline'` for now: Next/Tailwind emit inline style attributes and the app uses many `style={{}}` props. Tightening style-src is a separate, lower value effort.
4. Verify the full flow (`/`, `/login`, OAuth round trip, `/app` with images, the process + classify modal) with the browser console open for CSP violations before shipping.

Why not auto-applied: a wrong CSP silently breaks auth, image rendering, or hydration, and the fix touches `proxy.ts` session handling, which is in scope but risky to change blind. Needs human verification in a browser.

## Medium

### M1. Server actions trust client payloads with no schema validation (zod absent at the boundary)
Files: `src/features/items/save-action.ts:14-33`, `src/features/items/edit-action.ts:17-67`, `src/features/items/process-action.ts:91-106`, `src/features/items/dupes/actions.ts:15-29`, `src/features/items/view-action.ts:5-11`

Server actions accept structured payloads (`SavePayload`, `EditPayload`) and raw id strings and act on them after only ad hoc `.trim().slice()` cleanup. AGENTS.md requires validating boundaries with zod, and none of these use it. Concretely:

- `view-action.ts` and `dupes/actions.ts` take `id` strings and pass them straight into Supabase queries / RPC with no UUID validation. RLS and the parameterised client prevent SQL injection and cross user access, so this is not currently exploitable, but it is unvalidated input reaching the database.
- `save-action.ts` parses `nobgDataUrl` with a regex and base64 decodes whatever matches, with no size cap. A large or malformed data URL is decoded into a Buffer and uploaded; there is no max length check before `Buffer.from`.
- `edit-action.ts` accepts `would_discard` typed as a union but never revalidates it at runtime before writing.

Recommended fix: define zod schemas (`z.string().uuid()` for ids, an enum for `would_discard`, a bounded base64/data-url check with a max byte length for the image) and `parse` at the top of each action. Return a typed error result on failure rather than throwing raw.

Why not auto-applied: these are server action input contracts; adding zod changes their runtime behaviour (rejecting inputs that previously slipped through), and `edit-action.ts` / `save-action.ts` are part of the item pipeline area and are currently being edited in the working tree. Low risk but should be done deliberately, not as a drive by.

### M2. `loadDismissedPairs` does not scope by `user_id` and leans entirely on RLS
File: `src/features/items/dupes/actions.ts:7-13`

`loadDismissedPairs()` selects from `dupe_dismissals` with no `.eq("user_id", user.id)` filter and no auth check. It is safe today only because `dupe_dismissals` has RLS with a `select using (auth.uid() = user_id)` policy (migration `0007`). This is defence in depth worth adding: if RLS is ever disabled on that table, or the query is ever run with a service-role client, it would leak every user's dismissal pairs. The other read path `load-items.ts` has the same RLS-only posture for `items` and `locations`.

Recommended fix: add an explicit `getUser()` guard and `.eq("user_id", user.id)` to `loadDismissedPairs`, matching the pattern used in the write actions. Do not weaken RLS; keep both layers.

Why not auto-applied: it edits an action in the actively-changing items feature, and the correct behaviour (return empty vs redirect when unauthenticated) is a product decision.

### M3. No rate limiting or size cap on the expensive process pipeline
File: `src/features/items/process-action.ts:21-48`

`processItem` accepts any uploaded `File`, writes it to a temp dir, spawns Python (bg removal), and then makes a Claude Agent SDK call. There is no file size limit, no MIME validation beyond "is a File", and no per user rate limit. A user (or, in multi-user, any authenticated user) can drive unbounded Python spawns and paid model calls. There is also no auth check inside `processItem` itself; it relies on the action only being reachable from authenticated UI.

Recommended fix: validate `file.type` is an allowed image MIME, cap `file.size` (for example 10 MB), add a `getUser()` guard at the top of `processItem`, and add a simple per user rate limit (in-memory token bucket for single instance, or a Supabase/Upstash counter for multi instance).

Why not auto-applied: explicitly off limits (item-processing pipeline), and rate limiting needs an infra decision.

## Low

### L1. `proxy.ts` swallows `getUser()` failures
File: `src/lib/supabase/proxy.ts:31-42`

`updateSession` destructures `{ data: { user } }` from `supabase.auth.getUser()` without handling the `error` field or a thrown/rejected call. If the Supabase auth endpoint errors transiently, `user` is `undefined` and a logged-in user is treated as anonymous and redirected to `/login`. Not a vulnerability (it fails closed), but it degrades UX and hides auth outages. Consider catching and, on transient error, allowing the request through rather than forcing a redirect loop. Not auto-applied because it changes auth/session behaviour.

### L2. Open-redirect surface is low but worth a guard
Files: `src/app/auth/callback/route.ts:4-9`, `src/features/auth/actions.ts:9-19`

Both derive `origin` from the `x-forwarded-host` / `x-forwarded-proto` request headers and use it to build redirect URLs (`/login?error=...`, the OAuth `redirectTo`). Redirect targets are hardcoded same-site paths, so this is not an open redirect today. However, trusting `x-forwarded-host` blindly means a spoofed header (if the upstream proxy does not strip it) controls the host of the OAuth `redirectTo` and error redirects. Recommend validating the forwarded host against an allowlist of known app hosts, or relying on a configured `NEXT_PUBLIC_SITE_URL` for the canonical origin instead of the inbound header. Not auto-applied because it touches auth flow and needs the deployment's trusted-proxy assumptions confirmed.

### L3. Signed URL expiry is 1 hour, fine, but image data URLs persist client side
File: `src/features/items/dashboard/load-items.ts:26`

`createSignedUrls(rawKeys, 60 * 60)` mints 1 hour signed URLs for the private `item-images` bucket. The expiry is reasonable. No change recommended. Noted for completeness because it was in scope (storage signed-URL expiry): the bucket is correctly private (migration `0003`, `public: false`) with per user folder RLS keyed on `(storage.foldername(name))[1] = auth.uid()`, and keys are written as `${user.id}/${uuid}.png` in `save-action.ts`, so path scoping is correct.

### L4. Python spawn argument packing is safe today but fragile
File: `src/features/items/process-action.ts:50-62`

`spawn("python", [script, \`${src}::${dst}\`])` uses `spawn` with an argv array (no shell), so there is no shell injection, and `src`/`dst` are server-generated paths under a `randomUUID()` temp dir, so there is no user controlled path component and no traversal. The only fragility is the `::` delimiter: if a future temp path ever contained `::` the Python side would mis-split. Low priority. Keep using the argv-array form (never switch to `shell: true`).

## Confirmed good (no action needed)

- RLS is enabled on every application table (`profiles`, `locations`, `items`, `tags`, `item_tags`, `dupe_dismissals`) with own-row select/insert/update/delete policies. `item_tags` is scoped via an `exists` check on the parent item. Storage `item-images` is private with per user folder policies.
- `SUPABASE_SERVICE_ROLE_KEY` and `GOOGLE_CLIENT_SECRET` live only in `.env.local` (gitignored, not tracked) and are never referenced in `src/`. Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` reach the client, which is correct; the anon key is meant to be public and is protected by RLS.
- `getEnv()` validates env presence with zod.
- Security definer functions set `search_path = ''` and revoke `execute` from `public`/`anon` (migrations `0004`, `0005`, `0006`).
- Write server actions re-check `auth.getUser()` and scope by `user_id` (defence in depth on top of RLS).

## Applied to the working tree (not in this file)

`next.config.ts`:
- `poweredByHeader: false` (removes `X-Powered-By`).
- Response headers on all paths: `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-DNS-Prefetch-Control: on`, and `Permissions-Policy: camera=(self), microphone=(), geolocation=(), browsing-topics=(), interest-cohort=()`. Camera is kept enabled for same-origin because `camera-capture.tsx` uses `getUserMedia`. Verified present via `next build` + `next start` + curl, and verified `tsc`/`lint`/`build` stay green.
