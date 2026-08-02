# Capture and 3D

How photos get into roomche, and how they become 3D models.

## Three capture paths, on purpose

The split exists because a web page cannot reach the phone's real camera.

`getUserMedia` in Safari hands out a **video stream**: roughly 1080p to 4K, no ProRAW, no 48MP still, and no LiDAR access at all. That is fine for a catalogue thumbnail and useless for reconstruction.

| | take a photo | 3d, guided | 3d, full scan |
|---|---|---|---|
| Source | `getUserMedia` | `getUserMedia` | native Camera app |
| Resolution | video grade | video grade | full sensor |
| Frames | 1 | as many as the model asks for | 40 to 240 |
| Coaching | none | a vision pass directs each shot | presets and a set report |
| Feeds | catalogue entry | multi-view AI | photogrammetry or multi-view AI |
| Storage | Supabase | local disk, `.scans/` | local disk, `.scans/` |

Anything that needs measured geometry is shot in the **native Camera app**, as stills or as a video, and imported through the file picker, which preserves the originals.

## Take a photo: no coaching

Shoot, look at it, keep it or retake. One frame, straight into the process queue. Nothing here grades framing, because a catalogue thumbnail does not need it.

## 3d, guided: the model directs you

There is no fixed angle checklist. The first shot is unconditional: point at the object and take it.

Every shot is then graded twice.

**Instantly, on device** (`capture/shot-check.ts`), in milliseconds, no network: focus via variance of the Laplacian, exposure and clipped highlights from the luma histogram, and how much of the frame the object fills from a gradient-energy bounding box. A shot that fails here is called out before a single token is spent.

**Then by a vision pass** (`capture/direct-action.ts`) that sees **every shot in the set**, not just the newest one. It works out what the object is, which surfaces are already covered, and which one is still unseen, then says where to stand next as a physical instruction: "step round to the left until the handle points away from you", not "take the left view". It also estimates how many shots remain and when the set is complete.

Because it looks at the whole set, a flat book stops at two frames and a chair keeps going. The instruction is drawn over the live viewfinder, with the last kept shot as a thumbnail.

Shots go to `.scans/<uuid>/raw` and queue an `aimesh` job. The director gets a **1024px** copy of each frame, not the original: it is judging coverage, not detail.

## Retouching a photo by talking to it

Open an item, press **retouch with ai**, and say what you want in plain words. "the middle part, remove the bg". "crop in tight". "it is too dark".

Claude reads the **current** state of the photo, not the original, so edits stack the way a conversation does. It replies with a sentence and a list of operations, which `scripts/photo_edit.py` applies: whole or region background removal, erase, crop, trim to the opaque bounds, rotate, flip, exposure, white balance, sharpen, and flattening onto a solid colour. Coordinates are fractions of the image, so the model can point at what it sees.

Region cuts have two speeds. The default crops to the box and runs u2net on it, which finds the obvious object inside and takes a second. `precise` runs SAM against the exact boxes and points, which is right for one thing inside a cluttered group and takes about a minute on CPU. The model picks, and is told to say when it is choosing the slow one.

Every turn writes a numbered version into a temp session directory, so **undo** is a file away and the original is never touched until you press **use this photo**. That uploads the result and repoints `items.image_url_nobg`, leaving `image_url` alone.

`rembg` is imported lazily, because most turns are a crop or an exposure tweak and should not pay for loading an ONNX model. Those land in under a second; anything touching a cutout costs roughly thirty, which is the same CPU-bound cost the processing pipeline already pays.

## 3d, full scan: full resolution sets

Add item, 3d full scan.

### Ask first

Type the object into **what is it?** and press **how?**. You get the pose, photo count, numbered steps, pitfalls specific to that object, and whether a second scan is worth it. It also selects the matching preset.

This exists because the presets alone cannot tell you that a laptop should be scanned **closed**. Photogrammetry captures one configuration, so anything with a hinge or a lid has to be shot in a chosen pose, and a glossy black screen does not reconstruct whether or not it is powered off.

### Presets

| Preset | For | Photos | Flip |
|---|---|---|---|
| rigid, on the floor | mug, book, shoe, tool | 55 to 80 | yes |
| thin or fiddly, on the floor | back scratcher, cable, jewellery | 80 to 120 | yes |
| one side only, no flip | anything you cannot turn over | 40 to 60 | no |
| large, on the floor | chair, suitcase, lamp | 70 to 110 | no |
| garment laid flat | shirt, cardigan, jeans | 24 to 40 | front and back |
| garment on a hanger | best quality for clothes | 50 to 72 | no |

### Set grading, before anything uploads

Photo sets only. A video is graded after extraction instead.

- **Focus** per frame, measured against the set's own median rather than an absolute threshold, so a low-texture object is not flagged wholesale
- **Orbit gaps**, from a perceptual hash of every frame and the Hamming distance between consecutive shots. Far above the median means a jump, so a hole. Near zero means redundant frames. Flip presets allow exactly one large jump, which is the flip itself
- **Exposure drift** across the set, which catches the light changing mid-shoot
- **Resolution floor** at 8MP, which catches shooting through the web camera by mistake

### Video instead of stills

A sixty second orbit beats eighty shutter taps, and it beats them on coverage too: dense even angular sampling with no gaps, and one exposure lock across the whole take.

What video costs you is per-frame quality. Motion blur smears the corners SIFT needs, rolling shutter skews verticals into a systematic pose error, and inter-frame compression invents features that are not there. All three are mitigable:

```
4k, 60fps not 30, 1x lens, highest bitrate available
lock focus and exposure before recording
three slow orbits at three heights, about twenty seconds each
move your body, leave the object where it is
```

60fps halves the exposure per frame, so it halves the blur. A slow orbit cuts rolling shutter skew in proportion to angular velocity.

Resolution is the one thing not worth worrying about. A 4K frame is 8.3MP against a 48MP still, but the finished asset carries a 2048px baked texture, so the extra pixels were never reaching the output.

`scripts/extract_frames.py` samples at three times the target count, scores every candidate by variance of the Laplacian, and keeps the sharpest frame in each evenly spaced window. Frames below 40% of the kept median are dropped as blurry, and the count is reported.

Because video frames arrive in orbit order, the solver uses `sequential_matcher` rather than `exhaustive_matcher`: correct for ordered frames, and linear instead of quadratic in the frame count.

## Shooting rules

- Angular step of **12 to 15 degrees**. Count follows from that
- **1x main lens.** Not ultrawide, distortion wrecks the solve. Not 5x
- **Lock AE/AF.** Long press until it locks. Focus breathing between frames shifts the effective focal length
- **Move yourself, not the object.** Object and light stay fixed relative to each other
- **Hard floor, not a bed.** A mattress moves under your weight and shifts the object between frames
- **Textured surface underneath.** Spread newspaper or a patterned cloth. A plain floor gives the tracker nothing; a repeating pattern gives it false matches
- **Diffuse light, no flash.** A highlight that moves between frames bakes in as geometry noise

## What will not reconstruct

Photogrammetry needs texture and diffuse reflection to match features between frames. These fail regardless of photo count:

- shiny and specular, including chrome and glossy screens
- transparent and glass
- textureless, such as a plain white mug
- thin structures, such as a chain or a wire
- deformable things, which change shape when moved and therefore cannot be flipped and merged

For those, the multi-view AI route gives a plausible invented surface, which beats a hole-riddled measured one. The `surface` field returned by the shot critique is the intended router.

A flat-laid garment is the clearest case. It has no measurable volume, so photogrammetry returns an accurate pancake. Shoot a clean front and back and let the AI route build the shape.

## The queue

Sets land in `.scans/<uuid>` on the workstation, outside git. Supabase never holds them, because 100 photos per item would exhaust the free tier in a handful of objects.

Nothing is run by hand. Uploading creates a job, and the job runs a chain of stages:

| Source and route | Stages |
|---|---|
| video, measured | `extract` → `reconstruct` → `bake` |
| photos, measured | `reconstruct` → `bake` |
| video, fast | `extract` → `aimesh` |
| photos, fast | `aimesh` |

Jobs are JSON files under `.scans/_jobs`, and the runner (`lib/job-runner.ts`) is a singleton on `globalThis` so hot reload does not spawn a second one. One heavy stage runs at a time, because two COLMAP dense passes will not fit in 8GB of VRAM together; two light stages run alongside it. Each stage is a python process that prints `PROGRESS <0..1> <message>` lines, which is how the panel fills its bar. Stopping a running job kills the child; dismissing a finished one deletes the file.

## Reconstruction

```
python scripts/reconstruct.py .scans/<set-id> [--masks] [--sequential] [--max-dim 2000] [--reuse]
```

Stages: feature extraction, matching, mapping, undistortion, patch match stereo, fusion, Poisson meshing. Output is `dense/mesh.ply`.

**`--masks` is opt in and usually wrong.** Masking is correct only when the object was flipped mid-shoot and the background no longer agrees with it. On a single-side shoot the background is what COLMAP tracks camera position against, so cutting it out makes the result worse. The preset decides this.

Timing, measured on the RTX 4060 Laptop: 36 views at 1024px took about 12 minutes, of which dense stereo was 10. A 130-photo set at 2000px is roughly 13 times that work, so budget 2 to 3 hours. Drop `--max-dim` to 1500 if that is too slow, or if 8GB of VRAM runs out during dense stereo.

## From mesh to game asset

`mesh.ply` is a measurement, not something you can put in a room and pick up. It is millions of triangles, coloured per vertex, with no UVs, arbitrary scale, and an arbitrary origin. `scripts/bake_glb.py` closes that gap.

1. **Find the floor.** RANSAC over vertex triples for the plane with the most inliers, then drop that plane **and everything on the far side of it**. Poisson meshes the floor along with the object and closes it into a slab, so cutting only the plane would leave the underside behind. The cut band is 2% of the scene extent, which is thicker than the fit tolerance on purpose: the floor is a slab, not a plane. That does shave the object's contact area, which is the part that reconstructs worst anyway.

   Two guards. A candidate plane is only considered if at least 90% of the remaining geometry sits on **one** side of it, so a flat-lying book cannot have its own top face mistaken for the floor. And the whole step is skipped if the winning plane holds under 15% of points. There is deliberately no upper bound on how much it removes: on a real scan the floor **is** most of the mesh, and an earlier "keep at least 80%" guard silently disabled the step every time.

   `--keep-ground` for room scans, where the floor is the point.
2. **Keep every substantial part.** Anything under 8% of the largest connected component's face count is speckle and gets dropped; everything else survives. Keeping only the single largest part loses real geometry whenever a scan comes out in pieces, which is normal for anything joined by a thin bridge, a mug handle being the obvious case.
3. **Decimate** to 40k faces.
4. **Unwrap** with xatlas.
5. **Bake.** Each texel is rasterised to a 3D position by barycentric interpolation, then coloured from a distance-weighted average of the four nearest vertices of the pre-decimation mesh via a KD-tree. Sampling the dense original rather than the decimated copy is what puts high-poly colour detail into the texture. Averaging rather than taking the single nearest vertex matters: nearest-neighbour paints hard Voronoi cells, which show up as stair-stepped edges anywhere the colour changes fast, so every label and logo would come out jagged. Unfilled texels are filled from their nearest neighbour by distance transform, so seams do not bleed background.

   Normals are taken from the mesh **before** unwrapping and re-indexed through xatlas's vertex mapping. Computing them afterwards splits them at every UV seam, which reads as faceting.
6. **Normalise.** Centred on X and Z, minimum Y at zero so it sits on the floor, longest edge scaled to 1. Real dimensions get applied at placement time.

Output is a GLB with normals and a 2048px base colour texture, served by `/api/scan/<set-id>/model` and viewed at `/app/room/3d?set=<set-id>`.

## The fast route

`scripts/ai_mesh.py` picks the four most different frames by Hamming distance over a difference hash, cuts the background out of each, and hands them to a multi-view model. Minutes rather than hours, clean low-poly output, and the surfaces it never saw are invented rather than left as holes.

The model itself is a hook: set `ROOMCHE_AI_MESH` to a command taking `{views}` and `{out}`, for example `python C:/models/hunyuan3d/run.py --views {views} --out {out}`. Without it the stage still prepares the cutouts, then fails with the path they are sitting in.

## Setup

**Background removal.** `scripts/bg-remove.py` needs `rembg`, `numpy`, `scipy`, `onnxruntime` on the Python that `process-action.ts` shells out to. It currently runs on CPU, roughly 1 to 2 seconds per image, because the CUDA runtime DLLs are missing. Output is capped at 1600px, which keeps the server action payload near 1.8MB instead of 15MB.

**COLMAP** 4.1.1 CUDA build lives in `C:\Users\ryand\tools\bin`. `reconstruct.py` resolves it from `COLMAP_BIN`, then PATH, then that folder, because a shell started before the PATH entry was added will not see it. Note that 4.1 renamed `SiftExtraction.*` to `FeatureExtraction.*`; check `colmap <command> --help` against the installed binary rather than trusting older documentation.

**Mesh tooling.** `bake_glb.py` needs `trimesh`, `xatlas`, `fast-simplification`, `numpy`, `scipy` and `pillow`. `extract_frames.py` needs `ffmpeg` and `ffprobe` on PATH.

**Phone access** is `tailscale serve --bg 3000`, reaching the dev server at `https://arash-1.taila27654.ts.net` with a real certificate. HTTPS is not optional: a bare LAN IP over HTTP is not a secure context, so mobile browsers block the camera outright. The phone needs the Tailscale app on the same tailnet. Turn it off with `tailscale serve --https=443 off`.

## Failure modes worth knowing

Every one of these fails **silently**, which is why they cost time.

**Supabase auth redirect.** If the app's `redirectTo` is not in the project's `uri_allow_list`, Supabase discards it with no error and falls back to `site_url`, so OAuth completes and dumps you on localhost. Both lists are exact hostnames on purpose; a wildcard entry lets anyone who can get a subdomain there receive an OAuth code for this project.

**Next dev origins.** A `*.ts.net` wildcard does not match `arash-1.taila27654.ts.net`, because the wildcard covers a single label and that host is two deep. When it misses, Next blocks the dev resources, React never hydrates, and every animated element stays frozen at its server-rendered `opacity: 0`. The page looks blank apart from non-animated chrome. Config changes need a dev server restart; hot reload will not pick them up.

**Server action body limit.** Defaults to 1MB. A phone photo as a base64 data URL is several times that, and a full-resolution cutout PNG is far more. Raised to 32mb, and payloads are downscaled at both ends.

**Proxy body buffering.** `proxyClientMaxBodySize` **truncates** past its limit rather than erroring, which would corrupt uploads. `/api/scan` is excluded from the proxy matcher so large photos are never buffered.

**Queue completion.** Successful jobs are deleted from the queue, so a `done` counter stays at zero forever. The navbar indicator now tracks the active count and refreshes when it reaches zero. Press it for a per-job panel with status, errors, dismiss and retry.

**Python stderr on Windows** arrives as UTF-16 with ANSI escapes, which rendered as unreadable noise in the UI. It is now reduced to the last meaningful line.
