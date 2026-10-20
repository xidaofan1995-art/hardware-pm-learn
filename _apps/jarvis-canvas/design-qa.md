# Project collection and image deck QA — 2026-10-20

final result: passed

## Source and scope

- Visual truth: `/workspace/scratch/a3b84031475f/upload/02-1000053096.jpg` (Hark chat stack), `/workspace/scratch/a3b84031475f/upload/01-1000053097.jpg` (Hark expanded card), each 691 × 1536 pixels.
- Implemented surface: native responsive Jarvis Canvas PWA, project collection preview and focused reader. This is an adaptation to a project dashboard, not a claim of pixel-identical chat UI or a verified Hark animation clone.
- Main browser CSS viewport: app 393 × 852, screenshot clip x485/y42/width393/height852. Captures are 393 × 852 pixels at scale 1. Native device status/navigation chrome is not reproduced.
- Source normalized to width393 (~874px high) for the comparison. The extra source height includes Android system chrome. Content placement and poster wording differ intentionally; no pixel-offset claims are based on this difference.
- Browser evidence: `../pwa-deck-04-home-refined.jpg`, `../pwa-deck-06-gallery-final.jpg`, `../pwa-deck-07-report-final.jpg`.
- Combined source/implementation input inspected: `../hark-project-deck-comparison.jpg`. Focused preview/read typography input inspected: `../pwa-deck-focus.jpg`.

## Findings and comparison history

- [P2, resolved] Initial preview was too tall: first-screen primary action fell behind the search dock. Preview clip reduced from322 to255px and heading rhythm tightened. In final393px capture the action is44px high, ending at app y754; the dock starts at app y787. The action is fully visible. A320px browser iframe also measured no horizontal overflow (clientWidth=scrollWidth=320), primary bottom774.7 and dock top787.
- [P2, resolved] Closing after changing documents could try to focus the removed preview button. The reader now focuses a connected opener or current cover button; browser check returned focus to “展开阅读显示方案 · 对照表”. Directory selection also returns focus to its current cover.
- [P2, resolved] Zoom ancestor restricted horizontal touch panning. The zoomed paper allows both axes and does not interpret zoom panning as page flips. Browser checked fit/2x zoom dimensions. Actual phone touch gestures remain a device test.
- [P2, resolved] Generic detail previously remounted the dashboard and reset its scroll. Dashboard now remains mounted behind detail. Browser measured361px while hidden and361px after returning. The locator's pre-click scroll adjustment is not counted as an application reset.
- No actionable P0/P1/P2 visual or functional issue remains within the checked scope.

## Required fidelity surfaces

- Typography: existing CanvasUI/system CJK family retained. Preview20px headings and13px body, upright reader24px heading/14px body. Reader text is selectable; source text is a raster poster, so exact typeface matching is not asserted. Larger readable reader text is an intentional adaptation.
- Spacing/layout: pale28px outer panel, fanned20px inner papers, short preview,44px controls, separate file/page navigation. Reader occupies the actual app region and preserves the mounted dashboard.320px and393px layout checks passed.
- Colors/tokens: existing blue backdrop, translucent pale panel, warmer white paper and white inset sections retained. Dark primary pill identifies the main action. Fading is limited to non-interactive preview content; actions remain outside it.
- Image quality/assets: existing generated blue background and supplied product crops are used. Images use contain in reading mode and scrollable2x zoom. Screenshot crops remain low-resolution references and say so; no claim of source-product verification or original-image quality. No imagegen replacement or invented product asset was introduced.
- Copy/content: four files and six preview pages are explicitly demonstration content. File index and preview-page index remain distinct. No demo Drive IDs/links, false archive status, chat execution or share function are shown. Real source entries retain their Drive link.

## Browser interactions checked

- Collection directory, ordered member selection, previous/next documents, keyboard right-arrow document switch.
- Report internal page1→2, moving to another file, close/reopen preserving selected file/page; appropriate disabled edges.
- Image fit/zoom/fit and gallery internal page navigation; alt/caption visible in accessibility tree.
- Reader close and focus return, generic artifact detail return with retained dashboard scroll.
- Real JPEG file selection and confirmation-preview recognition. Test selection was cancelled before saving; parser image/export restore behavior is covered by the focused contract checks.
-320px reader width320 and footer within viewport;393px final preview/reader captured and inspected.
- Console checked for app-origin warning/errors: none returned. Cloud browser extension metadata errors were excluded as unrelated.

## Build and boundaries

- `npm run build` passed (index validation, TypeScript, Vite production build).
- `node scripts/test-deck-content.mjs` passed25 focused checks, covering references, project/demo integrity, preview path restrictions, table width, legacy entries, image import/mime spoof, PDF rejection and image-backup restore.
- React review: hooks occur before early return; transient pointer/scroll data uses refs; fetch is one index request; image pages lazy-load; previews are bounded; prior local storage keys remain isolated. No unnecessary dependencies added.
- Raw PDF binary parsing is not implemented: PDF is represented by a JSON preview bundle plus its original reference. Each local image≤1MiB; text≤1MiB; JSON bundle≤8MiB.
- Real phone PWA installation, HTTPS offline/cache upgrade, touch momentum/pinch, and authenticated private Drive previews have not been verified. This change does not upload local imports or change Drive permissions.
- Follow-up P3: higher-resolution original product images when supplied; real-device motion calibration. Hark motion cannot be inferred precisely from static screenshots.

## Implementation checklist

- [x] Safe preview and collection schemas plus reference validation
- [x] Mixed document/image deck with upright reader
- [x] File/page identity and return context
- [x] Readable mobile density and44px primary controls
- [x] Build, contract checks and cloud-browser verification
- [ ] Publish and verify installation/offline on real phones (outside this unmerged draft)
