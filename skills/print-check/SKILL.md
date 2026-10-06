---
name: print-check
description: Verify printed chart/annex output against reference PDFs. Use when building or changing print CSS, the print projection, PDF export, or claiming visual correctness.
---
# Print Verification Procedure
1. Rasterize the matching reference page (reference/ORIGINAL_VISUAL/*.pdf) to compare visually; use reference/SEMANTIC/*.md for exact strings.
2. Render via the print pipeline and open in IDE browser preview; screenshot at print media emulation; also check grayscale (color-scheme trick / desaturated screenshot) — never rely on color alone: BIMA=[बिमा] chip, बंद=hatch+text, रिक्त=dashed tag.
3. Confirm: no truncation of Marathi (wrap/growth), logical section order, compact board + continuation pages + optional annex, page count driven by content not hardcoded.
4. Finalized charts must render from snapshot replay, not live tables.
5. Report concrete differences (missing section, wrong order, wrong label, wrong break). Never claim visual correctness without an actual screenshot inspection. Delete temporary rasters.
