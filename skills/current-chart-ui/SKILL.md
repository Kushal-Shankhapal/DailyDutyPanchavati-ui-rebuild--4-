---
name: current-chart-ui
description: Build or change the compact chart editor/board (document-like authoring, chowki blocks, contextual + actions, staff picker flow). Use for any web UI work on the chart.
---
# Current Chart UI Procedure
1. Read docs/ARCHITECTURE.md UI map + docs/DOMAIN.md vocabulary. The editor is a document, not CRUD tables.
2. Data flows only through ChartDocument projections (GET document, targeted mutations). React never queries SQL and never re-implements business rules.
3. Chowki block order: name -> प्रभारी -> BIMA people inline -> remaining staff -> रिक्त (dashed) -> बंद + charge line (hatched).
4. Contextual actions: + कर्मचारी / + ड्युटी / + साहित्य / + सूचना / + इव्हेंट. Staff picker: search -> "➕ नवीन कर्मचारी जोडा" mini form -> save -> return to exact chart context.
5. Marathi wraps, never truncates (overflow-wrap; row growth). Devanagari digits are display-only.
6. Secondary panels for: रजा/इतर ड्युटी, मनुष्यबळ, अचानक बदल, स्कॅन वेळापत्रक, सूचना, इव्हेंट.
7. Unfinished controls: label "Coming Soon", disabled.
8. Verify in IDE browser preview (screen + interaction), report what was inspected.
