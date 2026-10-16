# DEEPAK CELLULOSE ERP — COMPREHENSIVE QA & END-TO-END TEST PLAN

> **Document Version**: 1.0.0  
> **Target Enterprise**: Deepak Cellulose Pvt. Ltd. (Vadodara Plant 1)  
> **Lead QA Architect**: Principal ERP Systems & Security Test Architect  
> **Test Environment**: Dedicated Neon PostgreSQL Test Database (`neondb_test`), Next.js App Router, Node.js Test Runner  

---

## 1. Objectives & Quality Standards
This QA and acceptance test plan establishes rigorous functional, transactional, security, and data integrity verification for the Deepak Cellulose Manufacturing ERP. 

### Key Quality Directives:
1. **Zero Production Risk**: Testing executes strictly against an isolated database (`neondb_test`). Production/demo data in `neondb` is protected against destructive operations, truncations, or schema drops.
2. **Deterministic Synthetic Test Data**: All testing entities (suppliers, customers, raw materials, excipient products, purchase orders, lots, batches, and delivery challans) are clearly prefixed with `TEST-` or `QA-SYNTH-`.
3. **ALCOA+ Compliance**: All tested transitions must verify **Attributability** (actor ID), **Legibility** (human-readable sequential IDs), **Contemporaneity** (system timestamps), **Originality** (append-only ledger), and **Accuracy** (exact Decimal precision).
4. **Programmatic Fail-Closed Gating**: Material consumption, batch completion, and dispatch releases must be physically blocked at the database and service layer if prerequisite quality inspections or specifications are missing or unapproved.

---

## 2. Testing Environment & Safety Architecture

```
                                  ENVIRONMENT TOPOLOGY
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                NEON POSTGRESQL CLUSTER                                 │
│                                                                                        │
│   ┌────────────────────────────────────────┐  ┌────────────────────────────────────┐   │
│   │       DEFAULT DATABASE: neondb         │  │   DEDICATED TEST DB: neondb_test   │   │
│   │  - Master Seed Data (10 Users)         │  │  - Isolated Clean Schema           │   │
│   │  - Active Demo Records                 │  │  - Target for all destructive tests│   │
│   │  - PROTECTED: No Truncation Allowed    │  │  - Reset & Fixture Isolation       │   │
│   └────────────────────────────────────────┘  └────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Safety Guarantee**: The test suite provisions a dedicated database client pointing to `neondb_test`.
- **Cleanup Strategy**: Test entities are grouped in isolated database transactions or tagged with `isTest: true` / `TEST-` identifiers for deterministic teardown.

---

## 3. Test Suite Organization & Modules

The test suite is structured into 7 modular, deterministic test files executed via the standard Node test runner:

| Suite / File | Focus Area | Scope & Coverage |
|---|---|---|
| `tests/erp.test.ts` | Core Business Rules & Integrity | Document numbering sequencing, UOM standard conversions, cross-dimension restrictions, quality gating, append-only stock movement ledger. |
| `tests/process-workflow.test.ts` | HPMC-P Batch Process Workflow | Raw material master (`RM01`–`RM07`), 27-node graph validation, unconfirmed connection audit, batch instantiation, missing spec release locks, parallel branch dependencies, immutable audit logs. |
| `tests/auth-permissions.test.ts` | Authentication & Departmental RBAC | 10 departmental roles, HMAC session tokens, permission enforcement, forbidden page/action blocks, unauthorized mutation rejection, session invalidation. |
| `tests/admin-config.test.ts` | Admin Configuration Engine | Dynamic form JSON schema builder, form versioning and archival, numbering sequence concurrency under parallel requests, units & conversion rules, workflow state machine. |
| `tests/e2e-business-lifecycle.test.ts` | Full Commercial-to-Batch Lifecycle | Deterministic 9-stage lifecycle: Setup $\to$ Procurement $\to$ Gate Entry $\to$ GRN $\to$ QC Release/Rejection $\to$ Batch Synthesis $\to$ FG Receipt $\to$ Customer Order & Dispatch $\to$ 3-Way Match & Reconciliation. |
| `tests/notifications-dashboards.test.ts` | Notifications & Management Dashboards | In-app notification creation, user recipient scoping, unread state persistence, dashboard operational metrics aggregation against PostgreSQL, CSV export serialization. |
| `tests/failures-concurrency.test.ts` | Concurrency & Negative Testing | Concurrent inventory reservations, double dispatch attempts, unreleased material consumption rejection, QC hold bypass attempts, negative inventory prevention, transaction rollback verification. |

---

## 4. Test Execution Strategy & Fixtures

### Reusable Test Helpers (`tests/helpers/test-fixtures.ts`):
- `getTestPrismaClient()`: Instantiates connection to `neondb_test`.
- `createTestUserSession(email, role)`: Generates signed HMAC session tokens mimicking browser cookie authentication.
- `seedCleanTestMasterData()`: Seeds standard units of measure, warehouses, and testing personas in an empty database.
- `createSyntheticMaterial(code, name)`: Generates test raw material record.
- `createSyntheticSupplier(name)`: Generates test vendor profile.
- `createSyntheticCustomer(name)`: Generates test customer profile.

---

## 5. Acceptance Criteria & Quality Gates

A release is marked **ACCEPTABLE** if and only if:
1. `prisma validate` passes with zero schema errors.
2. `npx prisma db push` synchronizes cleanly to the test database.
3. TypeScript compilation (`tsc --noEmit`) passes with zero errors.
4. ESLint runs with zero blocking errors.
5. All automated test suites in `tests/*.test.ts` pass (100% pass rate).
6. Next.js production build (`npm run build`) compiles with zero runtime bundle errors.
7. End-to-end material reconciliation proves exact mathematical conservation across ledger movements.
