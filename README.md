# CheckSpree2 (Rewrite)

This is a clean rewrite of CheckSpree that treats printing as a **physical-units problem**:

- The “paper” and “check” are defined in **inches**.
- Field positions/sizes are stored in **inches**.
- Printing uses a dedicated print layout and optional **PDF preview**, so you can calibrate without wasting check stock.

## Why this rewrite

Pixel-based templates and DPI conversions are fragile on Windows printers. This version avoids that by:

- Rendering the check at a real physical size (`in`) in `@media print`
- Allowing precise **X/Y offsets in inches** (per printer) to dial in alignment

## Run

From the repo root:

```powershell
cd .\CheckSpree2
npm install
npm run dev
```

## Calibration workflow

1. Load your template (used only as an on-screen guide).
2. Set **Check size** (inches) and **Page offsets** (where the check sits on the paper).
3. Use **Preview PDF** to verify alignment before printing.
4. Fine-tune offsets until it prints perfectly on your checks.

