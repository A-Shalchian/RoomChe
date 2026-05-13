# roomche

> make your room a database.

## what this is

roomche is a personal inventory app. you photograph everything you own, the app cuts the background out of each photo, names and categorizes the item, and stores it as a structured object in a database. the goal: be able to answer "what do i own, where is it, why do i keep it, and would i ever throw it out" — for every single thing.

end-state goal (later, not now): a pixelated 2D replica of your actual room, populated with the items you've photographed, in roughly the spots they actually live.

this is a serious project. single-user (me) for now, designed so adding multi-user later isn't a rewrite.

## user flow

1. **landing** — `make your room a database.` + cta
2. **auth** — sign up / log in
3. **onboarding survey** — a few questions about you and your space, answers persist to your profile (specifics tbd)
4. **app home** — browse, search, add items
5. **add item** — take/upload photo → bg removed by an open-source model → name (manual or AI-suggested) → category → location → optional metadata (why kept, would discard, parent container, notes) → save
6. **items live in a database** that knows about: containers (a suitcase IS an item that contains other items), locations (rooms/closets), tags, categories
7. **eventually** — render a pixel-art version of the room from the database

## data model (sketch)

```
users           id, email, created_at, onboarded_at
profiles        user_id, display_name, room_type, ...survey answers
items           id, user_id, name, category, image_url, image_url_nobg,
                location_id, container_id (nullable, fk -> items.id),
                why_kept, would_discard, notes, is_container,
                created_at, updated_at
locations       id, user_id, name           # bedroom, closet, desk drawer
tags            id, user_id, name
item_tags       item_id, tag_id
```

a suitcase containing other items = an `item` row with `is_container=true`, and the items inside reference it via `container_id`. recursive containment is allowed (box inside suitcase inside closet).

## stack

- **next.js 16** + app router + typescript + tailwind v4
- **supabase** — postgres, storage, auth (project: `owarvmwdavogquowpqim`)
- **shadcn/ui** — primitives, added on demand
- **react query** — client-side server state
- **zod** — boundary validation
- pnpm

## engineering rules

these are not suggestions.

### comments
- default: **don't write them.**
- only write a comment when the WHY is non-obvious: a hidden constraint, a workaround, a subtle invariant, behavior that would surprise the reader.
- never explain WHAT the code does — names should do that.
- never reference current task / pr / issue numbers in comments.

### components
- one responsibility per component.
- no 5000-line files. if a file is over ~250 lines, split it.
- colocate small subcomponents next to their parent. hoist shared ones to `src/components/`.
- feature-scoped code lives in `src/features/<feature>/` (e.g. `items/`, `onboarding/`).

### state
- server state → react query, or rsc + server actions where it fits cleanly.
- local ui state → `useState` / `useReducer`.
- no redux. no zustand unless we genuinely need cross-tree global state.
- no prop-drilling more than 2 levels — lift to context or restructure.

### typescript
- `strict: true`.
- no `any` without a `// FIXME:` and a written reason.
- prefer `type` for unions, `interface` for objects you might extend.
- validate at boundaries with zod (form input, fetch responses, env vars).

### ui
- no ai-slop visuals. no generic gradient hero + 3 feature cards. no purple-to-pink. no "lorem ipsum but make it tech."
- use the `frontend-design` skill when building real screens.
- placeholder pages can look plain. final pages must look intentional.

### code style
- self-documenting names beat comments.
- three similar lines beats a premature abstraction.
- no backwards-compat shims, dead-code re-exports, or "in case we need it later" code.
- delete unused code completely — no `// removed:` markers.

## folder layout

```
src/
  app/                  # routes (app router)
    page.tsx            # landing
    login/
    onboarding/
    app/                # post-login home
    layout.tsx
  components/           # shared ui
  features/
    items/              # add/list/edit items
    onboarding/         # survey flow
  lib/
    supabase/
      client.ts         # browser client
      server.ts         # server client
    types.ts
    utils.ts
```

## what's built so far

- next.js scaffold (ts, tailwind v4, app router, src/, @/* alias)
- placeholder landing page
- placeholder routes: `/login`, `/onboarding`, `/app`
- supabase client wiring (browser + server)
- `.env.example` with required vars

## what's NOT built yet

- background removal pipeline (deferred — likely u2net or rmbg via hugging face inference api)
- real auth (login page is a stub)
- onboarding survey content (questions tbd)
- image upload + storage
- item crud (add / list / detail / edit)
- supabase schema migrations
- pixel room renderer
- ai item-naming
- final visual design (placeholder typography only right now)
