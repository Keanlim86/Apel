# Apel — Receipt Scanner

Browser-based OCR tools that turn a photo/scan/PDF of a (mostly Singapore) retail
receipt into structured data — merchant, date, line items, subtotal, GST, and
total — and let you export that data to CSV/Excel. Everything runs client-side
in the browser; there is no backend/server component. All processing (OCR,
image cleanup, parsing) happens locally using JavaScript libraries loaded from
CDNs.

## Repository layout

```
Apel/
├── index.html                          # Placeholder / entry stub (currently empty)
├── Receipt Scanner/                    # Main, actively developed scanner tools
│   ├── Receipt-scanner.html            # Single-receipt scanner (primary app)
│   ├── Receipt-scanner-multi.html      # Multi-receipt scanner (draw-box splitting)
│   ├── cleanOCR.js                     # Shared OCR text cleanup / merchant-name fixups / fuzzy-match helpers
│   ├── parseReceipt.js                 # Shared receipt parser (merchant/date/$ extraction)
│   ├── sgMerchants.js                  # Flat JS array of ~250 SG merchant names — used at runtime for fuzzy matching
│   ├── SgMerchants.json                # Human-curated reference list (not loaded at runtime, see below)
│   ├── readme                          # (empty)
│   └── Receipts/                       # Sample/working receipt files
└── Multi-Receipt Scanner/
    └── Scripts/
        └── scan.js                     # (empty placeholder — not yet implemented)
```

There are two self-contained HTML apps — just open either file directly in a
browser, no build step or install required.

---

## `Receipt-scanner.html` — Single Receipt Scanner

The main app. Upload one receipt (image or PDF), it OCRs the whole page and
parses it into merchant/date/items/total, then lets you export or copy the
result.

**Libraries used (loaded from CDN):**
- [Tesseract.js v4](https://github.com/naptha/tesseract.js) — in-browser OCR engine
- [pdf.js](https://mozilla.github.io/pdf.js/) — renders PDF pages to a canvas
- [SheetJS (xlsx)](https://sheetjs.com/) — Excel (.xlsx) export

**Flow:**
1. **Upload** — drag/drop or pick a file (`accept="image/*,application/pdf"`).
   - Image files are previewed directly.
   - PDF files: `handlePDF()` renders page 1 via pdf.js at 3× scale onto a
     canvas, then immediately runs it through `autoCropAndEnhance()`.
2. **Pre-process** (`prepareProcessingCanvas`, `autoCropAndEnhance`,
   `preprocessCanvas`) before OCR:
   - `autoCropAndEnhance()` scans pixel luminance to find the bounding box of
     non-white content, crops to it with padding, upscales small images to a
     target width (so OCR has enough resolution), and applies grayscale +
     contrast boost.
   - `preprocessCanvas()` further sharpens/binarizes the image to improve OCR
     accuracy on low-resolution receipts.
3. **OCR** (`scanReceipt()`) — runs Tesseract.js against the processed canvas,
   reporting live progress (`progress-bar` UI) as text.
4. **Clean OCR text** (`cleanOCRText()` in [cleanOCR.js](Receipt%20Scanner/cleanOCR.js)) — shared by both apps:
   - Strips non-ASCII characters and common OCR artifact glyphs (`Â©`, `Â®`, etc.) and confusing symbols (`| ~ \` ^`).
   - Corrects dozens of known OCR misreads for Singapore merchant names via
     **exact hardcoded regexes** (not fuzzy matching — see
     [How OCR error correction actually works](#how-ocr-error-correction-actually-works)):
     `TSETAN`/`1SETAN` → `ISETAN`, `Fa1rpr1ce` → `FAIRPRICE`,
     `C0LD ST0RAGE` → `COLD STORAGE`, `G1ANT` → `GIANT`,
     `SHENG S10NG` → `SHENG SIONG`, `D0N D0N D0NKI` → `DON DON DONKI`,
     `WATS0NS` → `WATSONS`, `UN1QLO` → `UNIQLO`, `DA1SO` → `DAISO`, etc.
     Only misreads already covered by one of these rules get fixed.
   - Re-inserts line breaks before price-like tokens (`12.34`), quantity
     markers (`2x`, `1kg`, `3pcs`), header words (`Item`, `Qty`, `Description`),
     and after closing parentheses — because OCR often merges receipt lines
     into one run-on string. The header-word rule is **word-bounded**
     (`\bItem\b`, not just `Item`) specifically so it doesn't also match
     "Item" as a mere substring of another word — it used to match inside
     "**item**s" too, which silently split lines like "Total 1 items 2.70"
     into "Total 1" (no price) and "items 2.70" (no recognizable label),
     dropping the receipt's total entirely since neither half matched
     anything downstream.
   - Normalizes repeated whitespace.
5. **Parse** (`parseReceipt()`, defined inline in this file — a superset of
   [parseReceipt.js](Receipt%20Scanner/parseReceipt.js)):
   - **Merchant**: scans the first ~5 lines for a line that is mostly letters
     (heuristic: letter count > 3 and more than 2× the digit count).
   - **Merchant normalization** (`normalizeMerchant()`): a two-tier extra
     pass. First it fixes known merchant OCR variants exactly (e.g. any of
     `ISETAN/TSETAN/1SETAN/IBETAN` → `ISETAN` or `ISETAN SINGAPORE` if
     "SINGAPORE" appears in the text). If that didn't change anything, it
     falls back to `fuzzyMatchMerchant()` (in `cleanOCR.js`) against the
     ~250-name list in [sgMerchants.js](Receipt%20Scanner/sgMerchants.js),
     catching misreads no regex was written for — see
     [How OCR error correction actually works](#how-ocr-error-correction-actually-works).
   - **Date**: tries several regexes (`DD/MM/YYYY`, `YYYY-MM-DD`, month-name
     formats, `Date: ...`), then falls back to digit-only patterns
     (`DDMMYY[YY]`, and an OCR quirk where `/` is misread as `7`), and finally
     standardizes everything to `DD/MM/YYYY`.
   - **Items**: detects item lines with prices, separating quantity-marker
     items (`usesQtyPattern`/`parseQtyMarkerItems`) from plain description +
     price lines; cleans item names (`cleanItemName`) to strip stray codes.
   - **Subtotal / GST / Total**: scans every line for a trailing price and
     classifies it via keyword matching (`subtotal`, `total`, `GST`/`G5T`/`65T`
     tax patterns) plus genuine **fuzzy matching** (Levenshtein distance ≤ 2
     against the word "subtotal") so unanticipated OCR typos are still
     recognized — see [How OCR error correction actually works](#how-ocr-error-correction-actually-works)
     for how this differs from the merchant-name corrections above. Handles
     "spaced" OCR prices like `6. 30` as well as standard `6.30`. Lines
     matching a **discount pattern** (`/\bdiscount(s)?\b/i` — e.g. "Total
     Discount -3.30") are explicitly excluded from ever being picked up as
     the total: `totalPattern` is just `/\btotal\b/i`, so without this
     exclusion a discount line would be just as eligible as the real total
     line, and since the loop simply overwrites on every match, whichever
     one happened to come *last in the OCR'd text* — not necessarily last in
     the receipt's printed order — would silently win.
   - **Reconciliation**: if the detected total is less than the sum of item
     prices, falls back to subtotal (or the item sum) and logs why; if the
     total exceeds the item sum, it's flagged in the debug log rather than
     silently accepted. (This only catches a total that's too *low* — a
     discount line being misread as the total, which is *higher* than the
     real total, is instead prevented upstream by the discount-pattern
     exclusion above rather than being caught here.)
   - **Reconciliation**: if the detected total is less than the sum of item
     prices, falls back to subtotal (or the item sum) and logs why; if the
     total exceeds the item sum, it's flagged in the debug log rather than
     silently accepted.
6. **Display** (`displayResults()`) — renders merchant, date, an **OCR
   Confidence** card (Tesseract's page-level mean confidence, 0-100%, color-coded
   green ≥80% / amber 50-79% / red <50% — see
   [OCR confidence score](#ocr-confidence-score)), an items table (with
   optional Subtotal/GST rows), and the final reconciled TOTAL.
7. **Export / Copy** — buttons for:
   - **Export Summary Excel / CSV** — one row: Date, Merchant, Total. (No
     Confidence column — it's shown on-screen and in Copy Table only, kept
     out of the CSV/Excel files themselves.)
   - **Export Full Excel / CSV** — one row per item (Merchant, Date, Item,
     Price) plus a TOTAL row. (Confidence excluded here too, same reason.)
   - **Copy Table** — copies a tab-separated summary, including the
     confidence score, to the clipboard.
8. **Debug panel** — an optional on-page console (`setDebug`/`appendDebug`)
   showing OCR progress, parsing decisions, and reconciliation notes for
   troubleshooting misreads.

---

## `Receipt-scanner-multi.html` — Multi-Receipt Scanner (manual box split)

For a single photo/PDF page that contains **multiple receipts** (e.g. a scan
of several receipts laid side by side). Instead of auto-detecting individual
receipts, the user manually draws a box around each one; each box is then
cropped and OCR'd/parsed independently.

**Libraries used:** Tesseract.js v4, pdf.js, SheetJS (xlsx) — same as above.
Also loads the shared [sgMerchants.js](Receipt%20Scanner/sgMerchants.js),
[parseReceipt.js](Receipt%20Scanner/parseReceipt.js), and
[cleanOCR.js](Receipt%20Scanner/cleanOCR.js) instead of inlining the logic.

**Flow:**
1. **Upload** an image or multi-page PDF. `renderFileToCanvas()` renders each
   PDF page to its own canvas (`pageCanvases`), with Prev/Next page controls
   (`changePage`, `updatePageControls`) when there's more than one page.
2. **Draw Boxes** — `enableDrawMode()` / `setupOverlayDrawing()` let the user
   click-drag rectangles directly over the rendered page on an overlay canvas
   (`drawOverlayBoxes`); each rectangle is tracked as a `detections` entry per
   page. Boxes can be cleared (`clearDetections`) and thumbnails of each
   selected region are shown live (`updateDetectionsPreview`).
3. **OCR Selected** (`ocrSelectedBoxes()`) — while a batch is running, the
   **OCR Selected / Clear Boxes / Draw Boxes** buttons all disable themselves
   (re-enabling in a `finally` block once the batch ends or errors out), so a
   double-click or a mid-run "Clear Boxes" can't race the loop over the same
   shared `detections`/`results` arrays and produce duplicate or corrupted
   rows. For every drawn box, wrapped in its own `try/catch` so one bad box
   logs an error row and the batch continues instead of aborting the rest:
   - Crops that region out of the page canvas (`cropCanvas`, with padding),
   - Runs it through this file's own `autoCropAndEnhance()` + `preprocessCanvas()`
     — a separate local reimplementation of the single-receipt tool's
     versions, not the shared code (each app hardcodes its own copy). Both
     now include a guard for a box with no detectable content (e.g. a
     blank/near-white selection), falling back to using the box as drawn
     instead of computing an invalid negative crop size.
   - OCRs it independently with Tesseract.js (`ocrCanvas`), capturing
     Tesseract's page-level mean confidence for that box (see
     [OCR confidence score](#ocr-confidence-score)),
   - Cleans the text with `cleanOCRText()` and parses it with the shared
     `parseReceipt()`,
   - Appends one row per box to a running results table (page #, merchant,
     date, subtotal, GST, total, color-coded confidence).
4. **Export** — `exportSummaryXLSX()` / summary CSV export the accumulated
   results table (one row per detected receipt) to Excel/CSV. Confidence is
   shown on-screen in the results table only — deliberately left out of
   both export formats.
5. **Clear Results** — resets the accumulated `results` array and table.
6. **Debug panel** (`appendDebug`) — logs per-box OCR progress, the full raw
   OCR text, full cleaned text, and the full parsed JSON result (not
   truncated previews), so a wrong field can actually be diagnosed from the
   panel. The panel's CSS sets `white-space: pre-wrap` so these multi-line
   entries render (and copy) with their real line breaks intact, instead of
   collapsing into one run-on paragraph.

This tool is best for scanned pages with several receipts on it; the
single-receipt tool is best when each file is exactly one receipt.

---

## How OCR error correction actually works

Both tools try to fix Tesseract misreads, and there are now **three layers**
across two different mechanisms — exact pattern substitution and genuine
fuzzy matching. It's easy to conflate them, so here's the distinction.

### 1. Merchant names, tier one — exact pattern substitution (not fuzzy)

The first two passes (`cleanOCRText()` in [cleanOCR.js](Receipt%20Scanner/cleanOCR.js),
and the ISETAN-specific check inside `normalizeMerchant()` in
[parseReceipt.js](Receipt%20Scanner/parseReceipt.js)) are **hardcoded regexes
for specific, previously-observed misreads** — essentially a curated typo →
correction lookup table, not a similarity calculation:

```js
text = text.replace(/\bFa1rpr1ce\b/gi, 'FAIRPRICE');
text = text.replace(/\bC0LD\s*ST0RAGE\b/gi, 'COLD STORAGE');
text = text.replace(/\bTSETAN\b/gi, 'ISETAN');
```

Each rule encodes a known Tesseract substitution pattern (`0`↔`O`, `1`↔`I`/`l`,
dropped letters, etc.) that someone observed on real receipts and wrote a
`\b...garbled...\b` → `CORRECT` rule for. There is no distance/threshold
check here — a merchant name gets corrected **only if its exact garbled form
already has a matching regex**. A misread that isn't in the list (e.g. a
brand-new OCR error, or a merchant not yet added) passes through unchanged
at this stage. This is why the list is long (~20 merchants, dozens of
variants) but inherently incomplete on its own — which is what tier two
exists to cover.

### 2. Merchant names, tier two — fuzzy fallback against `sgMerchants.js`

If tier one didn't change the merchant name, `normalizeMerchant()` falls
back to real fuzzy matching against a ~250-name reference list, using the
same edit-distance idea as the subtotal detector below:

```js
// cleanOCR.js
function fuzzyMatchMerchant(candidate, merchantList, maxDistanceRatio = 0.3) {
    let best = null, bestDist = Infinity;
    for (const name of merchantList) {
        // ...skip names whose length is wildly different, then:
        const dist = levenshteinDistance(candidate, name.toUpperCase());
        const maxAllowed = Math.max(2, Math.floor(name.length * maxDistanceRatio));
        if (dist <= maxAllowed && dist < bestDist) { // strictly less
            bestDist = dist;
            best = name;
        }
    }
    return best; // null if nothing was close enough
}
```

This scans the **entire** merchant list and keeps whichever name has the
smallest edit distance — it is a nearest-neighbor search, not a
first-match-wins scan, so **list order in `sgMerchants.js` doesn't change
which name a given OCR misread ends up closest to.** The one place order
*does* matter: the comparison above is `dist < bestDist` (strictly less),
so if two different merchant names end up tied at the exact same distance
from the OCR text, whichever one appears **earlier** in the array wins the
tie. That's why, e.g., `"Tsui Wah @ JEM"` is listed before the plain
`"Tsui Wah"` in `sgMerchants.js`/`SgMerchants.json` — it only changes the
outcome on an exact tie, not how tight or loose the matching is overall.
(To actually tighten/loosen the matching itself, the lever is
`maxDistanceRatio`, not list order.)

```js
// parseReceipt.js / Receipt-scanner.html
if (normalized === merchant) { // tier one made no change
    const fuzzyMatch = fuzzyMatchMerchant(normalized, SG_MERCHANTS);
    if (fuzzyMatch) normalized = fuzzyMatch.toUpperCase();
}
```

`SG_MERCHANTS` is defined in [`sgMerchants.js`](Receipt%20Scanner/sgMerchants.js)
— a flat array of the same ~250 merchant names as `SgMerchants.json`, kept
as plain JS (not fetched JSON) so it loads via a normal `<script>` tag with
no CORS issues when the HTML files are opened directly as `file://` URLs
(local `fetch()` of JSON is blocked in most browsers under `file://`).
Unlike tier one, this generalizes to misreads nobody explicitly coded for —
e.g. `KOPITIAN` (missing the final vowel swap) fuzzy-matches to `Kopitiam`
even though no regex mentions that typo — but it's also less precise: a
short or ambiguous OCR line could in theory match the wrong merchant if it
happens to be close-enough to more than one name (the length-ratio guard
and distance cap keep this rare in practice, but it's not impossible).

`SgMerchants.json` itself is a **static, human-curated reference dataset**
— it documents the full merchant list by category, but nothing loads or
reads *that* file at runtime. `sgMerchants.js` is a separate, hand-kept-in-sync
flat copy that the code actually uses; if you add a merchant to the JSON,
add it to `sgMerchants.js` too (they are not generated from one another).

### 3. Subtotal-line detection — genuine fuzzy matching (Levenshtein distance)

`isLikelySubtotal()` in [parseReceipt.js](Receipt%20Scanner/parseReceipt.js)
is the one place that does real fuzzy matching, used to decide whether a
line represents the subtotal:

```js
function levenshteinDist(a, b) { /* classic edit-distance DP */ }

function isLikelySubtotal(line) {
    if (subtotalPattern.test(line) || subtotalVariants.test(line)) return true;
    // ...tokenize the line, then for each word-like token:
    const dist = levenshteinDist(t, 'subtotal');
    if (dist <= 2) return true;
}
```

It first tries a couple of exact regexes (`sub[\s-]?to?t?a?l`, and a short
list of known variants like `subfotal`/`subtatal`/`subt0tal`), then falls
back to computing the **edit distance** (insertions/deletions/substitutions)
between each token on the line and the literal word `"subtotal"`. Any token
within **2 edits** counts as a match. Because this is a distance calculation
rather than a fixed list, it also catches misreads that were never
explicitly anticipated (e.g. `Subtoal`, `SubtotaI`, `5ubtotal`) — it
generalizes to novel OCR noise, unlike the merchant-name substitution list.

**In short:** merchant names go through an exact, curated regex lookup table
first (fast, precise, but only as good as the rules written so far), then a
Levenshtein-distance fuzzy fallback against the full `sgMerchants.js` list
(broader coverage, slightly less precise) if the exact rules didn't catch
anything. Subtotal-line detection uses the same fuzzy-matching *technique*
independently, but only against the single word "subtotal" — not against
prices, dates, or merchant names.

---

## OCR confidence score

Both tools surface Tesseract's own confidence score for each scan, so a
low-quality read is visible instead of looking just as trustworthy as a
clean one:

```js
const result = await Tesseract.recognize(source, 'eng', { ... });
const confidence = result.data.confidence; // 0-100
```

- **Single-receipt tool**: shown as an "OCR Confidence" card next to
  Merchant/Date, color-coded (green ≥80%, amber 50-79%, red <50%), and
  included in the Copy Table text — but **not** in the CSV/Excel exports
  (deliberately excluded from those file formats).
- **Multi-receipt tool**: shown as its own color-coded column in the
  on-screen results table (one confidence score per drawn box) — also
  **not** included in the CSV/XLSX exports, same reasoning.

**What it actually measures — and what it doesn't:** this is Tesseract's
*page-level mean confidence* for everything it recognized in that image —
a single overall number, not a per-field score. A receipt can score, say,
85% overall and still have one misread digit in the total, because that
one bad character gets averaged out across everything else that was read
correctly. Treat it as a **triage signal** ("this one's worth
double-checking") rather than a guarantee that every field is correct —
and don't read too much into small differences (82% vs. 78% isn't
meaningfully different; anything solidly in the red band is what's worth
acting on).

---

## Shared modules

### [`cleanOCR.js`](Receipt%20Scanner/cleanOCR.js)
- `cleanOCRText(text)` — normalizes raw Tesseract output before parsing:
  strips non-ASCII/OCR-artifact characters, fixes ~20 known
  Singapore-merchant OCR misreads via exact regex (FairPrice, Cold Storage,
  Giant, Sheng Siong, 7-Eleven, Don Don Donki, Guardian/Watsons,
  Popular/Courts, McDonald's/KFC/Burger King, Uniqlo/Muji/Daiso, etc.), and
  re-inserts line breaks around prices/quantities/headers (word-bounded,
  e.g. `\bItem\b`, so the header rule doesn't also match "Item" as a
  substring of "items" and wrongly split a total line like "Total 1 items
  2.70" apart from its price) so multi-item receipts don't collapse into
  one run-on line.
- `levenshteinDistance(a, b)` — standard edit-distance calculation, shared
  by the fuzzy matching below.
- `fuzzyMatchMerchant(candidate, merchantList, maxDistanceRatio)` — finds
  the closest name in a merchant list within a length-scaled edit-distance
  tolerance; used by `normalizeMerchant()` (below) as the fuzzy fallback
  for merchant names not covered by the exact regexes above. First strips
  stray non-alphanumeric characters off both ends of the candidate (e.g. a
  merchant line OCR'd as `"H LUCKIN COFFEE }"` — the receipt's decorative
  border misread as junk symbols glued to the real text) before comparing,
  since otherwise that junk eats directly into the same fixed edit-distance
  budget as a genuine misread and can push an otherwise-clean match over
  the rejection threshold. Note this only strips symbols — a stray *letter*
  glued to either end (also possible; OCR sometimes misreads a border mark
  as a lone letter rather than a symbol) isn't caught by this and would
  still need a smarter match (e.g. substring search) to handle.

### [`sgMerchants.js`](Receipt%20Scanner/sgMerchants.js)
Defines the global `SG_MERCHANTS` array — the ~250 Singapore merchant names
from `SgMerchants.json`, flattened and hand-kept in sync, but as a plain JS
file rather than JSON. This is the list `fuzzyMatchMerchant()` actually
searches at runtime. It's a JS file (not fetched JSON) specifically so it
still loads when the HTML files are opened directly via `file://` — see
[How OCR error correction actually works](#how-ocr-error-correction-actually-works).

### [`parseReceipt.js`](Receipt%20Scanner/parseReceipt.js)
`parseReceipt(text)` — takes cleaned OCR text and extracts:
- **Merchant** — first mostly-alphabetic line among the first 5 lines, then
  passed through `normalizeMerchant()` (also defined in this file) for a
  two-tier correction: first an exact-regex pass for known OCR variants
  (currently `ISETAN`/`TSETAN`/`1SETAN`/`IBETAN`, deciding whether to append
  "SINGAPORE" based on whether that word appears anywhere in the text), and
  if that made no change, a fuzzy fallback via `fuzzyMatchMerchant()`
  against the full `SG_MERCHANTS` list in `sgMerchants.js`.
- **Date** — multi-pattern detection (slash/dash formats, month names,
  labeled `Date:` fields) plus digit-only fallback parsing (including an
  OCR quirk where `/` gets misread as `7`), standardized to `DD/MM/YYYY`.
- **Subtotal / GST / Total** — scans all lines for trailing prices (handles
  both `6.30` and OCR-mangled spaced prices like `6. 30`), classified using
  keyword regexes for GST/tax (`GST`, `G5T`, `65T`, `9% GST`, etc.) and a
  fuzzy Levenshtein-distance match (`isLikelySubtotal`) so OCR typos of
  "subtotal" are still caught. Lines matching `discountPattern`
  (`/\bdiscount(s)?\b/i`, e.g. "Total Discount -3.30") are excluded from
  total-detection, since `totalPattern` alone (`/\btotal\b/i`) would
  otherwise treat them as an equally valid candidate and let OCR line order
  decide whether the discount or the real total wins. Falls back to
  subtotal if no total line is found.

This is the same parsing logic embedded (with minor extensions for item
detection, including its own local copy of `normalizeMerchant()`) directly
inside `Receipt-scanner.html`; the multi-receipt tool uses this file
directly instead of duplicating it, so both tools apply the same three-tier
merchant-name correction (exact fixups in `cleanOCR.js` → exact ISETAN check
in `normalizeMerchant()` → fuzzy fallback against `sgMerchants.js`).

### [`SgMerchants.json`](Receipt%20Scanner/SgMerchants.json)
A static, human-curated reference dataset of known Singapore merchant names
grouped by category (supermarkets/grocery, convenience stores,
pharmacy/health, etc.). **Nothing loads or reads this JSON file at
runtime** — `sgMerchants.js` (above) is the flat JS copy the code actually
uses; this JSON file is the more readable/categorized source you'd edit by
hand before manually copying new entries into `sgMerchants.js`. See
[How OCR error correction actually works](#how-ocr-error-correction-actually-works)
for the full mechanism.

---

## Status / not yet implemented

- [index.html](index.html) at the repo root is currently an empty placeholder.
- [`Multi-Receipt Scanner/Scripts/scan.js`](Multi-Receipt%20Scanner/Scripts/scan.js)
  is an empty placeholder — the `Multi-Receipt Scanner` folder appears to be
  an earlier/parallel scaffold that was superseded by
  `Receipt Scanner/Receipt-scanner-multi.html`.
- [`Receipt Scanner/readme`](Receipt%20Scanner/readme) is empty.

## Usage

No install or build step — these are static HTML files with CDN-hosted
dependencies:

1. Open [`Receipt Scanner/Receipt-scanner.html`](Receipt%20Scanner/Receipt-scanner.html)
   in a browser for single-receipt scanning, or
   [`Receipt Scanner/Receipt-scanner-multi.html`](Receipt%20Scanner/Receipt-scanner-multi.html)
   for a page containing multiple receipts.
2. Upload an image or PDF of the receipt(s).
3. (Multi-receipt tool only) Draw a box around each receipt, then click
   **OCR Selected**.
4. (Single-receipt tool) Click **Scan Receipt**.
5. Review the parsed merchant/date/items/total, then export to CSV/Excel or
   copy the table.

An internet connection is required on first load to fetch Tesseract.js,
pdf.js, and SheetJS from their CDNs.
