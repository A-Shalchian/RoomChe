# agent rules — roomche

read `PROJECT.md` for the full spec, data model, and rationale. this file is the short version that you must follow on every change.

## next.js 16 caveat

this is **next.js 16**, not the version your training data knows. apis, conventions, and structure may differ. before writing routing, caching, fetch, or any framework-touching code, read the relevant doc in `node_modules/next/dist/docs/`. heed deprecation notices.

## hard rules

1. **no comments** unless the WHY is genuinely non-obvious (hidden constraint, workaround, surprising invariant). never explain WHAT the code does. never reference task/pr/issue ids.
2. **no ai-slop ui.** no generic gradient hero + 3-feature-card layouts. no purple-to-pink. when building real screens use the `frontend-design` skill. placeholders may be plain typography.
3. **components stay small.** files over ~250 lines must be split. one responsibility per component. feature code lives in `src/features/<feature>/`, shared ui in `src/components/`.
4. **state**: server state → react query or rsc + server actions. local → `useState`/`useReducer`. no redux/zustand unless genuinely needed. no prop-drilling > 2 levels.
5. **typescript strict.** no `any` without a `// FIXME:` + reason. validate boundaries with zod.
6. **no premature abstraction, no backwards-compat shims, no dead code.** delete unused code outright — don't leave `// removed:` markers.
7. **no scope creep.** a bug fix doesn't need surrounding cleanup. a one-shot doesn't need a helper. don't design for hypothetical future requirements.

## folder layout

```
src/
  app/              # routes (app router)
  components/       # shared ui
  features/<x>/     # feature-scoped code
  lib/              # db client, utils, types
    supabase/
```

## supabase

- project ref: `owarvmwdavogquowpqim`
- mcp server is wired in the user's `~/.claude/settings.json`
- schema migrations: write sql files under `supabase/migrations/` when we get there (not yet)
- never commit service-role keys

## verification before saying "done"

- `pnpm tsc --noEmit` — zero errors
- `pnpm lint` — zero errors
- if ui changed: actually run `pnpm dev` and click through the affected flow before reporting done
