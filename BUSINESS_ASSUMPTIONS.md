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
