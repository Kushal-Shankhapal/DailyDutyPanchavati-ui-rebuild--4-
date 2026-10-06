A comparative analysis of the **Page 6 Patrol & Scan Schedule Tables** across all four daily duty charts (**10/09/2026, 11/09/2026, 12/09/2026, and 16/09/2026**) proves the structural stability of the underlying station templates and clarifies which elements represent fixed configuration versus dynamic daily input.

---

### 1. Table-by-Table Comparison Across Dates

#### Table 01: Morning Session (सकाळ सत्र ०९:०० ते १५:००)
* **Structure & Chowki Ordering**: Fixed 6-chowki sequence across all four dates (`10.pdf Page 6`, `11.pdf Page 7`, `12.pdf Page 6`, `16.pdf Page 6`):
  1. Meri Police Chowki (`मेरी पोलीस चौकी`)
  2. Phule Nagar Police Chowki (`फुले नगर पोलीस चौकी`)
  3. Katya Maruti Police Chowki (`काटया मारूती पोलीस चौकी`)
  4. Panchavati Karanja Police Chowki (`पंचवटी कारंजा पोलीस चौकी`)
  5. Malegaon Stand Police Chowki (`मालेगांव स्टँड पोलीस चौकी`)
  6. Sardar Police Chowki (`सरदार पोलीस चौकी`)
* **Mobile & Marshal Mappings**:
  * **Patrol Mobile Column**: Mapped to `चौकीचे ईन्चार्ज अंमलदार` for all 6 chowkis across all dates.
  * **Beat Marshal Column**: Mapped to respective Chowki Marshals (Meri Marshal, Phule Nagar Marshal, Katya Maruti Marshal, Panchavati Karanja Marshal, Malegaon Stand Marshal), with **Sardar Chowki explicitly mapped to Malegaon Stand Marshal**.
* **Classification**: **FIXED CONFIGURATION** (Structural template, mobile, and marshal rules are 100% invariant).

---

#### Table 02: Afternoon Session (दुपार सत्र १५:०० ते २१:००)
* **Structure & Chowki Ordering**: Retains the identical 6-chowki sequence as Table 01 across all dates (`10.pdf Page 6`, `11.pdf Page 7`, `12.pdf Page 6`, `16.pdf Page 6`).
* **Mobile & Marshal Mappings**:
  * Rows 1–2 (Meri & Phule Nagar): Mapped to **CR Mobile** (`सि आर मोबाईल`).
  * Rows 3–4 (Katya Maruti & Karanja): Mapped to **Delta Mobile** (`डेल्टा मोबाईल`).
  * Rows 5–6 (Malegaon Stand & Sardar): Mapped to **DB Mobile** (`डी बी मोबाईल`).
  * Marshal Column: Mapped to corresponding Beat Marshals (with Sardar using Malegaon Stand Marshal).
* **Classification**: **FIXED CONFIGURATION** (Vehicle-to-jurisdiction routing is static).

---

#### Table 03: Beat Marshal & Office Staff Hourly Schedule (०९:०० ते २१:००)
* **Time Windows & Chowki Sequence Verification**:
  * Contains **12 fixed hourly time slots** (`०९:०० ते १०:००` through `२०:०० ते २१:००`) rotating through the 6 chowki jurisdictions in a fixed two-cycle sequence [10/09, 11/09, 12/09, 16/09].
* **Personnel Assignments (Changing Daily Data)**:
  * **10/09/2026**: Populated with specific station clerks and constables (`पोशि 2357 साबळे`, `मपोशि 669 गांगुर्डे`, `मपोहवा 2729 पाटील`, etc.) [`10.pdf Page 6` / `10.md Table 12`].
  * **11/09/2026**: Re-allocated with different office staff (`पोहवा 1091 गारे`, `मपोशि 2679 शिंदे`, etc.) [`11.pdf Page 7` / `11.md Table 13`].
  * **12/09/2026**: **Explicitly proves unassigned state** — the personnel column cells are **completely blank** in the visual layout [`12.pdf Page 6`], confirming that slot definitions exist independently of assigned staff.
  * **16/09/2026**: Re-allocated with updated personnel (`पोशि 2357 साबळे`, `पोशि 2073 ठाकुर`, etc.) [`16.pdf Page 6` / `16.md Table 12`].
* **Classification**: 
  * Hourly time slots & Chowki rotation: **FIXED CONFIGURATION**
  * Assigned personnel entries: **COPY+DAILY EDIT** (or **DAILY INPUT**)

---

#### Table 04: Night Session (रात्री सत्र २१:०० ते सकाळी ०९:००)
* **Structure & Outpost Mappings**:
  * Fixed 6-row jurisdiction map (`10.pdf Page 6`, `11.pdf Page 7`, `12.pdf Page 6`, `16.pdf Page 6`):
    1. Phule Nagar Chowki \\(\rightarrow\\) Meri Marshal
    2. Meri Chowki \\(\rightarrow\\) Meri Marshal
    3. Katya Maruti Chowki \\(\rightarrow\\) CR Mobile
    4. Panchavati Karanja Chowki \\(\rightarrow\\) DB Mobile
    5. Malegaon Stand Chowki \\(\rightarrow\\) Malegaon Stand Marshal
    6. Sardar Chowki \\(\rightarrow\\) Malegaon Stand Marshal
* **Standard Instruction**:
  * Printed footer note: `रात्रपाळी चौकीचे अंमलदार आपआपले चौकी हद्दीतील ग्रीन ॲप करतील.`
* **Classification**: **FIXED CONFIGURATION** / **AUTO-COPY**.

---

### 2. Element Provenance & Classification Matrix

| Element | Description | Provenance Classification | Citation Proof |
| :--- | :--- | :--- | :--- |
| **Section Header & Instructions** | Header text (`सुरक्षित ॲप करीता नेमण्यात आलेले...`) and footer instructions | **FIXED CONFIGURATION** | `10.pdf Page 6`, `11.pdf Page 7`, `12.pdf Page 6`, `16.pdf Page 6` |
| **6-Chowki Sequence (Tables 01, 02, 04)** | Fixed order: Meri \\(\rightarrow\\) Phule Nagar \\(\rightarrow\\) Katya Maruti \\(\rightarrow\\) Karanja \\(\rightarrow\\) Stand \\(\rightarrow\\) Sardar | **FIXED CONFIGURATION** | `10.pdf Page 6`, `11.pdf Page 7`, `12.pdf Page 6`, `16.pdf Page 6` |
| **Mobile & Marshal Routing (Tables 01, 02, 04)** | Morning In-Charge rules, Afternoon CR/Delta/DB routing, Night patrol coverage | **FIXED CONFIGURATION** | `10.pdf Page 6`, `11.pdf Page 7`, `12.pdf Page 6`, `16.pdf Page 6` |
| **12 Hourly Windows (Table 03)** | Fixed time slots from 09:00–10:00 to 20:00–21:00 with chowki rotation | **FIXED CONFIGURATION** | `10.pdf Page 6`, `11.pdf Page 7`, `12.pdf Page 6`, `16.pdf Page 6` |
| **Table 03 Personnel Allocations** | Individual staff members assigned to scan windows (blank on 12/09) | **COPY+DAILY EDIT** | `10.pdf Page 6`, `11.pdf Page 7`, `12.pdf Page 6`, `16.pdf Page 6` |

---

### 3. Summary Findings

1. **Table 03 Has Stable Structure with Dynamic Personnel**: Table 03 maintains 12 hourly time slots across all four dates. The blank cells on 12/09 prove that the hourly schedule template exists as a demand structure regardless of whether staff are populated.
2. **Tables 01, 02, and 04 Retain Exact Structural Mappings**: All three tables preserve identical six-chowki jurisdiction lists, ordering, and patrol unit mappings across every chart date.
3. **Configurable Template vs. Operational State**: Architecturally, Page 6 can be rendered by mapping daily assignments onto a pre-configured scan schedule template; the PDFs establish the separation between stable schedule structure and changing personnel, while the exact database implementation is a design decision.

Also, “zero hardcoded personnel or static PDF coordinates” is an implementation recommendation, not something the PDFs themselves prove.