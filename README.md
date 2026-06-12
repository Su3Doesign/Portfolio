# MERIDIAN — a portfolio that runs on solar time

**Amidyala Sai Sumanth · 3D Environment Artist**

The entire site is one day, traversed by scroll. A procedural Three.js sky (sun, terrain, stars — zero asset files) lives behind everything; the sun rises and sets as the visitor scrolls. A solar clock in the HUD tracks the hour. Your three hero projects sit at their true hours: Rōman no Yoake at dawn (05:42), Fudō Myō-ō at dusk (17:48), Koi Pond at night (21:12). Golden hour (16:00) belongs to the philosophy section — "light that has somewhere to be by 4 PM." The day rolls over to 00:00 at the contact closer.

## Run it

No build step. Open `index.html` in a browser, or drag the folder onto GitHub Pages. CDN dependencies: Three.js r147, GSAP 3.12 + ScrollTrigger, Lenis 1.1.

## The day map

| Hour  | Section            | Sky |
|-------|--------------------|-----|
| 23:58 | Hero               | starfield night |
| 04:47 | Manifesto (pinned horizontal) | blue hour |
| 05:42 | Rōman no Yoake     | dawn |
| 09:30 | Process / pipeline | morning daylight (site goes light-ink) |
| 13:00 | Client rails       | midday |
| 16:00 | Philosophy — LIGHT.| golden hour |
| 17:48 | Fudō Myō-ō         | dusk |
| 21:12 | Koi Pond           | night, teal |
| 22:30 | Archive bento      | deep night |
| 23:00 | Services           | deep night |
| 23:40 | Artist statement   | midnight |
| 23:59 | Closer → 00:00     | midnight rollover |

## Dropping in your renders

Every image/video slot points at the **same paths your previous build used**. Create an `assets/` folder next to `index.html` and drop files in — they appear automatically. Any missing file shows a designed "AWAITING RENDER" blueprint frame with its expected filename printed on it, so the site looks intentional even half-filled.

- Case studies: `assets/images/japa-render-*.webp`, `fudomyo-render-*.webp`, `koipond-render-*.webp`, videos in `assets/videos/`
- Archive: `op-perfume-1.webp`, `conceptdesign-1..3.webp`, `car-render-1..2.webp`, `cylinder-1..2.webp`
- Client rails: filenames are listed in `app.js` → `BRANDS` (one entry per brand — edit names, colors, roles, file lists there)
- CV: `assets/docs/cv.pdf`

## Tuning the day

- Sky colors / sun height per section: `scene.js` → the `P` palette table (`[skyTop, horizon, ground, sunColor, sunElevation, starAlpha, ambient]`).
- Which section gets which sky: `scene.js` → `SECTION_PHASE`.
- Section hours: `data-hour` attributes in `index.html`. The HUD clock interpolates between them automatically.
- Light/dark ink per section: `data-theme="night | day | gold"` in `index.html`.

## What to consider rendering later (placeholder → real)

1. Your renders for the three case studies (the biggest visual win).
2. An OG share image (`1200×630`) from the Rōman hero render.
3. Optional: a short looping hero video is NOT needed — the procedural sky is the hero.

## Accessibility / fallbacks

`prefers-reduced-motion` disables smooth scroll, pins, and split-text animation. If WebGL or a CDN fails, content remains fully readable on the dark base. Mobile gets the same scene at capped pixel ratio; rails become native swipe.
