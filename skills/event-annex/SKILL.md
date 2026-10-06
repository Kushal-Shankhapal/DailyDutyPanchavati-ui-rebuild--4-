---
name: event-annex
description: Author a special event (personnel, equipment, instructions) and its printable annex. Use for event authoring UI, event data, or annex print work.
---
# Event Annex Procedure
1. Event = special_events + event_assignments + event_equipment + event_instructions. No Ganesh hardcoding; type is data.
2. Equipment lines keep source text verbatim (e.g. "गॅस गन॰ गॅस सेल 1) षाॅटरेज - 10 ...") plus structured name/quantity when evidenced; never invent policy constraints (SME N6).
3. Fall-in instruction is a first-class event instruction (time + venue + order text).
4. The annex is a print projection bound to the chart date; its extra physical page must require zero schema change (11/09 proof).
5. Verify with print-check; confirm the normal packet sections still render (annex must not swallow the leave section's data — it may push pages).
