# DEEPAK CELLULOSE ERP — BUSINESS & OPERATIONAL ASSUMPTIONS

> **Document Version**: 1.0.0  
> **Target Organization**: Deepak Cellulose Pvt. Ltd. ([https://deepakcellulose.com/](https://deepakcellulose.com/))  
> **Prepared By**: Principal Software & Manufacturing Systems Architect  
> **Purpose**: Formal record of domain, chemical process, regulatory, and commercial assumptions implemented in the ERP system, with an actionable questionnaire for plant management sign-off.

---

## 1. Domain & Manufacturing Process Context

Deepak Cellulose Pvt. Ltd. operates specialized chemical plants synthesizing cellulose derivatives:
- **Microcrystalline Cellulose (MCC)**: Acid hydrolysis of purified specialty wood/cotton cellulose pulp using hydrochloric acid, followed by washing, neutralisation, spray/fluid-bed drying, and air classification into standard particle size grades (e.g., PH-101, PH-102, PH-105).
- **Sodium Carboxymethyl Cellulose (Na-CMC)**: Alkalization of cellulose with caustic soda, followed by etherification with Monochloroacetic Acid (MCA), alcohol washing to eliminate by-product sodium chloride and sodium glycolate, drying, and grinding.
- **Hydroxypropyl Methylcellulose (HPMC)**: Etherification using methyl chloride and propylene oxide under pressurized inert gas reactors.

---

## 2. Implemented Business Assumptions

### 2.1 Raw Material Intake & Gate Weighbridge
1. **Gross-Tare-Net Weighbridge Calculations**:
   - The security gate records the vehicle gross weight upon entry and tare weight upon empty exit.
   - **Assumption**: A standard allowable weighbridge tolerance of **±0.5%** is accepted between supplier dispatch invoice weight and plant weighbridge net weight due to transport evaporation, road dust, and scale calibration variations.
   - Any negative discrepancy exceeding 0.5% generates an automated shortage claim notation on the Goods Receipt Note (GRN).
2. **Immediate Quarantine Hold**:
   - Every raw material lot received at the gate is assigned the status `RECEIVED_PENDING_QC` and marked `isQuarantined = true`.
   - **Assumption**: Warehouse personnel are strictly prohibited from moving, blending, or issuing stock in this status until QC generates an authorized electronic Certificate of Analysis (CoA).

### 2.2 Quality Control & Analytical Monograph Standards
1. **Sampling Protocol**:
   - Sampling conforms to $\sqrt{N} + 1$ container rule (where $N$ is the number of containers in the delivery).
2. **Pharmacopeial Monograph Parameters**:
   - The default QC specifications seeded in the system reflect USP-NF, Ph. Eur., and Indian Pharmacopoeia (IP) standards:
     - **MCC**: Loss on Drying $\le 7.0\%$, pH $5.0 - 7.5$, Residue on Ignition $\le 0.05\%$, Particle Size ($+60$ mesh $\le 1\%$, $+200$ mesh $\ge 45\%$).
     - **Sodium CMC**: Degree of Substitution (DS) $0.65 - 0.90$, Viscosity (1% aqueous solution) $1,500 - 3,000\text{ mPa}\cdot\text{s}$, Purity $\ge 99.5\%$ (dry basis).
3. **Failure Protocol**:
   - Out-of-Specification (OOS) results trigger an automatic Material Rejection Note (MRN) and move the lot into a physically locked quarantine storage bin (`WH-QUARANTINE`).

### 2.3 Production & Electronic Batch Manufacturing Records (eBMR)
1. **Formula Scaling & Theoretical Yield**:
   - Master formulas specify baseline inputs for a standard 1,000 kg or 2,500 kg batch run.
   - **Assumption**: Chemical synthesis yield varies naturally based on ambient humidity and raw pulp moisture. A standard nominal yield range of **92.0% to 98.5%** is expected for MCC synthesis, and **88.0% to 95.0%** for Sodium CMC.
2. **Issue Slip Generation**:
   - When raw materials are charged to the reactor, the system generates an internal Material Issue Slip (`ISSUE-YYYY-####`) and deducts the inventory balance in real-time.
   - **Assumption**: Partial lot consumption is permitted; unused quantities remain in the original lot with updated balances.

### 2.4 Finished Goods Packaging & Shelf-Life
1. **Packaging Hierarchy**:
   - Default primary packaging is set to **50 kg fiber drums with food-grade LDPE liners** for pharmaceutical excipients, and **25 kg multi-wall laminated paper bags** for industrial grades.
2. **Retest & Expiry Dating**:
   - High-purity cellulose derivatives have a standard shelf-life of **36 months (3 years)** from the date of final packaging when stored in airtight containers below 30°C.

### 2.5 Dispatch & Customer Allocation
1. **FEFO Allocation Policy**:
   - Outbound sales order lines default to First-Expiry-First-Out (FEFO) allocation, falling back to FIFO if expiry dates are identical.
2. **Pre-Dispatch QC Verification**:
   - Only Finished Goods lots with active `AVAILABLE` status and released QA inspection certificates can be attached to a Dispatch Challan.

### 2.6 Accounts 3-Way Commercial Matching
1. **Matching Criteria**:
   - The automated 3-way match algorithm compares:
     1. Purchase Order Authorized Unit Price.
     2. GRN Accepted Net Quantity.
     3. Supplier Tax Invoice Billed Amount & GST breakdown.
2. **Tolerance Band**:
   - An automated variance tolerance of **$\pm 1.5\%$** is accepted to accommodate weighbridge decimal differences and fractional GST rounding.
   - Variances $> 1.5\%$ require explicit manual review and electronic sign-off by the Accounts Officer.

### 2.7 HPMC-P Batch Manufacturing Process & SOP: 176QA06 Flowchart Assumptions

1. **Source Document & Reference Standards**:
   - The initial directed workflow template is transcribed from **`PROCESS FLOWCHART – HPMC-P APPENDIX-A`** citing reference **`Ref. SOP: 176QA06`** and Document No. **`07`**.
   - **Critical Rule**: The photograph serves as an initial operational trace baseline, **not** as authority to execute live production. The template is provisioned in `DRAFT` status and must remain so until authorized company personnel confirm the sequence, raw material designations, setpoints, and approval rules.

2. **Full Workflow Nodes (27 Nodes)**:
   - **Incoming Materials & Preparation**:
     1. `NODE-01`: Raw Material Supplies (Category: `MATERIAL_RECEIPT`, Responsible: `STORES`, `WAREHOUSE_OFFICER`)
     2. `NODE-02`: Storage (Category: `STORAGE`, Responsible: `STORES`, `WAREHOUSE_OFFICER`)
     3. `NODE-03`: Raw Material QC (Category: `QUALITY_INSPECTION`, Responsible: `QA`, `QC_ANALYST`) — **Mandatory Control Point**
     4. `NODE-04`: Production Handover (Category: `MANUFACTURING_OPERATION`, Responsible: `PRODUCTION`, `PRODUCTION_SUPERVISOR`)
     5. `NODE-05`: Preheating — RM01 (Category: `PREPARATION`, Responsible: `PRODUCTION`, `OPERATOR`)
     6. `NODE-06`: RM02, RM03, RM04 Preparation (Category: `PREPARATION`, Responsible: `PRODUCTION`, `OPERATOR`)
     7. `NODE-07`: Drying (Category: `PREPARATION`, Responsible: `PRODUCTION`, `OPERATOR`)
     8. `NODE-08`: Cooking (Category: `MANUFACTURING_OPERATION`, Responsible: `PRODUCTION`, `OPERATOR`) — **Control Point: Time / Temperature**
     9. `NODE-09`: Maturation (Category: `MANUFACTURING_OPERATION`, Responsible: `PRODUCTION`, `OPERATOR`)
     10. `NODE-10`: Dissolution (Category: `MANUFACTURING_OPERATION`, Responsible: `PRODUCTION`, `OPERATOR`) — **Input: RM05 & RM07; Control Point: Time / Temperature**
     11. `NODE-11`: Filtration (Category: `MANUFACTURING_OPERATION`, Responsible: `PRODUCTION`, `OPERATOR`)
     12. `NODE-12`: Precipitation (Category: `MANUFACTURING_OPERATION`, Responsible: `PRODUCTION`, `OPERATOR`)
     13. `NODE-13`: Acid Washing (Category: `MANUFACTURING_OPERATION`, Responsible: `PRODUCTION`, `OPERATOR`) — **By-product branch to Acetic Acid Dilute**
     14. `NODE-14`: Refining Wash (Category: `MANUFACTURING_OPERATION`, Responsible: `PRODUCTION`, `OPERATOR`)
     15. `NODE-15`: Pusher Centrifuge Wash (Category: `MANUFACTURING_OPERATION`, Responsible: `PRODUCTION`, `OPERATOR`) — **Input: RM06; Control Point: pH / Acidity; Effluent Branch**
     16. `NODE-16`: FBD Drying (Category: `MANUFACTURING_OPERATION`, Responsible: `PRODUCTION`, `OPERATOR`)
   - **Quality Checks & Downstream Processing**:
     17. `NODE-17`: QC SF Testing (Category: `QUALITY_INSPECTION`, Responsible: `QA`, `QC_ANALYST`) — **Mandatory Control Point**
     18. `NODE-18`: Sieving (Category: `MANUFACTURING_OPERATION`, Responsible: `PRODUCTION`, `OPERATOR`)
     19. `NODE-19`: Milling (Category: `MANUFACTURING_OPERATION`, Responsible: `PRODUCTION`, `OPERATOR`)
     20. `NODE-20`: Blending (Category: `MANUFACTURING_OPERATION`, Responsible: `PRODUCTION`, `OPERATOR`)
     21. `NODE-21`: QC Viscosity (Category: `QUALITY_INSPECTION`, Responsible: `QA`, `QC_ANALYST`) — **Mandatory Control Point**
     22. `NODE-22`: Metal Detection (Category: `QUALITY_INSPECTION`, Responsible: `QA`, `QC_ANALYST`) — **Mandatory Control Point**
     23. `NODE-23`: Packing (Category: `PACKAGING`, Responsible: `PRODUCTION`, `OPERATOR`)
     24. `NODE-24`: Finished Goods (Category: `FINISHED_GOODS`, Responsible: `STORES`, `WAREHOUSE_OFFICER`)
     25. `NODE-25`: Sales / Finished Goods Handover (Category: `HANDOVER`, Responsible: `STORES`, `HEAD_OF_OPERATIONS`)
   - **Branch / By-Product Nodes**:
     26. `NODE-BYPROD-01`: Acetic Acid Dilute (Sales / Incineration / Refining) (Category: `WASTE_BYPRODUCT`) — **Marked Requires Verification**
     27. `NODE-EFFLUENT-01`: Effluent Treatment (ETP) (Category: `WASTE_BYPRODUCT`)

3. **Raw Material Master Mapping (RM01 to RM07)**:
   - `RM01`: Glacial Acetic Acid (CAS: 64-19-7)
   - `RM02`: Hydroxypropyl methylcellulose (HPMC) (CAS: 9004-65-3)
   - `RM03`: Sodium Acetate Anhydrous (CAS: 127-09-3)
   - `RM04`: Phthalic Anhydride (CAS: 85-44-9)
   - `RM05`: Hydrogen Peroxide (CAS: 7722-84-1)
   - `RM06`: Process Water (Purified) (CAS: 7732-18-5)
   - `RM07`: Water (dil AA) (Aqueous dilute acetic acid solution)
   - **Zero Recipe Guessing Rule**: The system strictly records material issuance against active warehouse lots. It does **not** assume stoichiometric ratios, dilution percentages (e.g. for RM07), or charging quantities.

4. **Critical Quality Gates & Unconfigured Specification Protection**:
   - The system tracks 7 critical control points:
     - `CP-01`: Raw Material Quality Release (Stage: `NODE-03`)
     - `CP-02`: Cooking Time & Temperature Profile (Stage: `NODE-08`)
     - `CP-03`: Dissolution Time & Temperature Profile (Stage: `NODE-10`)
     - `CP-04`: Pusher Centrifuge Wash pH & Residual Acidity (Stage: `NODE-15`)
     - `CP-05`: Semi-Finished SF Monograph Testing (Stage: `NODE-17`)
     - `CP-06`: In-Process Viscosity Verification (Stage: `NODE-21`)
     - `CP-07`: Metal Detection Verification (Stage: `NODE-22`)
   - **Safety Lock**: If plant QA has not populated and approved numerical setpoints/limits for any control point, the ERP displays `Specification Not Configured` and programmatically blocks stage sign-off.

5. **Side Branch Details & Verification Status**:
   - `EDGE-BYPROD-01` (`Acid Washing` -> `Acetic Acid Dilute`): Flagged as `requiresVerification = true`. The flowchart depicts a side stream terminating in "Sales / Incineration / Refining". Until plant engineering declares the commercial or environmental route, this edge is flagged for QA verification.
   - `EDGE-EFFLUENT-01` (`Pusher Centrifuge Wash` -> `Effluent Treatment`): Routed as an environmental by-product stream.
   - `EDGE-DISSOLUTION-INPUT` (`RM05 / RM07` -> `Dissolution`): Configured as material inputs rather than a sequential operation.

---

## 3. Operations Management Questionnaire & Confirmation Checklist

Please review the following items with the plant operations team at Deepak Cellulose Pvt. Ltd. to fine-tune production configurations:

| # | Question / Operational Decision | Current System Assumption | Preferred Plant Policy / Feedback |
|---|---|---|---|
| **1** | **Weighbridge Integration Protocol** | Manual entry from weighbridge indicator display with gross/tare calculation. | Does Deepak Cellulose have an automated RS-232/TCP digital weighbridge indicator (e.g., Avery Weigh-Tronix, Mettler Toledo) for direct serial capture? |
| **2** | **Solvent & Mother Liquor Recovery** | Solvents (ethanol/isopropanol) used in CMC washing are accounted for as single-charge inputs. | Is there an on-site solvent recovery / fractional distillation unit whose recovered alcohol stream needs secondary stock crediting? |
| **3** | **Moisture Compensation in Charging** | Pulp is charged on an as-is mass basis. | Does the reactor charging recipe require automated dry-weight compensation based on the specific lot's LOD (Loss on Drying) test result? |
| **4** | **Packaging Tare Deductions** | Drum and bag packaging weights are tracked as unit package counts. | Do you track pallet weights (wooden/plastic Euro pallets) separately on outbound dispatch weighbridge checks? |
| **5** | **Customer Specific Specifications** | Quality releases are evaluated against master product pharmacopeial monographs. | Do certain Tier-1 pharmaceutical customers have customized specification overrides (e.g., tighter viscosity ranges or specific microbiological limits) requiring customer-specific CoA templates? |
| **6** | **Batch Blending & Campaigning** | Each synthesis batch yields one corresponding Finished Goods Lot. | Are multiple reactor batches ever blended together in a ribbon blender/homogenizer to create a larger master composite shipping lot? |
| **7** | **GST & E-Way Bill Integration** | Generates compliant Delivery Challan numbers and dispatch registers. | Do you require direct API integration with the Indian GST E-Way Bill and E-Invoice portal (NIC / Cleartax / Masters India)? |

---

## 4. Sign-Off & Next Steps

Upon review by the Deepak Cellulose project committee:
1. Master formula tolerances and monograph specifications can be adjusted directly via the `/admin` and `/qc` master screens without code changes.
2. Custom inspection sheets and equipment logs can be created in the visual form builder (`/admin/forms`).
3. Additional user personas and departmental role hierarchies can be provisioned through the administrative dashboard.
