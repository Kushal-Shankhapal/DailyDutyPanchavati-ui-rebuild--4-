### Daily Copy Policy for Panchavati Police Station Duty Chart

This policy defines the data handling rules for every section and table across the duty chart, grounded in the empirical evidence from the four reference dates (`10/09/2026`, `11/09/2026`, `12/09/2026`, and `16/09/2026`).

---

### 1. Canonical Logical Sections vs. Variable Physical PDF Pages

The duty chart consists of **six canonical logical sections** representing fixed operational domains:

1. **Section 1**: Day Shift Core (०९:०० ते २१:०० दिवसपाळी तक्ता)
2. **Section 2**: Night Shift Core (२१:०० ते ०९:०० रात्रपाळी तक्ता)
3. **Section 3**: Leave, Special & External Duties (इतर ड्युटी/रजा/सिक तक्ता)
4. **Section 4**: Manpower Strength Matrix & Audit Ledger (मनुष्यबळ तक्ता व अचानक ड्युटी बदल)
5. **Section 5**: Officer Duty Summary (पोलीस अधिकारी कर्तव्य)
6. **Section 6**: Configured Patrol & Scan Schedule (सुरक्षित ॲप स्कॅन वेळापत्रक)

* **Physical Page Separation**: On standard operational days (`10/09`, `16/09`), the six logical sections map 1:1 to physical A4 PDF pages 1–6. On special event days (`11/09`), inserting an extra full-page Equipment & Dress Rehearsal Table (`रंगित तालीम`) pushes Logical Section 3 onto physical Page 4, Section 4 onto Page 5, Section 5 onto Page 6, and Section 6 onto Page 7. **Logical sections define the operational domain; physical PDF page counts expand or contract depending on special event content**.

---

### 2. Daily Copy Policy Matrix (Pages 1–6 / Sections 1–6)

| Logical Section / Table | Roster Element & Operational Content | Exact Classification |
| :--- | :--- | :--- |
| **Section 1: Day Shift Core** | Structural grid, station headers, 6-Chowki listing order (Meri, Phule Nagar, Katya Maruti, Karanja, Stand, Sardar), standing office duty titles, vehicle call-signs | **FIXED CONFIGURATION** |
| | Permanent standing office clerks (Hazari Master, Property Room Clerk) | **AUTO-COPY** |
| | Field personnel allocations, PSO, Chowki Officers, drivers, Beat Marshals (`विमा`), outpost closures (`बंद`), split-shift timing notes | **COPY+DAILY EDIT** |
| | One-day parade/event notices (e.g., HQ parade call on 11/09) | **DAILY INPUT** |
| **Section 2: Night Shift Core** | Structural grid, Chowki order, patrol vehicle call-signs, night shift timing boundaries (21:00–09:00) | **FIXED CONFIGURATION** |
| | Standard night patrol boilerplate instructions (Column 4) | **AUTO-COPY** |
| | Night Checking Officer, Night PSO, lockup guard, chowki staff, night marshals, outpost closures (`बंद`) | **COPY+DAILY EDIT** |
| | Good Morning Squad roster (Column 4, derived dynamically from active night DB team) | **COPY+DAILY EDIT / VERIFY DERIVATION** |
| **Section 3: Leave & Special Duties** | Category headers, standard layout, standing external attachment slots (ACP/DCP office, Nirbhaya, Damini, Missing Cell, Court Pairvi) | **FIXED CONFIGURATION** |
| | Permanent external postings and multi-month leave baselines | **AUTO-COPY** |
| | Active daily leave & rest registrations (Weekly Off, Casual Leave, Earned Leave, Sick, Maternity) | **RECALCULATE** |
| | Hourly leave annotations (`०८ ते १०`, `११ ते १२`), outstation investigations (`तपासकामी`), festival bandobast, equipment tables | **DAILY INPUT** |
| **Section 4: Manpower Matrix & Audit** | 12 Rank columns + 2 summary columns, sanctioned baseline grid | **FIXED CONFIGURATION** |
| | *"दिवस व रात्रकरिता प्रत्यक्ष हजर"* (`03` constant across all four dates) | **FIXED CONFIGURATION** |
| | Present manpower counts & deduction row totals | **RECALCULATE** |
| | Sudden Duty Change Audit Ledger (**कारण मीमांसा**) | **APPEND-ONLY** |
| **Section 5: Officer Duty Summary** | 15-position subordinate officer roster (#2 to #16 from directory) and serial sequence | **FIXED CONFIGURATION** |
| | `कर्तव्य` Column (Daily operational duty assignments) | **RECALCULATE** |
| **Section 6: Patrol & Scan Schedule** | Table 01 (Morning 09–15 Structure & In-Charge Mappings) | **FIXED CONFIGURATION** |
| | Table 02 (Afternoon 15–21 Structure & CR/Delta/DB Mappings) | **FIXED CONFIGURATION** |
| | Table 03 (12 Hourly Time Slots 09–10 to 20–21 & Chowki Rotation) | **FIXED CONFIGURATION** |
| | Table 03 Personnel Entries (Changing staff across dates; blank on 12/09) | **COPY+DAILY EDIT** |
| | Table 04 (Night 21–09 Patrol Mappings & Instructions) | **FIXED CONFIGURATION** |

---

### 3. Final Evidence-Based Answers for Q8 and Q9

#### Q8: *"दिवस व रात्रकरिता प्रत्यक्ष हजर"*
* **Final Answer**: **UNKNOWN / No Proven Formula**.
* **Evidence**: The value **`03`** appears identically in Page 4 across all four daily duty charts (`10/09`, `11/09`, `12/09`, `16/09`). None of the row or column numbers in the strength matrix yield `03` through standard arithmetic operations. While its stability proves it is a recurring template value, its mathematical derivation and semantic meaning are not explicitly defined in the source documents.

#### Q9: `Office TOTAL` and `ME TOTAL`
* **`Office TOTAL`**: Proven to be the **Officer Cadre Total (`पोलीस अधिकारी वर्ग` / `एकुण अधि`)**, summing `PI` + `API` + `PSI`.
  * *Sanctioned*: \\(02 + 04 + 03 = \mathbf{09}\\).
  * *Weekly Off*: \\(\text{PSI } (03) = \mathbf{03}\\).
  * *Cross-Source Proof*: `Staff_Info.md Table 13` explicitly labels this total as `एकुण अधि` with value `09`.
* **`ME TOTAL`**: Proven to be the **Constabulary Cadre Total (`पोलीस अंमलदार वर्ग`)**, summing all non-gazetted constabulary ranks (`ASI` + `LASI` + `HC` + `LHC` + `PN` + `LPN` + `PC` + `LPC`).
  * *Sanctioned*: \\(11 + 46 + 53 + 123 = \mathbf{233}\\).
  * *Present*: \\(106 \text{ (Male)} + 45 \text{ (Female)} = \mathbf{151}\\).
  * *Weekly Off*: \\(03 + 02 + 14 + 02 = \mathbf{21}\\).
  * *Cross-Source Proof*: `Staff_Info.md Tables 11 & 13` explicitly list total present constabulary as `151` and sanctioned as `233`.
* **Caution on Abbreviation**: While the functional category boundary is 100% established by arithmetic, the exact English expansion of the abbreviation "ME" (e.g., "Men Enlisted", "Main Executive") is **unverified in the sources**.

---

### 4. Genuinely Unresolved Contradictions & Open Points

1. **Arithmetic Origin of `03`**: The exact formula producing `03` under *"दिवस व रात्रकरिता प्रत्यक्ष हजर"* on Page 4 remains unstated in station records.
2. **Expansion of Acronym "ME"**: The functional rank boundary is proven, but the exact English expansion of the acronym "ME" is not explicitly defined in the source text.
3. **Mid-Shift Change Approval Authority**: Whether mid-shift replacements on Page 4 (**कारण मीमांसा**) can be recorded directly by the Station Writer or require a Duty Officer co-signature remains an unstated administrative detail.