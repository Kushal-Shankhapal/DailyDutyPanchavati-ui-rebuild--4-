---
name: source-forensics
description: Find and interpret authoritative evidence for a chart question (10/09, 11/09 and siblings). Use before implementing or changing any chart content, label or field.
---
# Source Forensics Procedure
1. Identify the question as a content question (what the chart says) or a software question (how we model it). Content questions are settled only by evidence.
2. Look in `reference/SEMANTIC/` first for exact Marathi text (grep-able, UTF-8). `10.md`/`11.md` = daily cases.
3. Confirm shape visually in `reference/ORIGINAL_VISUAL/*.pdf` when layout/merge/color matters (image-only; rasterize to view, delete temp files).
4. Page-1 layout/cell authority: `reference/EXCEL_RECONSTRUCTION/` workbooks + HTML.
5. Copy/reuse semantics: `reference/SEMANTIC/All Pages_Daily Copy Policy...md`.
6. Record findings with file+line citations in the task doc; if sources conflict, stop and record the conflict in docs/OPEN_QUESTIONS.md. Never resolve by guessing; never modify reference/.
