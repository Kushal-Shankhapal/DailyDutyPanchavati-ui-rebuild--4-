### 1. Empirical Roster Comparison Across All Four Dates

### Revised Evidence Record: Page 5 (Officer Duty Summary / पोलीस अधिकारी कर्तव्य)

---

### 1. Proven Facts from Reference PDFs
* **Stable Roster Structure**: Across all four duty charts (`10.pdf Page 5`, `11.pdf Page 6`, `12.pdf Page 5`, `16.pdf Page 5`), the 15-position subordinate officer roster is **100% stable and invariant** in sequence, rank codes, and Devanagari names [10.pdf Page 5, 11.pdf Page 6, 12.pdf Page 5, 16.pdf Page 5]. These 15 rows correspond exactly to officers #2 through #16 in the master station directory (`Staff_Info.pdf` / `Staff_Info.md Table 1`).
* **Daily Operational Variation (`कर्तव्य`)**: The 3rd column (`कर्तव्य`) is the **only field that changes daily** across all four dates [10.pdf Page 5, 11.pdf Page 6, 12.pdf Page 5, 16.pdf Page 5]. It captures various daily operational states:
  * **General Presence**: `उपस्थित`
  * **Scheduled Rest**: `साप्ताहिक सुट्टी` (aligns with rest days in `Staff_Info.md Table 1`)
  * **Shifts & Time Windows**: `९ ते १४ व नाईट`, `नाईट करून १६ ते २१`, `नाईट करून १२ ते २१`, `०९ ते १४ व नाईट`
  * **Station & Mobile Duty**: `डे पि.एस.ओ.`, `पंचवटी १ मोबाईल - दिवसपाळी`, `पंचवटी १ मोबाईल - रात्रपाळी`
  * **Court & Outstation Duty**: `हायकोर्ट - मुंबई`, `लोक अदालत, जिल्हा व सत्र न्यायालय`, `तपास - सातारा`
  * **Bandobast / Events**: `उपस्थित - गणेश मुर्ती स्टॉल बंदोबस्त`, `बंदोबस्त - मुंबईनाका पोलीस ठाणे`, `उपस्थित - श्री गणेशोत्सव बंदोबस्त`
* **Senior PI Omission**: Senior PI Gajendra Patil (`वपोनि गजेंद्र रघुनाथ पाटील`), who appears as Officer #1 in `Staff_Info.md Table 1`, is **omitted from the 15 numbered rows on Page 5** across all four dates [10.pdf Page 5, 11.pdf Page 6, 12.pdf Page 5, 16.pdf Page 5].

---

### 2. Analytical & Architectural Inferences
* **Reason for Senior PI Omission**: Senior PI appears prominently in the top header block of Page 1 Column 1 (`(पंचवटी पो.स्टे.) वपोनि गजेंद्र पाटील`) on all four charts [10.pdf Page 1, 11.pdf Page 1, 12.pdf Page 1, 16.pdf Page 1]. Inferring that he is omitted from Page 5 *because* he holds overall station command is an operational inference, as the document text does not state the rule explicitly.
* **Derived Projection**: Because every entry in the `कर्तव्य` column on Page 5 reflects shift assignments from Pages 1 and 2, leave/rest statuses from Page 3, or event assignments, there is a **strong architectural inference** that Page 5 should be implemented as a derived projection of underlying daily operational states.

---

### 3. Implementation Specifics (Not Proven by Reference PDFs)
* **View / Database Implementation**: The PDFs **do not prove** specific database schema structures, SQL views (such as `vw_officer_duty_summary`), or specific backend tables (such as `special_events`).
* **Storage Requirements**: The PDFs prove the visual and text layout of the printed chart, but **do not prove** whether a separate database table is or is not used in the software implementation.

---

### Summary Evidence Matrix

| Component | Source Evidence Status | Proven Detail |
| :--- | :--- | :--- |
| **15 Subordinate Officer Roster** | **Proven Fact** | Fixed list of 15 officers (#2–#16 from directory) in identical order across 10/09, 11/09, 12/09, 16/09 [10.pdf, 11.pdf, 12.pdf, 16.pdf]. |
| **`कर्तव्य` Column Entries** | **Proven Fact** | Operational duty text changing daily per officer across all four dates [10.pdf, 11.pdf, 12.pdf, 16.pdf]. |
| **Senior PI Omission** | **Proven Fact** | Senior PI is absent from the 15 numbered rows on Page 5 across all four dates [10.pdf, 11.pdf, 12.pdf, 16.pdf]. |
| **Reason for Senior PI Omission** | **Inference** | Inferred to be due to Senior PI holding overall station command on Page 1 header [10.pdf, 11.pdf, 12.pdf, 16.pdf]. |
| **Derived Summary Projection** | **Strong Architectural Inference** | Logical design choice that Page 5 should be projected from daily assignment and availability states. |
| **Specific SQL Views / Tables** | **Not Proven by PDFs** | Specific database views (`vw_officer_duty_summary`) or table constraints are software design choices. |

Old below

An empirical comparison of **Page 5 (Officer Duty Summary / पोलीस अधिकारी कर्तव्य)** across the four daily duty charts—`10/09/2026` (`10.pdf Page 5` / `10.md Table 9`), `11/09/2026` (`11.pdf Page 6` / `11.md Table 10`), `12/09/2026` (`12.pdf Page 5` / `12.md Page 5`), and `16/09/2026` (`16.pdf Page 5` / `16.md Table 9`)—proves that the 15-position officer roster is **100% structurally stable and invariant** in sequence, rank code, and officer name.

The 15 numbered rows on Page 5 correspond to officers #2 through #16 in the master station directory (`Staff_Info.pdf` / `Staff_Info.md Table 1`). The **only field that changes by date** is the 3rd column: **`कर्तव्य` (Operational Duty Assignment)**.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         PAGE 5 OFFICER ROSTER & DUTY COMPARISON                                                  │
├─────┬───────────────────────────────┬──────────────────────────┬──────────────────────────┬──────────────────────────┬──────────────────────────┤
│ अ.नं│ पोलीस अधिकारी (Fixed Master)  │ 10/09/2026 कर्तव्य       │ 11/09/2026 कर्तव्य       │ 12/09/2026 कर्तव्य       │ 16/09/2026 कर्तव्य       │
├─────┼───────────────────────────────┼──────────────────────────┼──────────────────────────┼──────────────────────────┼──────────────────────────┤
│ 1   │ पो.नि.सुनील पवार (गुन्हे)     │ उपस्थित                  │ साप्ताहिक सुट्टी         │ ९ ते १४ व नाईट           │ उपस्थित                  │
│ 2   │ पो.नि.सुधीर पाटील             │ उपस्थित                  │ उपस्थित                  │ साप्ताहिक सुट्टी         │ उपस्थित                  │
│ 3   │ पो.नि.नितीन आंधळे             │ उपस्थित                  │ उपस्थित                  │ नाईट करून १२ ते २१       │ हायकोर्ट - मुंबई          │
│ 4   │ स.पो.नि.शरद पाटील             │ उपस्थित                  │ साप्ताहिक सुट्टी         │ डे पि.एस.ओ.             │ नाईट करून १६ ते २१ उपस्थित│
│ 5   │ स.पो.नि.सतिश शिरसाठ           │ उपस्थित                  │ उपस्थित                  │ उपस्थित                  │ उपस्थित                  │
│ 6   │ स.पो.नि.हेमंत मोहिते           │ ९ ते १४ व नाईट           │ नाईट करून १६ ते २१       │ लोक अदालत, सत्र न्यायालय│ उपस्थित - श्री गणेशोत्सव  │
│ 7   │ स.पो.नि.प्रशांत बोरसे          │ उपस्थित                  │ हायकोर्ट, मुंबई           │ साप्ताहिक सुट्टी         │ उपस्थित - श्री गणेशोत्सव  │
│ 8   │ पो.उ.नि.कैलास जाधव            │ साप्ताहिक सुट्टी         │ ९ ते १४ व नाईट           │ नाईट करून १२ ते २१       │ उपस्थित - श्री गणेशोत्सव  │
│ 9   │ पो.उ.नि.प्रकाश नेमाणे         │ साप्ताहिक सुट्टी         │ उपस्थित                  │ उपस्थित - स्टॉल बंदोबस्त │ उपस्थित - श्री गणेशोत्सव  │
│ 10  │ पो.उ.नि.सचिन चव्हाण           │ उपस्थित                  │ तपास - सातारा            │ ९ ते १४ व नाईट           │ उपस्थित - श्री गणेशोत्सव  │
│ 11  │ पो.उ.नि पुंडलिक पावसे          │ साप्ताहिक सुट्टी         │ साप्ताहिक सुट्टी         │ बंदोबस्त - मुंबईनाका     │ ०९ ते १४ व नाईट          │
│ 12  │ परि.म.पो.उ.नि.अर्चना वाघ      │ डे पि.एस.ओ.              │ डे पि.एस.ओ.              │ साप्ताहिक सुट्टी         │ डे.पीएसओ                 │
│ 13  │ परि.पोउनि.प्रतिक राऊत         │ पंचवटी १ मोबाईल - दिवसपाळी│ साप्ताहिक सुट्टी         │ पंचवटी १ मोबाईल - रात्रपाळी│ पंचवटी १ मोबाईल - रात्रपाळी│
│ 14  │ परि.पोउनि.सुनिल ठेंग         │ पंचवटी १ मोबाईल - रात्रपाळी│ पंचवटी १ मोबाईल - रात्रपाळी│ नाईट करून स्टॉल बंदोबस्त │ उपस्थित                  │
│ 15  │ परि.पोउनि.अशोक दिंडे          │ साप्ताहिक सुट्टी         │ पंचवटी १ मोबाईल - दिवसपाळी│ पंचवटी १ मोबाईल - दिवसपाळी│ पंचवटी १ मोबाईल - दिवसपाळी│
└─────┴───────────────────────────────┴──────────────────────────┴──────────────────────────┴──────────────────────────┴──────────────────────────┘
```

---

### 2. Categorization & Analysis of `कर्तव्य` Values

The duty entries in the 3rd column capture the complete spectrum of daily supervisory assignments:

1. **General Presence (`उपस्थित`)**:
   Indicates baseline station duty without a specialized outstation or patrol vehicle assignment (e.g. Inspector S. Patil on 10/09, 11/09, and 16/09; API Shirsat across all 4 dates).
2. **Weekly Rest (`साप्ताहिक सुट्टी`)**:
   Matches individual officer rest schedules maintained in the master directory (`Staff_Info.md Table 1`):
   * PI Sunil Pawar (Friday off in master) \\(\rightarrow\\) `साप्ताहिक सुट्टी` on Friday 11/09.
   * API Sharad Patil (Friday off in master) \\(\rightarrow\\) `साप्ताहिक सुट्टी` on Friday 11/09.
   * PI Sudhir Patil (Saturday off in master) \\(\rightarrow\\) `साप्ताहिक सुट्टी` on Saturday 12/09.
   * PSI Prakash Nemane (Thursday off in master) \\(\rightarrow\\) `साप्ताहिक सुट्टी` on Thursday 10/09.
3. **Night Shifts & Split Time Windows (`night duty` / split shifts)**:
   Captures 24-hour rotation windows and split shift obligations:
   * `९ ते १४ व नाईट` / `०९ ते १४ व नाईट`: Day shift (09:00–14:00) plus overnight shift (21:00–09:00) (e.g. API Mohite on 10/09; PSI Jadhav on 11/09; PI Pawar & PSI Chavan on 12/09; PSI Pawase on 16/09).
   * `नाईट करून १६ ते २१`: Overnight shift completed, returning for evening duty (16:00–21:00) (e.g. API Mohite on 11/09; API S. Patil on 16/09).
   * `नाईट करून १२ ते २१`: Overnight shift completed, returning for afternoon/evening duty (12:00–21:00) (e.g. PI Andhale & PSI Jadhav on 12/09).
4. **Station House Officer Duty (`डे पि.एस.ओ.` / `डे.पीएसओ`)**:
   Reflects the officer holding primary Station House Officer charge on Page 1 Column 1 (`10.pdf Page 1`, `11.pdf Page 1`, `16.pdf Page 1`) (e.g. Probationary WPSI Archana Wagh on 10/09, 11/09, and 16/09; API Sharad Patil on 12/09).
5. **Patrol Mobile Charge (`पंचवटी १ मोबाईल`)**:
   Reflects the inspector patrol vehicle allocation on Pages 1 and 2 (`10.pdf Page 1 & 2`):
   * Day Shift: `पंचवटी १ मोबाईल - दिवसपाळी` (Prob PSI Raut on 10/09; Prob PSI Dinde on 11/09, 12/09, and 16/09).
   * Night Shift: `पंचवटी १ मोबाईल - रात्रपाळी` (Prob PSI Theng on 10/09 and 11/09; Prob PSI Raut on 12/09 and 16/09).
6. **Court & Legal Directives**:
   High Court and district legal deployments:
   * `हायकोर्ट, मुंबई` / `हायकोर्ट - मुंबई` (API Borse on 11/09; PI Andhale on 16/09).
   * `लोक अदालत, जिल्हा व सत्र न्यायालय` (API Mohite on Saturday 12/09).
7. **Special Event & Festival Bandobast**:
   Temporary event deployments:
   * `उपस्थित - गणेश मुर्ती स्टॉल बंदोबस्त` / `नाईट करून १५ वा. नंतर स्टॉल बंदोबस्त` (PSI Nemane, PSI Chavan, Prob PSI Theng on 12/09).
   * `बंदोबस्त - मुंबईनाका पोलीस ठाणे` (PSI Pawase on 12/09).
   * `उपस्थित - श्री गणेशोत्सव बंदोबस्त` (Mass festival deployment on 16/09 covering API Mohite, API Borse, PSI Jadhav, PSI Nemane, and PSI Chavan).
8. **Outstation Investigation (`तपास - सातारा`)**:
   Special outstation investigation duty (PSI Sachin Chavan on 11/09).

---

### 3. Identification of Exception

* **Senior PI Omission from Numbered List**:
  * In the master directory (`Staff_Info.md Table 1`), Senior PI Gajendra Patil (`वपोनि गजेंद्र रघुनाथ पाटील`) is listed as Officer #1.
  * On Page 5 across all charts (`10.pdf Page 5`, `11.pdf Page 6`, `12.pdf Page 5`, `16.pdf Page 5`), Senior PI is **omitted from the 15 numbered rows**.
  * **Reason**: Senior PI is the Station In-Charge listed at the top header of Page 1 Column 1 (` (पंचवटी पो.स्टे.) वपोनि गजेंद्र पाटील`). Page 5 specifically lists the 15 subordinate supervisory officers (PIs, APIs, PSIs, Probationary PSIs) operating under Senior PI's station command.

---

### 4. Architectural & Data Model Conclusion

The evidence strictly supports treating Page 5 as a **derived operational projection** compiled from stable master data and daily shift allocations:

1. **Stable Master Data**:
   * The officer directory (`staff_members` table joined with `ranks` where `ranks.category = 'OFFICER'`) provides the fixed 15-position list, serial order, rank codes, and full Devanagari names.
2. **Daily Operational / Derived View State**:
   * Page 5 is **not** an independently edited spreadsheet. The `कर्तव्य` column is dynamically compiled on demand (`vw_officer_duty_summary`) from:
     * Shift assignments on Pages 1 & 2 (`daily_assignments` for PSO, Checking Officer, and Panchavati 1 Mobile).
     * Leave registers on Page 3 (`daily_availabilities` for Weekly Offs, Sick Leave, and Court Duty).
     * Special event registers (`special_events` for Ganeshotsav and Stall Bandobast).

This proves that **no separate database table is required or allowed for Page 5**. Storing normalized officer assignments automatically projects into the exact 15-row Page 5 summary layout during A4 print generation [`technical_relational_schema_panchavati.md`, `application_architecture_blueprint_panchavati.md`].