# Design QA · Jarvis Canvas PWA

final result: passed

## Scope and evidence

This is an independent multi-AI output hub inspired by the supplied Hark screenshots, not a pixel-identical copy of Hark content or branding. The user explicitly changed the target to a native-browser PWA with GitHub code/index and Google Drive originals.

- Source visual truth: /workspace/scratch/a3b84031475f/upload/02-1000053070.jpg (691 × 1536 pixels); product asset source: upload/01-1000053069.jpg.
- Browser-rendered implementation: /workspace/scratch/a3b84031475f/jarvis-canvas-pwa-home.jpg, 393 × 852 pixels, same CSS size, no simulated device chrome.
- Combined comparison input: /workspace/scratch/a3b84031475f/jarvis-canvas-qa-comparison.jpg. Source app-owned region cropped at y=100..1495 and scaled proportionally to 393px width; no source stretch. The shorter reference region is padded for the comparison.
- State: home, latest repository index, one real Drive-backed artifact plus clearly labelled examples; no test imports.
- Full-view comparison inspected together; card/nav typography, panel padding/radii, metric tiles and source labels were also inspected at readable size in the same input.

## Required fidelity surfaces

- Typography: sans-serif CJK system stack, 16px card headings, 21px summary, 31px numeric metrics. Hark's hierarchy is retained; labels and copy changed for the new product. Long first real-card heading was shortened to avoid a one-character wrap.
- Spacing/layout: 21px side margins, 28px panel radii, 13px vertical card gaps; fixed navigation and search leave scrollable content reachable. Earlier prototype content painted below the navigation; corrected by explicit top scroll inset and rechecked. Native PWA has no status bar/bezel drawn in app markup, as requested.
- Colors/tokens: blue atmospheric raster background, translucent pale blue panels, white inset metric/list tiles, black selected segment. Source color/opacity language preserved; generated background replaces blurred screenshot.
- Image quality: product thumbnails are supplied-source crops; background and PWA icon are generated raster assets. Standard UI icons use Radix Icons. No handmade SVG/emoji substitutes for assets.
- Copy/content: home states actual GitHub/Drive roles; demo data is explicit. Source selection does not claim AI account connection. Local imports and Drive-backed originals are separately labelled.

## Browser verification

Verified in the production bundle through the cloud browser:

- Navigation, project/source filtering, keyword search and bookmark filtering.
- JSON example import, preview/confirm and reload persistence (tested in the prototype and native PWA flow; native PWA storage keys are isolated from the prototype and old garden).
- A real local HTML file was selected through the file chooser, parsed, confirmed and opened in an isolated iframe. Expected heading rendered; injected test script did not replace the body.
- Real Drive-backed card points to the exact file returned and read back from Drive.
- Updating the source entry and rebuilding index, then pressing check updates changed title/summary/metrics without rebuilding UI code.
- Browser console inspected: no app-origin runtime errors; unrelated browser-extension metadata errors are excluded.
- TypeScript + Vite production build and content validation passed; Service Worker syntax checked.

## Remaining validation limits

HTTPS deployment, installation on an actual Android/iOS device, and real offline/Service Worker update behavior are not yet verified. These are release checks, not a claim made by the visual result. Drive originals retain their access controls and are not cached by the app Service Worker.

## Follow-up polish

P3: tune muted caption contrast on actual mobile screens. No actionable P0/P1/P2 visual or primary-interaction findings remain in the inspected state.
