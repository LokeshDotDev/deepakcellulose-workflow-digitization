# DEEPAK CELLULOSE MANUFACTURING ERP & DIGITAL OPERATIONS MANAGEMENT SYSTEM

> **Enterprise Resource Planning (ERP) & Electronic Batch Manufacturing Records (eBMR)**  
> Purpose-built for **Deepak Cellulose Pvt. Ltd.** ([https://deepakcellulose.com/](https://deepakcellulose.com/))  
> Manufacturers of Microcrystalline Cellulose (MCC), Sodium Carboxymethyl Cellulose (Na-CMC), Hydroxypropyl Methylcellulose (HPMC), and Cellulose Derivatives.

---

## 1. Executive Summary

This enterprise application is a production-oriented, full-stack, configurable Manufacturing ERP designed specifically for specialty cellulose chemical and excipient manufacturing. It digitizes the complete **Inbound Material-to-Production-to-Dispatch Lifecycle** with strict pharmaceutical-grade quality gating, append-only double-entry inventory ledgering, end-to-end bi-directional batch traceability, dynamic electronic form builders, visual workflow state machines, and immutable audit trails.

### Core Business Objectives Achieved
1. **Zero Blind Spots**: Complete physical-to-financial visibility across 10 functional departments.
2. **Strict Quality Gating**: No raw material lot can be issued to a synthesis reactor without an authorized Quality Release Certificate.
3. **Electronic Batch Manufacturing Records (eBMR)**: Digital recipes, multi-stage synthesis tracking (Alkalization, Etherification, Neutralization, Washing, Fluid-Bed Drying, Milling, Sieving), yield variance monitoring, and automatic batch consumption issue slips.
4. **Bi-Directional Batch Genealogies**: Complete traceability from raw material supplier PO and security weighbridge entry, through chemical synthesis and QC releases, to customer dispatch challans and sales invoices.
5. **3-Way Commercial Invoice Matching**: Automated automated financial reconciliation comparing PO unit rates and quantities against GRN verified receipts and supplier tax invoices with configurable tolerance bands.
6. **No-Code Extensibility**: Visual Form Builder and Document Schema Manager supporting versioned custom fields and workflow stage overrides without schema migrations.

---

## 2. System Architecture & Tech Stack

- **Application Framework**: [Next.js](https://nextjs.org/) (App Router, Server Components & Route Handlers)
- **Database & ORM**: PostgreSQL 17 with [Prisma ORM](https://www.prisma.io/)
- **UI & Design System**: Tailwind CSS v4, Lucide Icons, Modern Data Tables, Responsive KPI Command Centers
- **Charts & Telemetry**: Recharts (Yield trends, stock valuations, stage completions)
- **Data Integrity & Validation**: Zod schema validation, React Hook Form, Decimal-safe mathematical calculations
- **Concurrency & Numbering**: Atomic database transactions (`prisma.$transaction`) with lock-safe sequential sequence generators
- **Testing**: Automated end-to-end domain test suite via Node.js test runner & `tsx`

---

## 3. Quick Start & Local Setup

### Prerequisites
- **Node.js**: v20 or higher
- **PostgreSQL**: Local or cloud PostgreSQL instance (version 14+)
- **Git**

### Installation Steps

1. **Clone & Enter Repository**:
   ```bash
   cd digitization
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Ensure your PostgreSQL connection string in `.env` is configured:
   ```env
   DATABASE_URL="postgresql://postgres:root@localhost:5432/deepak_cellulose_erp?schema=public"
   SESSION_SECRET="deepak_cellulose_secure_enterprise_erp_key_2026_super_secret"
   NODE_ENV="development"
   ```

4. **Initialize Database Schema**:
   Sync Prisma models to your PostgreSQL instance:
   ```bash
   npx prisma db push
   ```

5. **Seed Enterprise Master Data & Realistic Operations**:
   Populate all 10 departments, roles, users, UOMs, packaging types, raw materials, finished products, formulas, POs, Gate Entries, GRNs, quarantined & released lots, active BMR batches, and customer orders:
   ```bash
   npm run seed
   ```

6. **Run Domain Rule Integrity Tests**:
   Verify sequential numbering, UOM conversions, quality gating blocks, and ledger integrity:
   ```bash
   npm run test
   ```

7. **Launch Production or Dev Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 4. Persona Switcher & Department Credentials

The system includes a persistent **Demo Persona Switcher** at the top of every screen for friction-free department evaluation. You can also sign in via credentials. All pre-configured accounts share the default password: `demo123`.

| Department | Name | Persona Role | Email / Username | Default Password | Primary Responsibilities |
|---|---|---|---|---|---|
| **Executive Management** | Priya Shah | Super Admin & Director | `priya.shah@deepakcellulose.com` | `demo123` | Executive Command Center, Plant KPIs, Audit Logs, Master Config |
| **Purchase & Procurement** | Rajesh Patel | Purchase Manager | `rajesh.patel@deepakcellulose.com` | `demo123` | Supplier Master, Purchase Orders, Vendor Lead Times & Quotations |
| **Security & Gate** | Vikram Singh | Security Supervisor | `vikram.singh@deepakcellulose.com` | `demo123` | Inbound Vehicle Register, Weighbridge Gross/Tare/Net Gross Weight |
| **Raw Material Stores** | Amit Verma | Stores In-Charge | `amit.verma@deepakcellulose.com` | `demo123` | GRN Generation, Physical Inspection, Rack/Bin Binning, Stock Ledger |
| **Quality Control (QC/QA)** | Dr. Sneha Kulkarni | QC Lab Manager | `sneha.kulkarni@deepakcellulose.com` | `demo123` | Sample Testing, Monograph Validation, CoA & Release/Rejection |
| **Production & BMR** | Manoj Sharma | Production Superintendent | `manoj.sharma@deepakcellulose.com` | `demo123` | Production Orders, eBMR Recipes, Synthesis Execution, Reactor Charging |
| **Finished Goods Stores** | Suresh Nair | Warehouse Manager | `suresh.nair@deepakcellulose.com` | `demo123` | FG Lot Intake, Yield Reconciliations, Drum/Bag Palletizing |
| **Sales & Dispatch** | Anita Desai | Dispatch Coordinator | `anita.desai@deepakcellulose.com` | `demo123` | Customer Orders, Lot Picking, Dispatch Challans, Gate Pass Outbound |
| **Finance & Accounts** | Hitesh Mehta | Accounts Officer | `hitesh.mehta@deepakcellulose.com` | `demo123` | 3-Way Match (PO vs GRN vs Bill), Sales Invoicing, Ledger Reconciliation |
| **System Administration** | Priya Shah | Administrator | `priya.shah@deepakcellulose.com` | `demo123` | User Roles, Permissions, Dynamic Form Builder, State Machine Workflows |

---

## 5. Departmental Workflow & Feature Walkthrough

### 1. Executive Management Dashboard (`/`)
- Real-time KPI telemetry: Inbound POs, QC Hold Value, Active Synthesis Batches, Available FG Inventory.
- Pipeline Overview showing material flows across the 5 stages.
- Batch cycle-time gauges, yield variances, and stock valuation breakdown.
- Global instant search (Ctrl+K) indexed across all document types.

### 2. Purchase & Procurement (`/procurement`)
- Manage verified suppliers with GSTIN, PAN, lead-time profiles, and ISO/GMP ratings.
- Create multi-line Purchase Orders with tax breakdowns and custom delivery dates.
- Real-time fulfillment progress indicators tracking GRN receipts against ordered quantities.

### 3. Security Gate & Weighbridge (`/gate`)
- Digital Gate Register logging incoming transport carriers, transporter names, driver licenses, and e-way bill references.
- Integrated gross-to-tare weighbridge calculator producing verifiable net payload weights.
- Gate Pass dispatch to stores upon initial physical checklist verification.

### 4. Raw Material Warehouse Stores (`/warehouse`)
- Convert Security Gate passes into verified Goods Receipt Notes (GRN).
- Split receipts into discrete tracking lots with assigned warehouse bin/rack locations.
- Automatic creation of `RECEIVED_PENDING_QC` status quarantine lots with restricted movement flags.
- Immutable, double-entry stock movement ledger recording all movements, transfers, issues, and adjustments.

### 5. Quality Control & Quality Assurance (`/qc`)
- Automated QC testing queue populated as soon as materials are received at stores.
- Strict USP / EP / BP / TAPPI standard testing parameters (Assay %, Moisture/LOD %, Viscosity, pH, Heavy Metals).
- Formal Material Disposition authorization:
  - **APPROVED**: Issues Certificate of Analysis (CoA) and updates lot to `AVAILABLE`.
  - **REJECTED**: Generates Material Rejection Note (MRN) and places lot in physical quarantine lockup.
  - **CONCESSION / QUARANTINE**: Requires second-level QA Manager override.

### 6. Production & Electronic Batch Manufacturing Records (`/production`)
- Manage master BMR recipes with detailed bill-of-materials and sequential synthesis phases.
- Launch production batches against approved production orders.
- **Enforced Quality Gating**: Attempting to charge a quarantined, rejected, or uninspected lot throws an immediate validation exception.
- Step-by-step digital execution: Operator sign-off, equipment ID allocation, real-time reactor temperature/pressure tracking.
- Automated generation of internal Material Issue Slips and inventory ledger balance deductions.

### 7. Finished Goods Stores (`/finished-goods`)
- Accept finished batches into Finished Goods inventory (e.g. Pharma Grade MCC-101 50kg fiber drums).
- Automatic calculation of theoretical vs actual output yield variance percentage.
- Generates customer-grade Finished Goods Lots with manufacturer-defined retest/expiry dates.

### 8. Sales Allocation & Customer Dispatch (`/dispatch`)
- Manage customer purchase orders with target shipping schedules and payment terms.
- Allocate available released FG lots against open order lines with FIFO/FEFO rules.
- Generate physical Delivery Challans, Transport Gate Passes, and automated Sales Invoices.

### 9. Accounts & 3-Way Reconciliation (`/accounts`)
- Automated Commercial 3-Way Match comparing:
  - **Purchase Order**: Authorized rate and payment terms.
  - **Goods Receipt Note (GRN)**: Actual physically accepted net weight/quantity.
  - **Supplier Tax Invoice**: Billed amount, tax structure, and freight charges.
- Tolerance-based automated variance flags: Matches within ±1.5% pass automatically; outside tolerance triggers discrepancy hold for Accounts Manager approval.

### 10. End-to-End Batch Traceability & Genealogies (`/traceability`)
- Bi-directional visual lineage pipeline:
  $$\text{Supplier PO} \longrightarrow \text{Gate Inbound} \longrightarrow \text{Raw Material Lot} \longrightarrow \text{QC Testing} \longrightarrow \text{BMR Synthesis} \longrightarrow \text{FG Lot} \longrightarrow \text{Dispatch Challan} \longrightarrow \text{Customer}$$
- Immediate regulatory recall simulation: Search any batch or lot number to retrieve all involved components, operators, test results, and final recipient customers.

### 11. Dynamic Form Builder & Workflow Engine (`/admin/forms` & `/admin/workflows`)
- Visual drag-and-drop form definition builder for custom inspection checklists, incident forms, and maintenance logs.
- Schema versioning with live interactive preview.
- Configurable stage-based workflow definitions with automated transition guards.

### 12. Immutable Regulatory Audit Trail (`/audit`)
- Complete tamper-evident log recording user, timestamp, action type, IP address, and JSON diffs of before/after state.
- Compliant with GMP Annex 11 and 21 CFR Part 11 electronic records expectations.

---

## 6. Verification & Automated Testing

The repository includes automated domain integrity tests in `tests/erp.test.ts`. Run them anytime via:
```bash
npm run test
```

### Verified Test Cases:
1. **Sequential Numbering**: Thread-safe document code generation (`PO-YYYY-####`, `BMR-YYYY-####`).
2. **Dynamic UOM Conversion**: Accurate mass conversions (MT $\leftrightarrow$ KG $\leftrightarrow$ GM) using configurable database scaling factors.
3. **Cross-Dimensional Conversion Safety**: Blocks conversion between incompatible dimensions (e.g., Mass to Volume) unless material-specific density rules exist.
4. **Strict Quality Gating**: Throws hard rejection when attempting to allocate or consume unreleased/quarantined lots in manufacturing batches.
5. **Append-Only Inventory Ledger**: Asserts mathematical balance parity across all lot movements and verifies audit traceability.

---

## 7. License & Proprietary Notice

Developed for **Deepak Cellulose Pvt. Ltd.** All rights reserved. Configured with pharmaceutical & industrial manufacturing best practices.
