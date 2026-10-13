<!--
Purpose: Consolidated user-approved Compact-v4 decisions collected from mega.txt.
Current role: Local design authority for the active demo chart; prevents reintroducing rejected layouts.
Last meaningful change: 2026-10-13 — active route unified with the verified server-rendered chart.
Constraint: This is a decision record, not permission to invent source data or alter reference files.
-->

# Compact-v4 Decisions

This file condenses the later user corrections in `mega.txt`. Later entries supersede earlier brainstorms.

## Active Surface

- The active demo is the verified server-rendered chart at `/charts/:date`.
- `/app/charts/:date` redirects to it. There must not be two chart implementations or an iframe preview.
- `server/chart-document.ts` remains the projection boundary and `server/render/chart-html.ts` remains print authority.
- The React files are a future screen refactor surface only until they can render the same ChartDocument without loss.
- `design/compv3.css` and `design/panchavati-compv3.html` are historical visual references, not authoritative 10/09 data.

## App Chrome

| Area | Required shape |
|---|---|
| Persistent header | Logo, Panchavati Police Station identity, grouped navigation, language toggle, date selector, clerk identity |
| Header exclusions | No DRAFT, FINALIZED, edit, finalize or print actions in the persistent identity/header area |
| Chart toolbar | Directly below header; chart title, date/weekday, lifecycle, संपादन, अंतिम करा or सुधारणा सुरू करा, प्रिंट |
| Language | Show one UI language at a time; never duplicate English and Marathi labels |
| Future navigation | Show real future areas as Coming Soon, WIP, Planned or Reference; never pretend incomplete routes work |

## Printed Identity

One compact centered line:

```text
नाशिक शहर पोलीस आयुक्तालय      दैनिक कर्तव्य वाटप      १० सप्टेंबर २०२६, गुरुवार
```

No `दिनांक`, `वार`, decorative dot, em dash, duplicated language, large title stack or empty header block.

## Page 1

1. Senior officer identity on one line: `वपोनि गजेंद्र पाटील ठाणे प्रमुख`.
2. Dynamic support columns: writer, driver, RTPC, operator only when source-backed.
3. Writer has no day/night split unless the source has one.
4. Driver, RTPC and operator may use compact day/night subdivisions.
5. Four subordinate officer blocks remain horizontally arranged, in two compact rows when needed.
6. Officer blocks begin directly with name and branch; no `अधिकारी १`, `अधिकारी २` heading row.
7. Lower content keeps comparable day/night groupings side by side.
8. Office, clerical, court, summons, warrant and special content moves away from Page 1 when density requires.
9. Empty/unsupported support groups can be individually hidden through explicit presentation controls, never auto-inferred.
10. Never invent writer, RTPC, operator or officer relationships.

## Content Grammar

- Use horizontal bands, disciplined columns, thin rules and light heading bands.
- Avoid dashboard cards, shadows, nested rounded cards, double borders, decorative pills and oversized empty padding.
- Do not render one large row/card per person.
- Group repeated role labels and let names wrap inside their own group.
- Day/night first-three logical groupings remain comparable.
- Chowki blocks show name, प्रभारी, BIMA people, remaining staff, रिक्त, and explicit बंद/चार्ज state.
- Marshal is a separate operational post and may fold visually into its paired chowki without losing state.
- BIMA is assignment-level and explicit; बंद is location-level; रिक्त is a vacant seat.
- Protected source terms and Marathi spellings remain unchanged.

## Sheets

| Sheet | Content |
|---|---|
| 1 | Senior officer, four subordinate officers, compact station day/night core |
| 2 | Office/clerical, court, summons, warrant and special duties |
| 3 | Six-chowki day/night matrix, BIMA, marshal, बंद and चार्ज |
| 4 | Night instructions and notices; may combine with Sheet 5 when sparse |
| 5 | Leave and other duties |
| 6 | Manpower, source values, summaries and sudden-change ledger |
| 7 | Officer summary, two compact scan tables and sign-off when density requires |

Target: 5–6 sheets normally, 6–7 for dense/event days. The measured 10/09 implementation is 7 sheets because
moving office/court/special content off Page 1 cannot fit the chowki matrix without overflow; readability and no-loss
content take priority over forcing six.

## CRUD

The assignment editor is one centered viewport-safe modal/flyout:

```text
कर्मचारी नेमणूक
  सध्याचा कर्मचारी
    कर्मचारी माहिती बदला
    रिक्त करा
  हजर कर्मचारी निवडा
    name / English name / buckle / rank search
  नवीन कर्मचारी जोडा
    Marathi name, English name, rank, buckle, phone
  या नेमणुकीसाठी
    time, explicit BIMA, notes
```

Master fields and assignment fields stay separate. Save through the existing narrow APIs, preserve the clicked slot, support Escape/outside click/internal scroll, show success/failure, and never auto-replace or schedule.

## Lifecycle

`DRAFT → VALIDATED → FINALIZED`. Finalized charts are immutable. `सुधारणा सुरू करा` creates a new amendment draft; it does not mutate the finalized chart.

## Rejected Approaches

- Legacy six-page chart as the active product.
- Kushal standardized long scrolling mega-table.
- Generic KPI/dashboard home.
- Embedded old chart inside a React iframe.
- Duplicate React/server chart implementations.
- Invented assignment relationships.
- Silent translation/transliteration.
- Arbitrary persisted HTML/CSS/JS layout.
