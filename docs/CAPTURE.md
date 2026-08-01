# Capture and 3D

How photos get into roomche, and how they become 3D models.

## Two capture paths, on purpose

There are two ways in, and they exist because a web page cannot reach the phone's real camera.

`getUserMedia` in Safari hands out a **video stream**: roughly 1080p to 4K, no ProRAW, no 48MP still, and no LiDAR access at all. That is fine for a catalogue thumbnail and useless for reconstruction.

| | In-app camera | Scan import |
|---|---|---|
| Source | `getUserMedia` video frames | native Camera app, bulk selected |
| Resolution | video grade | full sensor |
| Photos | 4 to 6 labelled angles | 40 to 120 |
| Feeds | catalogue entry, multi-view AI | photogrammetry |
| Storage | Supabase | local disk, `.scans/` |

Anything destined for a 3D model is shot in the **native Camera app** and imported through the file picker, which preserves the originals.

## In-app camera: the shot coach

Every shot is graded twice.

**Instantly, on device** (`capture/shot-check.ts`), in milliseconds, no network:

- focus, via variance of the Laplacian
- exposure and clipped highlights, from the luma histogram
- how much of the frame the object fills, from a gradient-energy bounding box

**Then by a vision pass** (`capture/critique-action.ts`), in the background while you keep shooting. It names which side the photo actually shows, and flags cropping, occlusion, background clutter, and surface type. Aim for the left and shoot the back, and it says so.

Coverage chips fill in as front, back, left and right are covered, with a live readiness percentage. A shot only counts if it is usable, so a blurry back view leaves "back" unfilled.

The critique gets a **1024px** copy, not the original. It is judging framing, not detail, and full-resolution data URLs blow the server action body limit.

## Scan import: full resolution sets

Add item, scan for 3d.

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

- **Focus** per frame, measured against the set's own median rather than an absolute threshold, so a low-texture object is not flagged wholesale
- **Orbit gaps**, from a perceptual hash of every frame and the Hamming distance between consecutive shots. Far above the median means a jump, so a hole. Near zero means redundant frames. Flip presets allow exactly one large jump, which is the flip itself
- **Exposure drift** across the set, which catches the light changing mid-shoot
- **Resolution floor** at 8MP, which catches shooting through the web camera by mistake

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

## Reconstruction

Sets land in `.scans/<uuid>/raw` on the workstation, outside git. Supabase never holds them, because 100 photos per item would exhaust the free tier in a handful of objects.

```
python scripts/reconstruct.py .scans/<set-id> [--masks] [--max-dim 2000] [--reuse]
```

Stages: feature extraction, exhaustive matching, mapping, undistortion, patch match stereo, fusion, Poisson meshing. Output is `dense/mesh.ply`.

**`--masks` is opt in and usually wrong.** Masking is correct only when the object was flipped mid-shoot and the background no longer agrees with it. On a single-side shoot the background is what COLMAP tracks camera position against, so cutting it out makes the result worse. The scan panel prints the correct command for the preset you chose.

Timing, measured on the RTX 4060 Laptop: 36 views at 1024px took about 12 minutes, of which dense stereo was 10. A 130-photo set at 2000px is roughly 13 times that work, so budget 2 to 3 hours. Drop `--max-dim` to 1500 if that is too slow, or if 8GB of VRAM runs out during dense stereo.

## Setup

**Background removal.** `scripts/bg-remove.py` needs `rembg`, `numpy`, `scipy`, `onnxruntime` on the Python that `process-action.ts` shells out to. It currently runs on CPU, roughly 1 to 2 seconds per image, because the CUDA runtime DLLs are missing. Output is capped at 1600px, which keeps the server action payload near 1.8MB instead of 15MB.

**COLMAP** 4.1.1 CUDA build lives in `C:\Users\ryand\tools\bin` and is on the user PATH. Note that 4.1 renamed `SiftExtraction.*` to `FeatureExtraction.*`; check `colmap <command> --help` against the installed binary rather than trusting older documentation.

**Phone access** is `tailscale serve --bg 3000`, reaching the dev server at `https://arash-1.taila27654.ts.net` with a real certificate. HTTPS is not optional: a bare LAN IP over HTTP is not a secure context, so mobile browsers block the camera outright. The phone needs the Tailscale app on the same tailnet. Turn it off with `tailscale serve --https=443 off`.

## Failure modes worth knowing

Every one of these fails **silently**, which is why they cost time.

**Supabase auth redirect.** If the app's `redirectTo` is not in the project's `uri_allow_list`, Supabase discards it with no error and falls back to `site_url`, so OAuth completes and dumps you on localhost. Both lists are exact hostnames on purpose; a wildcard entry lets anyone who can get a subdomain there receive an OAuth code for this project.

**Next dev origins.** A `*.ts.net` wildcard does not match `arash-1.taila27654.ts.net`, because the wildcard covers a single label and that host is two deep. When it misses, Next blocks the dev resources, React never hydrates, and every animated element stays frozen at its server-rendered `opacity: 0`. The page looks blank apart from non-animated chrome. Config changes need a dev server restart; hot reload will not pick them up.

**Server action body limit.** Defaults to 1MB. A phone photo as a base64 data URL is several times that, and a full-resolution cutout PNG is far more. Raised to 32mb, and payloads are downscaled at both ends.

**Proxy body buffering.** `proxyClientMaxBodySize` **truncates** past its limit rather than erroring, which would corrupt uploads. `/api/scan` is excluded from the proxy matcher so large photos are never buffered.

**Queue completion.** Successful jobs are deleted from the queue, so a `done` counter stays at zero forever. The navbar indicator now tracks the active count and refreshes when it reaches zero. Press it for a per-job panel with status, errors, dismiss and retry.

**Python stderr on Windows** arrives as UTF-16 with ANSI escapes, which rendered as unreadable noise in the UI. It is now reduced to the last meaningful line.
