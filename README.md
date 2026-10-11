# Yamica Studio

A browser-based fashion design studio that takes you from first inspiration to a finished collection: concept, moodboard, colour palette, fabrics and prints, garment flats, a collection line-up, and an exported PDF presentation.

No account, no server, no paid APIs and no AI. **Everything is stored in this browser (IndexedDB) on this device.** Use *Backup & restore* to download a `.yamica` file and move or keep your work.

## Run it

Requires Node 20+.

```bash
npm install
npm run dev          # http://localhost:3000
```

Production:

```bash
npm run build
npm start            # or: STATIC_EXPORT=1 npm run build  → static files in out/
```

Checks:

```bash
npm run lint                       # TypeScript
npm run e2e -- http://localhost:3000 e2e-output   # 14 acceptance checks (needs Playwright + Chromium)
```

`npm run assets` regenerates the 33 inspiration images (original procedural artwork) in `public/library/inspiration/`.

## Try the sample workflow

1. Open `/` and choose **Explore a sample collection**, or go to **My Studio** (`/studio`). The *Soft City* sample is installed on first visit (restore it from the dashboard if you delete it).
2. Walk the stage bar: **Concept → Moodboard → Colours → Fabrics & Prints → Garments → Collection → Presentation**. *Guided* mode explains each step; *Free studio* is compact. Both edit the same data.
3. **Moodboard:** drag library images onto the board, upload your own (Saved tab), move/resize/rotate/crop, add text, swatches and shapes, try the four layouts, undo/redo, export PNG.
4. **Colours:** pull colours from a moodboard image, edit HEX/RGB/name/role, reorder, keep alternate palettes. Changing a colour used by garments asks whether to update all linked panels or only the palette.
5. **Garments:** open *Relaxed shirt*, swap the collar, click a panel, apply a palette colour or a print, adjust scale/rotation/offset, save a variation or colourway, compare, export PNG/SVG.
6. **Collection:** drag (or use the arrow buttons / keyboard) to reorder the line-up, set statuses, build looks, compare pieces, read the summary and observations.
7. **Presentation:** pick Minimal portfolio, Editorial or Student, toggle sections, preview every page, **Export PDF**.

## Project layout

- `src/app` — routes: landing `/`, `/studio` dashboard, `/studio/collection?id=&stage=` workspace, library pages (`inspiration`, `materials`, `garments`, `saved`).
- `src/lib/model` — types, versioned schema + migrations, factories, Soft City sample, stage progress rules.
- `src/lib/garments` — SVG template system (6 templates, compatibility rules, mirrored panels).
- `src/lib/prints`, `src/lib/fabrics`, `src/lib/inspiration` — built-in libraries with licence metadata.
- `src/lib/store` — zustand store, undo history, debounced IndexedDB autosave, uploads.
- `src/lib/export` — SVG → PNG/SVG export, backup bundle; `src/components/presentation/Pages.tsx` draws the PDF pages.
- `src/lib/i18n/en.ts` — UI copy; layout uses logical (start/end) properties for future RTL/Hebrew.

## Limitations

- Storage is per browser and device; clearing site data deletes projects unless you have a backup.
- Garments are fashion flats for design intent, not sewing patterns; no fit, drape or fabric simulation. Back views exist for shirt, T-shirt, skirt and trousers; dress and jacket are front only.
- Colours are on-screen references, not verified Pantone matches. Fabric notes are general references.
- Uploaded image prints can't be recoloured (vector prints can). Prints use one repeat per panel.
- Detailed moodboard editing is designed for larger screens; on phones you can browse, review and make basic edits.
- The PDF is made of page images (crisp at A4, text not selectable).
- English copy only; RTL is prepared but not translated.
