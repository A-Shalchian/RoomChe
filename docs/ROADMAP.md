# roomche roadmap

the framing that matters: roomche, for its owner, is a **record of ownership**, not a declutter tool. the owner is a keeper, not a thrower. so the value is "know what i own, prove it, know what it cost, know if i use it", not "decide what to toss". everything below is sequenced against that framing.

## shipped

- stats engine (limbo, unjudged, untouched, verdict split, top category/location)
- widened + shared search (name, category, location, notes, why-kept)
- duplicate detection layer A (same category + location + similar name, dismissible, persists)

## the keeper thread (priority)

these three are one feature, not three. they build a complete record: what it is, proof you own it, what it cost, whether you use it.

### 1. multi-photo per item (lead feature)

one item, many photos: the item, its receipt, its serial / model label, condition shots, angles.

what it unlocks for a keeper:
- receipts: proof of purchase. warranty, returns, insurance, higher resale.
- serial / model labels: the boring data you never write down, captured by photo.
- condition shots: the scratch, the wear, the box.
- angles: multiple views for anything that isn't flat.

design decisions:
- hero + extras, not flat gallery. hero is the bg-removed catalogue image already on `items` (shows in lists, leaderboard, search). extras live in a new table.
- only the hero gets u2net bg-removal. receipts and labels stay raw (a receipt with no background is useless). flag processing per image.
- each extra photo has a kind: `receipt` / `label` / `condition` / `angle` / `other`. cheap dropdown. makes photos findable and lets value / warranty features key off `receipt`.
- schema: new `item_images` table (`id, item_id, key, kind, sort, created_at`). keep hero on `items.image_url` / `image_url_nobg` to avoid a data migration. extras only in the new table.
- capture flow: on item detail / edit, "add photo" -> pick kind -> upload raw (no processing) -> appears in gallery. rapid-fire stays hero-only. extras are deliberate.

estimate: ~1 to 2 sessions. needs the item detail page (see polish E1) to have room for a gallery.

### 2. estimated value (reframed for a keeper)

not "toss the expensive thing". for a keeper: net worth of what you own, plus insurance.

- stat strip line: "your room: ~$4,200" not "$340 to let go".
- per-category breakdown: "electronics: $2,100". shows where the money sits.
- insurance: total value + receipt photos = you can actually file a claim.

build:
- claude guesses `value_low` / `value_high` at process time. owner confirms or edits (owner knows what they paid).
- better: if a `receipt` photo exists, claude reads the real price off it. real number, not a guess. this is why multi-photo and value are one feature, not two.
- `value_low`, `value_high` columns on items. aggregate in stats.ts.

estimate: ~half session on top of multi-photo.

### 3. last-touched / "still using it"

for a keeper this is "what do i actually use vs. just store", no judgment.

- neutral status: "used recently" vs "in storage", not a hit-list.
- board tab `dormant`: "haven't touched in 8 months" = candidate for the storage bin or deep closet, not the trash.
- pairs with containers (C1) later: dormant stuff -> "move to storage".

build: `last_touched_at` column, "i used this" button on item card + detail screen, sort. default = `created_at` until first touch.

estimate: ~half session.

### multiplier: OCR on receipts and labels (nearly free)

claude already sees every photo. ask it to pull visible text from receipts and labels -> store searchable.

- photograph a receipt -> claude reads store + price + date.
- search "best buy" or "$200" later and find the item.
- the real-price read for value (feature 2) is the same call.

build: one field in the classify prompt (`visible_text`), append to notes or a `text` column. already searchable via the widened search. ~half session. do this alongside multi-photo, it is the multiplier on it.

## the rest (parked, lower priority for a keeper)

### thesis engine (matters less for a keeper, but noted)
- decay nudges: ping when an item sits in limbo 30+ days. strong for a thrower, weak for a keeper who rarely flags `let go`. revisit only if the owner starts using verdicts heavily.
- claude auto-fills verdict + why-kept at process time: still cuts typing on the why-kept line, which a keeper does care about. worth doing for the why-kept guess alone, skip the verdict guess.
- weekly review ritual: retention feature. defer.

### organization at scale (matters past ~50 items)
- containers: `container_id` / `is_container` columns already exist, unused. "what's in the blue bin." strong for a keeper with storage.
- tags: `tags` / `item_tags` tables already exist, unused. cross-cutting labels: `gift`, `fragile`, `sentimental`. tags cut across the rigid category / location hierarchy.
- bulk actions: select many, batch set location / kind / tag. pairs with rapid-fire cleanup.
- rooms as hierarchy: home -> room -> spot. defer until cataloguing a whole home.

### capture quality
- voice note -> item: hold to record on phone, transcribe into notes. faster than thumb-typing the context a keeper wants to record.
- barcode / QR scan: auto-name packaged goods from a product db. niche.

### platform / reach (only if it goes past one user)
- deploy roomche.shalchian.dev: replace the cloudflared quick-tunnel (it died twice). catch: local claude processing can't be reached from a vercel deploy. either run a local worker the deployed app calls, or move processing to an api key + hosted rembg for the deployed path. do this soon regardless of multi-user.
- PWA + offline queue: installable, queue survives no-signal (basements, storage units). the indexeddb queue is already half of this.
- push notifications: web push or the wired telegram mcp. prerequisite if decay nudges or weekly review ever ship.
- shared rooms / public link: co-catalogue or read-only "here's my setup" share. big RLS rework. defer.

### polish that compounds
- item detail page `/app/item/[id]`: real route, not just the modal. prerequisite for multi-photo gallery, value history, touch log. lots of features want more room than a modal. build this first when starting the keeper thread.
- keyboard-driven catalogue: `/` search, `j/k` nav, `e` edit. desktop power-user speed. cheap.
- export (json / csv / pdf): pdf "home inventory report" (item, photo, value, location) for insurance. json for backup. high trust, cheap.
- onboarding: first-photo walkthrough. only matters with other users. defer.

## suggested build order for a keeper

1. item detail page `/app/item/[id]` (polish E1) - gives multi-photo somewhere to live.
2. multi-photo per item (keeper thread 1).
3. OCR on photos (multiplier) - same pipeline.
4. estimated value (keeper thread 2) - reads price off receipts captured in step 2.
5. last-touched (keeper thread 3).
6. containers + tags (organization) - once item count climbs.
7. deploy roomche.shalchian.dev (platform) - whenever the tunnel pain returns.
