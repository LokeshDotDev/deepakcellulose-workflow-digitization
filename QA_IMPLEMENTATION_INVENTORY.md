# DEEPAK CELLULOSE ERP — QA IMPLEMENTATION INVENTORY

> **Target Organization**: Deepak Cellulose Pvt. Ltd. (Vadodara Plant 1)  
> **Environment**: Next.js 16 (App Router), PostgreSQL 17 (Neon Serverless), Prisma ORM 6.19.3, TypeScript 5.0, Tailwind CSS 4.0  
> **Audit Status**: Comprehensive QA Inspection & Verification  
> **Generated Date**: October 2026  

---

## Classification Standards
Every component, route, API endpoint, domain service, entity model, and workflow is classified into one of the following exact statuses:
- **Implemented and Verified**: Backed by active database models, tested server-side logic, and functional UI or API contract.
- **Implemented but not Tested**: Source code and database models exist, but requires automated E2E test execution.
- **Partially Implemented**: Core database entity or UI exists, but certain secondary edge workflows (e.g., automated recurring background jobs, external SMS providers) are simulated or require future phase extensions.
- **UI-only or Mocked**: Interface elements exist without active database persistence or transactional business logic.
- **Missing**: Architectural component requested by domain operations but not yet coded.
- **Blocked by Configuration or Credentials**: Feature requires third-party API keys (e.g. GST E-Way Bill API, external SMTP server).

---

## 1. Authentication and User Management

| Item / Feature | Component / File Path | Database Entity | Status | Technical Details / Evidence |
|---|---|---|---|---|
| User Model & Password Hashing | `prisma/schema.prisma` | `User` | **Implemented and Verified** | Stores bcrypt password hashes, department link, active status, email uniqueness. |
| Session Token Signing & Validation | `lib/auth.ts` | Cookie `deepak_erp_session` | **Implemented and Verified** | Stateless HMAC-SHA256 signed session cookie with expiration; verified cryptographically. |
| Persona Switcher (Demo Mode) | `components/layout/DemoBanner.tsx`, `app/api/auth/switch-demo-user/route.ts` | `User`, `Role` | **Implemented and Verified** | One-click persona switcher across all 10 departmental roles; sets signed session cookie. |
| User Provisioning API | `app/api/admin/users/route.ts` | `User`, `UserRole` | **Implemented and Verified** | RBAC-protected endpoint (`SUPER_ADMIN` / `SYSTEM_ADMIN`) with audit logging. |
| User Directory View | `app/admin/page.tsx` | `User`, `Department`, `Role` | **Implemented and Verified** | Live list of active plant personnel, employee codes, departments, and roles. |
| Session Invalidation (Logout) | `lib/auth.ts` (`clearSession`) | Cookie | **Implemented and Verified** | Deletes `deepak_erp_session` cookie from request context. |

---

## 2. Departments, Roles, and Granular Permissions

| Item / Feature | Component / File Path | Database Entity | Status | Technical Details / Evidence |
|---|---|---|---|---|
| Department Hierarchy | `prisma/schema.prisma` | `Department` | **Implemented and Verified** | 10 departments (`ADMIN`, `PURCHASE`, `GATE`, `WAREHOUSE`, `QC`, `PRODUCTION`, `FINISHED_GOODS`, `DISPATCH`, `ACCOUNTS`, `MANAGEMENT`, plus `QA` code in enum). |
| Role Master | `prisma/schema.prisma`, `prisma/seed.ts` | `Role` | **Implemented and Verified** | 12 standard plant roles with system flags and descriptive scopes. |
| Granular Permission Codes | `prisma/schema.prisma` | `Permission`, `RolePermission` | **Implemented and Verified** | 110 permission combinations (`MODULE_ACTION` format across 10 modules and 11 verbs). |
| Role-Based Access Control Guards | `lib/auth.ts` (`requirePermission`, `checkPermission`) | Dynamic evaluation | **Implemented and Verified** | Server-side enforcement with wildcard `*` bypass for `SUPER_ADMIN`. |
| Departmental Navigation Scoping | `components/layout/AppSidebar.tsx` | Layout client | **Implemented and Verified** | Filters and renders sidebar navigation items by department domain. |

---

## 3. Master Data Management

| Item / Feature | Component / File Path | Database Entity | Status | Technical Details / Evidence |
|---|---|---|---|---|
| Raw Materials Master | `prisma/schema.prisma`, `prisma/seed.ts` | `Material` | **Implemented and Verified** | Chemical master including CAS numbers, storage temp, retest intervals, hazardous flags (`RM01`–`RM07`, etc.). |
| Finished Products Master | `prisma/schema.prisma`, `prisma/seed.ts` | `Product` | **Implemented and Verified** | Excipient monographs (MCC PH-101/102, Sodium CMC HV, HPMC-P). |
| Multi-Warehouse & Location Bins | `prisma/schema.prisma` | `Warehouse`, `WarehouseLocation` | **Implemented and Verified** | Storage facilities (Raw Material Store, Finished Goods Store, Quarantine Bin, Cold Room). |
| Commercial Partners (Suppliers) | `prisma/schema.prisma`, `app/procurement/page.tsx` | `Supplier` | **Implemented and Verified** | Vendor profiles with GSTIN, PAN, ISO certification status, approved vendor list. |
| Commercial Partners (Customers) | `prisma/schema.prisma`, `app/dispatch/page.tsx` | `Customer` | **Implemented and Verified** | Customer accounts with credit limits, delivery addresses, GSTIN. |
| Equipment Master | `prisma/schema.prisma` | `Equipment` | **Implemented and Verified** | Reactors, Fluid Bed Dryers, Pusher Centrifuges, Blenders, Metal Detectors with calibration dates. |
| Packaging Types | `prisma/schema.prisma` | `PackagingType` | **Implemented and Verified** | 50 kg fiber drums, 25 kg paper bags, HDPE carboys with tare weights. |

---

## 4. Dynamic Form Builder & No-Code Extensions

| Item / Feature | Component / File Path | Database Entity | Status | Technical Details / Evidence |
|---|---|---|---|---|
| Dynamic Form Schema Service | `server/services/dynamic-form.service.ts` | `FormDefinition`, `FormVersion` | **Implemented and Verified** | JSON-schema driven schema publisher with auto-incrementing versioning and previous version archival. |
| Form Designer UI | `app/admin/forms/page.tsx`, `FormBuilderClient.tsx` | `FormDefinition`, `FormVersion` | **Implemented and Verified** | Interactive builder with section management, field types (text, number, date, select, reference), and live preview. |
| Form Publishing API | `app/api/admin/forms/route.ts` | `FormVersion` | **Implemented and Verified** | Enforces admin privileges, persists schema JSON, and logs audit event. |

---

## 5. Document Template Builder & Document Numbering

| Item / Feature | Component / File Path | Database Entity | Status | Technical Details / Evidence |
|---|---|---|---|---|
| Concurrency-Safe Numbering Engine | `server/services/numbering.service.ts` | `NumberingSequence` | **Implemented and Verified** | Atomic `$transaction` with row-level lock and increment for sequential numbers (`PO-YYYY-####`, `GRN-YYYY-####`, `LOT-YYYY-#####`, `BMR-YYYY-####`, `DC-YYYY-####`). |
| Document Template Versioning | `prisma/schema.prisma` | `DocumentTemplate`, `DocumentTemplateVersion` | **Implemented but not Tested** | Relational schema models exist for storing document print layouts and header/footer configurations. |

---

## 6. Workflow Configuration Engine

| Item / Feature | Component / File Path | Database Entity | Status | Technical Details / Evidence |
|---|---|---|---|---|
| State Machine Engine | `server/services/workflow.service.ts` | `WorkflowDefinition`, `WorkflowVersion`, `WorkflowInstance`, `WorkflowTransitionHistory` | **Implemented and Verified** | Validates legal transitions, stage role restrictions, records step history, and updates instance states. |
| Workflow Administration Dashboard | `app/admin/workflows/page.tsx` | `WorkflowDefinition`, `WorkflowVersion` | **Implemented and Verified** | Visual matrix of configured stages, transition rules, and active workflow instances. |

---

## 7. Procurement & Purchase Orders

| Item / Feature | Component / File Path | Database Entity | Status | Technical Details / Evidence |
|---|---|---|---|---|
| Purchase Order Creation UI | `app/procurement/ProcurementActions.tsx` | `PurchaseOrder`, `PurchaseOrderLine` | **Implemented and Verified** | Multi-line procurement form with real-time tax calculation and supplier selection. |
| Purchase Order API | `app/api/procurement/orders/route.ts` | `PurchaseOrder`, `PurchaseOrderLine` | **Implemented and Verified** | Generates sequential PO number, computes subtotal and GST, records audit entry. |
| Procurement Pipeline Dashboard | `app/procurement/page.tsx` | `PurchaseOrder`, `Supplier` | **Implemented and Verified** | Tracks commitments, approval status, expected deliveries, line details. |
| Purchase Requisition (Pre-PO) | `prisma/schema.prisma` | Implicit via PO notes | **Partially Implemented** | PO workflow supports internal requisition notes; standalone requisition model is consolidated into PO lifecycle. |

---

## 8. Security Gate & Weighbridge Telemetry

| Item / Feature | Component / File Path | Database Entity | Status | Technical Details / Evidence |
|---|---|---|---|---|
| Gate Entry Logging UI | `app/gate/GateActions.tsx` | `GateEntry` | **Implemented and Verified** | Records vehicle number, driver details, supplier challan, gross and tare weighbridge readings. |
| Gate Entry API | `app/api/gate/route.ts` | `GateEntry` | **Implemented and Verified** | Computes net weighbridge weight, links optional PO, advances status to `SENT_TO_WAREHOUSE`. |
| Yard & Weighbridge Dashboard | `app/gate/page.tsx` | `GateEntry` | **Implemented and Verified** | Real-time queue of vehicles inside plant, weighbridge telemetry, and security clearance logs. |

---

## 9. Warehouse & Goods Receipt Note (GRN)

| Item / Feature | Component / File Path | Database Entity | Status | Technical Details / Evidence |
|---|---|---|---|---|
| Goods Receipt Service | `server/services/warehouse.service.ts` | `GoodsReceipt`, `GoodsReceiptLine` | **Implemented and Verified** | Atomic creation of GRN, inventory lots, and stock ledger entries; links Gate Pass and PO. |
| Goods Receipt API | `app/api/warehouse/grn/route.ts` | `GoodsReceipt` | **Implemented and Verified** | Validates warehouse and supplier inputs, returns complete GRN record. |
| Warehouse Operations Dashboard | `app/warehouse/page.tsx` | `GoodsReceipt`, `InventoryLot`, `InventoryLedgerEntry` | **Implemented and Verified** | Displays active inventory lots, bin locations, quarantine stock, and recent ledger entries. |
| Automatic QC Task Trigger | `server/services/warehouse.service.ts` (L118-L131) | `QCInspection` | **Implemented and Verified** | Generating a GRN automatically instantiates a `QCInspection` in `PENDING` status for the lot. |

---

## 10. Dynamic Unit of Measure (UOM) Conversions

| Item / Feature | Component / File Path | Database Entity | Status | Technical Details / Evidence |
|---|---|---|---|---|
| Standard Physical Conversions | `server/services/uom.service.ts` | `UnitOfMeasure` | **Implemented and Verified** | Converts within same dimension (MT $\to$ KG, GM $\to$ KG, LTR $\to$ ML) using base-unit scale factors. |
| Material-Specific Density Rules | `server/services/uom.service.ts` | `MaterialUnitConversion` | **Implemented and Verified** | Handles cross-dimensional conversions (e.g. liquid liters to kg) using specific gravity rules. |
| Cross-Dimension Failure Protection | `server/services/uom.service.ts` | Exception handler | **Implemented and Verified** | Throws error when attempting cross-dimension conversion without approved material rule. |

---

## 11. Quality Control & Analytical Monograph Testing

| Item / Feature | Component / File Path | Database Entity | Status | Technical Details / Evidence |
|---|---|---|---|---|
| QC Specifications & Monographs | `prisma/schema.prisma`, `prisma/seed.ts` | `QCSpecification`, `QCSpecificationParameter` | **Implemented and Verified** | Master monograph test thresholds (USP/IP/Ph. Eur. for MCC, CMC, HPMC). |
| Inspection Results Entry | `server/services/qc.service.ts` (`recordInspectionResults`) | `QCInspectionResult`, `QCInspection` | **Implemented and Verified** | Evaluates observed numerical/qualitative values against min/max; auto-flags conformance. |
| QC Workbench Dashboard | `app/qc/page.tsx` | `QCInspection`, `QCSpecification` | **Implemented and Verified** | Queue of incoming raw materials and finished goods awaiting lab analysis. |

---

## 12. Material Disposition & Quality Gating

| Item / Feature | Component / File Path | Database Entity | Status | Technical Details / Evidence |
|---|---|---|---|---|
| Material Disposition Service | `server/services/qc.service.ts` (`authorizeMaterialDisposition`) | `MaterialDisposition`, `InventoryLot` | **Implemented and Verified** | Authorizes `APPROVED_FOR_RELEASE` (moves lot to `AVAILABLE`), `REJECTED`, or `QUARANTINED`. |
| Disposition API | `app/api/qc/disposition/route.ts` | `MaterialDisposition` | **Implemented and Verified** | Generates CoA or MRN document number and writes append-only ledger transaction. |
| Fail-Closed Quality Gate | `server/services/production.service.ts` (L146-L151) | `InventoryLot` | **Implemented and Verified** | Programmatically blocks material consumption in manufacturing if lot status is not `AVAILABLE`. |

---

## 13. Production Formulas & Master BMR Recipes

| Item / Feature | Component / File Path | Database Entity | Status | Technical Details / Evidence |
|---|---|---|---|---|
| Master Formula Architecture | `prisma/schema.prisma`, `prisma/seed.ts` | `Formula`, `FormulaLine`, `FormulaStage` | **Implemented and Verified** | Defines standard chemical inputs, stage sequences (Alkalization, Etherification, Washing, Drying, Milling). |
| Formula Master View | `app/production/page.tsx` | `Formula` | **Implemented and Verified** | Displays approved recipe revisions, baseline batch sizes, and theoretical yield expectations. |

---

## 14. Production Orders & Batch Manufacturing (eBMR)

| Item / Feature | Component / File Path | Database Entity | Status | Technical Details / Evidence |
|---|---|---|---|---|
| Production Order Creation | `server/services/production.service.ts`, `app/api/production/orders/route.ts` | `ProductionOrder` | **Implemented and Verified** | Provisions production order linked to product, formula revision, and planned volume. |
| Batch Synthesis Instantiation | `server/services/production.service.ts` (`startBatchManufacturing`) | `Batch` | **Implemented and Verified** | Generates `BMR-YYYY-####` batch number and initializes operations and stage tracking. |
| eBMR Interactive Sheet | `app/production/batches/[id]/page.tsx`, `BMRClientActions.tsx` | `Batch`, `BatchMaterialConsumption` | **Implemented and Verified** | Detailed electronic batch record displaying operations, lot charging, and status lifecycle. |
| Material Consumption Service | `server/services/production.service.ts` (`consumeBatchMaterial`) | `BatchMaterialConsumption`, `InventoryLedgerEntry` | **Implemented and Verified** | Enforces QC release, deducts stock via ledger, records consumption variance and issue slip. |

---

## 15. HPMC-P Process Template (SOP 176QA06 Flowchart)

| Item / Feature | Component / File Path | Database Entity | Status | Technical Details / Evidence |
|---|---|---|---|---|
| Directed Workflow Graph Template | `server/services/process-workflow.service.ts` | `ProcessTemplate`, `ProcessTemplateVersion` | **Implemented and Verified** | Implements SOP `176QA06`, Document No. `07`, 27 nodes, 27 edges in `PT-HPMC-P`. |
| Raw Material References (RM01–RM07) | `server/services/process-workflow.service.ts` (`ensureMasterMaterials`) | `Material`, `ProcessNodeMaterial` | **Implemented and Verified** | Transcribes Glacial Acetic Acid, HPMC, Sodium Acetate, Phthalic Anhydride, H2O2, Purified Water, dil AA. |
| Side Streams & Environmental Branches | `server/services/process-workflow.service.ts` | `ProcessNodeDefinition`, `ProcessEdgeDefinition` | **Implemented and Verified** | Modeled `Acetic Acid Dilute (Sales/Incineration/Refining)` (flagged verification) and `Effluent Treatment`. |
| Graph Validation Engine | `server/services/process-workflow.service.ts` (`validateProcessGraph`) | Logic engine | **Implemented and Verified** | Rejects dangling edges, orphan nodes, self-loops, and flags unconfirmed connections for QA audit. |
| Super Admin Process Designer | `app/admin/process-templates/[id]/page.tsx`, `ProcessDesignerClient.tsx` | Visual canvas | **Implemented and Verified** | Interactive SVG node editor, zoom/pan, stage inspector, material mapper, and accessible matrix view. |
| Template Publishing & Versioning | `app/api/admin/process-templates/[id]/publish/route.ts` | `ProcessTemplateVersion` | **Implemented and Verified** | Validates graph, pins immutable published revision, archives previous versions. |

---

## 16. Stage Execution & Process Control Records

| Item / Feature | Component / File Path | Database Entity | Status | Technical Details / Evidence |
|---|---|---|---|---|
| Batch Process Execution Tracker | `app/production/batches/[id]/process/page.tsx`, `BatchProcessClient.tsx` | `BatchProcessExecution`, `BatchStageExecution` | **Implemented and Verified** | Live visual flowchart of active batch with color-coded stage execution statuses. |
| Stage Transition Service | `server/services/process-workflow.service.ts` (`transitionBatchStage`) | `BatchStageExecution` | **Implemented and Verified** | Evaluates prerequisites, unlocks parallel downstream nodes upon upstream completion. |
| Process Control Points (CCPs) | `prisma/schema.prisma`, `tests/process-workflow.test.ts` | `ProcessControlPoint` | **Implemented and Verified** | 7 CCPs (Cooking, Dissolution, Pusher Centrifuge, QC SF, QC Viscosity, Metal Detection). |
| Missing Spec Release Lock | `server/services/process-workflow.service.ts` (L752-L760) | Logic barrier | **Implemented and Verified** | Blocks stage completion when an unapproved control point displays `Specification Not Configured`. |
| Batch Deviation Logger | `app/api/production/batches/[id]/process/route.ts` | `BatchProcessDeviation` | **Implemented and Verified** | Records unplanned operational variances with severity, root cause, and immediate corrective actions. |

---

## 17. Finished Goods Warehouse & Yield Management

| Item / Feature | Component / File Path | Database Entity | Status | Technical Details / Evidence |
|---|---|---|---|---|
| Finished Goods Receipt Service | `server/services/finished-goods.service.ts` | `FinishedGoodsReceipt`, `FinishedGoodsLot` | **Implemented and Verified** | Creates FG lot in `PENDING_QC` status, computes synthesis yield variance, updates batch to `COMPLETED`. |
| Batch Completion API | `app/api/production/complete-batch/route.ts` | `FinishedGoodsReceipt` | **Implemented and Verified** | Binds package count, packaging type, and warehouse destination. |
| Finished Goods Store View | `app/finished-goods/page.tsx` | `FinishedGoodsLot`, `FinishedGoodsReceipt` | **Implemented and Verified** | Displays released vs quarantined FG inventory, warehouse bin racks, and expiry dating. |

---

## 18. Customer Orders & Sales Allocation

| Item / Feature | Component / File Path | Database Entity | Status | Technical Details / Evidence |
|---|---|---|---|---|
| Customer Sales Order Model | `prisma/schema.prisma`, `prisma/seed.ts` | `CustomerOrder`, `CustomerOrderLine` | **Implemented and Verified** | Stores customer PO number, ordered quantities, line pricing, and status. |
| Lot Reservation Engine | `server/services/dispatch.service.ts` (`createDispatchChallan`) | `FinishedGoodsLot`, `DispatchLotAllocation` | **Implemented and Verified** | Validates available unreserved stock, reserves quantity against customer order line. |
| Unreleased FG Dispatch Block | `server/services/dispatch.service.ts` (L74-L79) | Exception handler | **Implemented and Verified** | Throws error if finished goods lot status is not `QC_APPROVED` or `AVAILABLE`. |

---

## 19. Outbound Dispatch & Gate-Out Verification

| Item / Feature | Component / File Path | Database Entity | Status | Technical Details / Evidence |
|---|---|---|---|---|
| Dispatch Challan Creation | `app/dispatch/DispatchActions.tsx`, `app/api/dispatch/route.ts` | `Dispatch`, `DispatchLine` | **Implemented and Verified** | Records transporter, vehicle, driver, package count, and lot allocations. |
| Dispatch Confirmation & Stock Deduct | `server/services/dispatch.service.ts`, `app/api/dispatch/confirm/route.ts` | `Dispatch`, `InventoryLedgerEntry` | **Implemented and Verified** | Deducts physical inventory, writes append-only ledger transaction, marks order dispatched. |
| Automated Sales Invoice Generation | `server/services/dispatch.service.ts` (L238-L260) | `SalesInvoice` | **Implemented and Verified** | Generates commercial customer invoice upon gate-out exit confirmation. |
| Outbound Dispatch Dashboard | `app/dispatch/page.tsx` | `Dispatch`, `CustomerOrder` | **Implemented and Verified** | Real-time tracking of pending shipments, delivery challans, and vehicle assignments. |

---

## 20. Accounts & 3-Way Commercial Reconciliation

| Item / Feature | Component / File Path | Database Entity | Status | Technical Details / Evidence |
|---|---|---|---|---|
| Automated 3-Way Match Service | `server/services/accounts.service.ts` (`performThreeWayMatch`) | `SupplierInvoice`, `AccountsReconciliation` | **Implemented and Verified** | Compares PO Total vs Invoice Total and GRN Qty vs PO Qty; flags variances $> ₹1.00$. |
| Match Verification API | `app/api/accounts/verify-match/route.ts` | `SupplierInvoice` | **Implemented and Verified** | Triggers 3-way evaluation and generates discrepancy review record when mismatched. |
| Payment Status Tracking | `server/services/accounts.service.ts` (`recordPaymentStatus`) | `SupplierInvoice`, `SalesInvoice` | **Implemented and Verified** | Updates invoice status (`PENDING` $\to$ `PARTIAL` $\to$ `PAID`) with audit logging. |
| Commercial Finance Dashboard | `app/accounts/page.tsx` | `SupplierInvoice`, `SalesInvoice`, `AccountsReconciliation` | **Implemented and Verified** | Real-time commercial register showing match status, receivables, payables, and variances. |

---

## 21. Real-Time Notifications & Role Alerts

| Item / Feature | Component / File Path | Database Entity | Status | Technical Details / Evidence |
|---|---|---|---|---|
| Notification Model & API | `prisma/schema.prisma`, `server/services/audit.service.ts` | `Notification` | **Implemented and Verified** | In-app notification creation with user scoping, type (`INFO`, `WARNING`, `ACTION_REQUIRED`), and deep links. |
| Header Notification Center | `components/layout/AppHeader.tsx` | `Notification` | **Implemented and Verified** | Real-time unread badge, popover alert list, and direct workflow routing. |
| External SMS/Email Provider | `server/services/audit.service.ts` | External gateway | **Blocked by Credentials** | In-app notification engine is fully verified; external email/SMS requires production SMTP/SMS API credentials. |

---

## 22. Immutable Audit Trail (ALCOA+ Compliance)

| Item / Feature | Component / File Path | Database Entity | Status | Technical Details / Evidence |
|---|---|---|---|---|
| Audit Service | `server/services/audit.service.ts` (`logAuditEvent`) | `AuditLog` | **Implemented and Verified** | Records actor ID, email, name, action, entity type, entity ID, document number, and before/after diffs. |
| Central Audit Trail Explorer | `app/audit/page.tsx` | `AuditLog` | **Implemented and Verified** | Comprehensive filterable audit browser across all ERP actions with JSON state inspect. |

---

## 23. Universal Bi-Directional Batch Traceability

| Item / Feature | Component / File Path | Database Entity | Status | Technical Details / Evidence |
|---|---|---|---|---|
| End-to-End Genealogy Tree | `app/traceability/page.tsx` | Multi-tier relation | **Implemented and Verified** | Unified visual tree tracing backward to supplier PO/GRN and forward to customer dispatch. |
| Global Omnibox Search | `components/layout/GlobalSearchModal.tsx`, `app/api/search/route.ts` | Global query | **Implemented and Verified** | Instant `Ctrl+K` search across PO numbers, lot numbers, batches, customers, and suppliers. |

---

## 24. Operational Reports & Data Exports

| Item / Feature | Component / File Path | Database Entity | Status | Technical Details / Evidence |
|---|---|---|---|---|
| Departmental Reports Hub | `app/reports/page.tsx` | Aggregated views | **Implemented and Verified** | Production yields, raw material inventory valuation, quality test compliance, dispatch registers. |
| Client-Side CSV Exporter | `app/reports/ExportButton.tsx` | Blob download | **Implemented and Verified** | Sanitizes, formats, and downloads CSV spreadsheets for any tabular report. |

---

## 25. System Governance & Admin Control Center

| Item / Feature | Component / File Path | Database Entity | Status | Technical Details / Evidence |
|---|---|---|---|---|
| Central Admin Dashboard | `app/admin/page.tsx` | Master models | **Implemented and Verified** | High-level control panel for users, departments, units of measure, numbering sequences. |
| Process Template Designer | `app/admin/process-templates/page.tsx` | `ProcessTemplate` | **Implemented and Verified** | Management of manufacturing workflow graph definitions. |
