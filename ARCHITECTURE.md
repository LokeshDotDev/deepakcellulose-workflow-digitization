# DEEPAK CELLULOSE ERP — SYSTEM ARCHITECTURE SPECIFICATION

> **Technical Architecture, Domain Models, Concurrency Controls, and Security Standards**  
> **Entity**: Deepak Cellulose Pvt. Ltd.  
> **Stack**: Next.js (App Router, Server Components), PostgreSQL 17, Prisma ORM, TypeScript, Tailwind CSS

---

## 1. Architectural Philosophy & Design Principles

The Deepak Cellulose ERP architecture is engineered around the stringent regulatory and physical realities of chemical synthesis, pharmaceutical excipient manufacturing, and batch process operations.

### Key Architectural Pillars:

1. **Source of Truth in Relational Database**:
   All transactions, state transitions, stock allocations, and reconciliations are written directly to PostgreSQL with ACID isolation. No simulated memory state or client-side storage is utilized for business operations.

2. **Domain Service Encapsulation (`server/services/`)**:
   Application logic is strictly decoupled from UI routing and HTTP transport. Route handlers and Server Actions act as thin orchestration layers invoking strongly-typed domain services.

3. **Append-Only Double-Entry Inventory Ledger**:
   Inventory quantities on lots are never silently modified. Every movement (GRN intake, QC sampling, internal bin transfer, reactor charging, yield output, dispatch allocation) writes an immutable record to the `InventoryLedgerEntry` table with before and after balance snapshots and linked document numbers.

4. **Fail-Closed Quality Gating**:
   Quality release is not an advisory advisory check—it is a programmatic hard barrier. The database relation between `InventoryLot` and `BatchMaterialConsumption` enforces status validation: only lots with `status === "AVAILABLE"` and `isQuarantined === false` can be consumed.

5. **Universal End-to-End Traceability (ALCOA+ Compliant)**:
   Every batch can be traced bi-directionally across the physical supply chain:
   $$\text{Supplier PO} \longleftrightarrow \text{Gate Entry} \longleftrightarrow \text{GRN Lot} \longleftrightarrow \text{QC CoA} \longleftrightarrow \text{eBMR Synthesis} \longleftrightarrow \text{FG Lot} \longleftrightarrow \text{Dispatch Challan} \longleftrightarrow \text{Sales Invoice}$$

---

## 2. System Architecture & Component Diagram

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT TIER                                       |
|  - Next.js Responsive UI (App Router)                                             |
|  - Persona Switcher & Department Dashboards                                       |
|  - Dynamic Form Interactive Renderers & TanStack Tables                           |
+-----------------------------------------------------------------------------------+
                                         │  HTTPS / Cookies (HMAC Session)
                                         ▼
+-----------------------------------------------------------------------------------+
|                             NEXT.JS SERVER TIER                                   |
|  - Server Components (Direct DB Streaming)                                       |
|  - API Route Handlers (/api/*)                                                    |
|  - Session Validation & RBAC Middleware                                           |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                            DOMAIN SERVICE LAYER                                   |
|  ┌───────────────────────┬──────────────────────────┬───────────────────────────┐ |
|  │ NumberingService      │ DynamicUOMService        │ AuditLogService           │ |
|  ├───────────────────────┼──────────────────────────┼───────────────────────────┤ |
|  │ WarehouseService      │ QCService                │ ProductionService         │ |
|  ├───────────────────────┼──────────────────────────┼───────────────────────────┤ |
|  │ FinishedGoodsService  │ DispatchService          │ AccountsService           │ |
|  ├───────────────────────┼──────────────────────────┴───────────────────────────┤ |
|  │ WorkflowService       │ DynamicFormService                                   │ |
|  └───────────────────────┴──────────────────────────────────────────────────────┘ |
+-----------------------------------------------------------------------------------+
                                         │  Prisma ORM (Transactions & Connection Pool)
                                         ▼
+-----------------------------------------------------------------------------------+
|                           POSTGRESQL 17 STORAGE TIER                              |
|  - 40+ Relational Tables & Enums                                                   |
|  - Row-Level Locking & Unique Constraints                                         |
|  - Append-Only Audit Trail & Inventory Ledger                                     |
+-----------------------------------------------------------------------------------+
```

---

## 3. Database Domain Model & Key Entity Groups

The database schema (`prisma/schema.prisma`) comprises over 40 interconnected models organized into clear logical modules:

### 3.1 Organization & Identity Module
- **`Department`**: Organizational units (Purchase, Gate, Stores, QC, Production, FG, Dispatch, Accounts, Admin).
- **`User`**: System actors with hashed credentials, email, and departmental mapping.
- **`Role`** & **`Permission`**: Granular role-based access control permissions (e.g., `qc.release`, `bmr.charge`, `accounts.reconcile`).

### 3.2 Master Data & Configuration Module
- **`UnitOfMeasure`**: Configurable measurement units (KG, MT, GM, L, ML, DRUM, BAG) with base unit flags and scale factors.
- **`MaterialUnitConversion`**: Material-specific cross-dimensional rules (e.g. Caustic Soda Lye liters-to-kg by specific gravity).
- **`PackagingType`**: 50kg fiber drums, 25kg multi-wall paper bags, HDPE barrels.
- **`Material`**: Raw chemicals (wood pulp, caustic soda, MCA, hydrochloric acid, solvents) with CAS numbers, storage conditions, and retest rules.
- **`Product`**: Finished cellulose excipients (MCC Pharma 101/102, Sodium CMC High Viscosity, HPMC E15) with Pharmacopeia monographs.
- **`Warehouse`** & **`WarehouseLocation`**: Multi-facility zone, aisle, and bin rack allocations.
- **`Supplier`** & **`Customer`**: Commercial partner profiles with GSTIN, PAN, ISO certification, and credit terms.

### 3.3 Dynamic Schema & Workflow Module
- **`FormDefinition`** & **`FormVersion`**: JSON-schema driven flexible forms for custom inspection sheets, BMR step notes, and incident reports.
- **`WorkflowDefinition`** & **`WorkflowInstance`**: State machine definitions with transition guards, permitted roles, and state histories.
- **`NumberingSequence`**: Thread-safe document counter table maintaining sequence numbers per document type and financial year.

### 3.4 Inbound Supply & Inventory Module
- **`PurchaseOrder`** & **`PurchaseOrderLine`**: Authorized procurement agreements with tax and delivery parameters.
- **`GateEntry`**: Physical vehicle check-in with gross and tare weighbridge telemetry.
- **`GoodsReceipt`** & **`GoodsReceiptLine`**: Accepted quantities, vendor invoice cross-references, and storekeeper signoffs.
- **`InventoryLot`**: Discrete physical lots with statuses (`RECEIVED_PENDING_QC`, `UNDER_TESTING`, `AVAILABLE`, `QUARANTINED`, `REJECTED`, `EXHAUSTED`).
- **`InventoryLedgerEntry`**: Immutable historical balance ledger capturing quantity delta, previous balance, new balance, transaction type, and reference ID.

### 3.5 Quality Control Module
- **`QCSpecification`** & **`QCParameter`**: Pharmacopeia-standard test thresholds (minimum, maximum, target, analytical method).
- **`QCInspection`** & **`QCInspectionResult`**: Sample logging, lab test values, and analyst sign-offs.
- **`MaterialDisposition`**: Authorized quality decisions (Release, Rejection, Quarantine) with generated CoA or MRN documentation.

### 3.6 Production & Electronic BMR Module
- **`Formula`** & **`FormulaItem`**: Master BMR chemical recipes with theoretical yield constants and stage descriptions.
- **`ProductionOrder`**: Authorized factory production orders linked to target finished products.
- **`Batch`**: Unique synthesis manufacturing batch (e.g. `BMR-2026-0042`) tracking start time, end time, and operator supervisor.
- **`BatchMaterialConsumption`**: Reactor charge logs binding raw material lots, actual charged quantities, variance, and internal issue slips.
- **`BatchOperation`**: Step-by-step synthesis phases (Alkalization, Etherification, Neutralization, Washing, Fluid Bed Drying, Milling, Sieving).

### 3.7 Finished Goods & Outbound Dispatch Module
- **`FinishedGoodsReceipt`**: Yield capture comparing theoretical vs actual synthesis output.
- **`FinishedGoodsLot`**: Customer-facing finished lots with test certificates, manufacture dates, and expiry dates.
- **`CustomerOrder`** & **`CustomerOrderLine`**: Sales contracts and delivery requests.
- **`Dispatch`** & **`DispatchLine`**: Delivery Challan generation, vehicle assignment, and gate-outward verification.
- **`FGAllocation`**: Lot reservation ensuring FEFO/FIFO customer fulfillment.

### 3.8 Finance & Reconciliation Module
- **`SupplierInvoice`**: Commercial billing from raw material suppliers.
- **`SalesInvoice`**: Outbound customer commercial invoices.
- **`AccountsReconciliation`**: Automated 3-way commercial match verifying quantity parity between PO, GRN, and Bill.

### 3.9 Audit & Telemetry Module
- **`AuditLog`**: Tamper-evident trail with actor ID, entity name, entity ID, action, before/after JSON diffs, and timestamp.
- **`Notification`**: Role-based alert notifications for quality quarantine, approval requests, and shipment milestones.

---

## 4. Service Layer Specifications

Located in `server/services/`, each service isolates core domain mechanics:

### 1. `NumberingService` (`numbering.service.ts`)
- Implements concurrency-safe sequential code generation using PostgreSQL transactions:
  ```typescript
  export async function generateDocumentNumber(type: string, prefix?: string): Promise<string>
  ```
- Formats document numbers with financial year and zero-padded counters (e.g. `PO-2026-0103`, `BMR-2026-0043`).

### 2. `DynamicUOMService` (`uom.service.ts`)
- Validates dimensional compatibility (Mass $\to$ Mass, Volume $\to$ Volume).
- Converts quantities using standard scale factors (`1 MT = 1,000 KG`, `1 KG = 1,000 GM`).
- Enforces material-specific density lookups for cross-dimensional conversions (e.g., L to KG for liquids).

### 3. `WarehouseService` (`warehouse.service.ts`)
- Manages GRN generation and lot creation.
- Enforces append-only double-entry balance updates on `InventoryLedgerEntry`.
- Automatically places newly received stock into `RECEIVED_PENDING_QC` quarantine hold.

### 4. `QCService` (`qc.service.ts`)
- Evaluates analytical test results against monograph criteria.
- Authorizes material dispositions: updates lot status to `AVAILABLE` on release or `REJECTED` on failure.
- Auto-generates Certificate of Analysis (CoA) or Material Rejection Note (MRN).

### 5. `ProductionService` (`production.service.ts`)
- Enforces **Fail-Closed Quality Gating**:
  ```typescript
  if (lot.status !== "AVAILABLE" || lot.isQuarantined) {
    throw new Error(`Quality Gating Violation: Lot ${lot.lotNumber} is in status ${lot.status} and cannot be consumed in production.`);
  }
  ```
- Decrements inventory stock via ledger, records actual consumption, and updates batch stage completions.

### 6. `FinishedGoodsService` (`finished-goods.service.ts`)
- Accepts completed synthesis batches into Finished Goods inventory.
- Calculates yield variance: $\text{Variance} = \frac{\text{Actual} - \text{Theoretical}}{\text{Theoretical}} \times 100$.
- Automatically schedules finished goods quality testing.

### 7. `DispatchService` (`dispatch.service.ts`)
- Reserves and locks FG lots for sales orders.
- Generates outbound delivery challans and deducts physical warehouse inventory upon gate-out exit.
- Triggers automated sales invoicing.

### 8. `AccountsService` (`accounts.service.ts`)
- Performs Automated 3-Way Match:
  $$\Delta_{\text{Qty}} = |\text{GRN Accepted Qty} - \text{PO Ordered Qty}|$$
  $$\Delta_{\text{Rate}} = |\text{Supplier Invoiced Rate} - \text{PO Rate}|$$
- If discrepancies exceed configured tolerance (e.g. 1.5%), the invoice is flagged for manual finance review.

---

## 5. Security & Authentication Architecture

- **Session Architecture**:
  - Stateless HMAC-SHA256 signed cookie (`deepak_erp_session`).
  - Contains user ID, role code, department code, and expiration timestamp.
  - No plaintext credentials stored in browser state.
- **Role-Based Access Control (RBAC)**:
  - Permissions model allows declarative capability queries (`hasPermission(user, 'qc.release')`).
  - Route handlers check permissions before executing service actions.
- **Tamper-Evident Audit Trail**:
  - Every write transaction invokes `createAuditLog()` recording the actor, entity, operation, IP address, and JSON before/after state diffs.

---

## 6. Dynamic Form Engine & No-Code Extensibility

The system includes a zero-migration dynamic schema engine:
- **`FormDefinition`**: Stores document type metadata (e.g., `QC_INSPECTION_SHEET`, `SAFETY_INCIDENT`).
- **`FormVersion`**: Stores a versioned JSON array of field configurations:
  ```json
  [
    { "name": "moisture_content", "label": "Moisture / LOD (%)", "type": "number", "required": true, "validation": { "min": 0, "max": 7.0 } },
    { "name": "analyst_observations", "label": "Analyst Observations", "type": "textarea", "required": false }
  ]
  ```
- **Live Preview & Validation**: The UI renders these fields dynamically and validates user input using runtime schema evaluation.

---

## 7. Quality & Data Integrity Compliance (GMP / 21 CFR Part 11)

To support pharmaceutical and food-grade excipient standards (IP/BP/USP/EP):
- **ALCOA+ Compliance**:
  - **Attributable**: Every transaction records the specific user persona and digital signature.
  - **Legible**: Human-readable sequential identifiers and audit logs.
  - **Contemporaneous**: Automatic timestamps created by database clock (`DEFAULT CURRENT_TIMESTAMP`).
  - **Original**: Append-only ledger entries preserving initial records.
  - **Accurate**: Strict mathematical rounding and Decimal representation preventing floating-point drift.
