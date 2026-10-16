import { PrismaClient, DepartmentCode, UnitType, MaterialType, WarehouseType, PurchaseOrderStatus, GateEntryStatus, GoodsReceiptStatus, InventoryLotStatus, InventoryTransactionType, QCSpecificationTarget, QCInspectionStatus, DispositionType, ProductionOrderStatus, BatchStatus, CustomerOrderStatus, DispatchStatus, ThreeWayMatchStatus, PaymentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const isTest = process.env.NODE_ENV === "test";
const dbUrl = isTest && process.env.TEST_DATABASE_URL
  ? process.env.TEST_DATABASE_URL
  : process.env.DATABASE_URL;

const prisma = new PrismaClient({
  datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
});

async function main() {
  console.log("🌱 Starting Deepak Cellulose ERP Database Seed...");

  // 1. CLEAN UP EXISTING DATA IN PROPER ORDER
  console.log("Cleaning up previous data...");
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.attachment.deleteMany({});
  await prisma.accountsReconciliation.deleteMany({});
  await prisma.salesInvoice.deleteMany({});
  await prisma.supplierInvoice.deleteMany({});
  await prisma.dispatchLotAllocation.deleteMany({});
  await prisma.dispatchLine.deleteMany({});
  await prisma.dispatch.deleteMany({});
  await prisma.customerOrderLine.deleteMany({});
  await prisma.customerOrder.deleteMany({});
  await prisma.finishedGoodsLot.deleteMany({});
  await prisma.finishedGoodsReceipt.deleteMany({});
  await prisma.batchDeviation.deleteMany({});
  await prisma.batchOperation.deleteMany({});
  await prisma.batchMaterialConsumption.deleteMany({});
  await prisma.batch.deleteMany({});
  await prisma.productionOrder.deleteMany({});
  await prisma.formulaStage.deleteMany({});
  await prisma.formulaLine.deleteMany({});
  await prisma.formula.deleteMany({});
  await prisma.materialDisposition.deleteMany({});
  await prisma.qCInspectionResult.deleteMany({});
  await prisma.qCInspection.deleteMany({});
  await prisma.qCSpecificationParameter.deleteMany({});
  await prisma.qCSpecification.deleteMany({});
  await prisma.inventoryLedgerEntry.deleteMany({});
  await prisma.inventoryLot.deleteMany({});
  await prisma.goodsReceiptLine.deleteMany({});
  await prisma.goodsReceipt.deleteMany({});
  await prisma.gateEntry.deleteMany({});
  await prisma.purchaseOrderLine.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  await prisma.workflowTransitionHistory.deleteMany({});
  await prisma.workflowInstance.deleteMany({});
  await prisma.workflowVersion.deleteMany({});
  await prisma.workflowDefinition.deleteMany({});
  await prisma.documentTemplateVersion.deleteMany({});
  await prisma.documentTemplate.deleteMany({});
  await prisma.formVersion.deleteMany({});
  await prisma.formDefinition.deleteMany({});
  await prisma.numberingSequence.deleteMany({});
  await prisma.equipment.deleteMany({});
  await prisma.warehouseLocation.deleteMany({});
  await prisma.warehouse.deleteMany({});
  await prisma.packagingType.deleteMany({});
  await prisma.materialUnitConversion.deleteMany({});
  await prisma.material.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.unitOfMeasure.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.rolePermission.deleteMany({});
  await prisma.permission.deleteMany({});
  await prisma.userRole.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.department.deleteMany({});

  console.log("✓ Existing records purged.");

  // 2. NUMBERING SEQUENCES
  console.log("Seeding Numbering Sequences...");
  const numberingSequences = [
    { entityType: "PURCHASE_ORDER", prefix: "PO", yearFormat: "YYYY", currentNumber: 104, paddingLength: 4 },
    { entityType: "GATE_ENTRY", prefix: "GE", yearFormat: "YYYY", currentNumber: 88, paddingLength: 4 },
    { entityType: "GOODS_RECEIPT", prefix: "GRN", yearFormat: "YYYY", currentNumber: 76, paddingLength: 4 },
    { entityType: "INVENTORY_LOT", prefix: "LOT", yearFormat: "YYYY", currentNumber: 215, paddingLength: 5 },
    { entityType: "QC_INSPECTION", prefix: "QC", yearFormat: "YYYY", currentNumber: 62, paddingLength: 4 },
    { entityType: "MATERIAL_DISPOSITION", prefix: "DISP", yearFormat: "YYYY", currentNumber: 59, paddingLength: 4 },
    { entityType: "PRODUCTION_ORDER", prefix: "PRD", yearFormat: "YYYY", currentNumber: 42, paddingLength: 4 },
    { entityType: "BATCH", prefix: "BMR", yearFormat: "YYYY", currentNumber: 42, paddingLength: 4 },
    { entityType: "FINISHED_GOODS_RECEIPT", prefix: "FGR", yearFormat: "YYYY", currentNumber: 39, paddingLength: 4 },
    { entityType: "CUSTOMER_ORDER", prefix: "SO", yearFormat: "YYYY", currentNumber: 51, paddingLength: 4 },
    { entityType: "DISPATCH", prefix: "DC", yearFormat: "YYYY", currentNumber: 34, paddingLength: 4 },
    { entityType: "SALES_INVOICE", prefix: "INV", yearFormat: "YYYY", currentNumber: 34, paddingLength: 4 },
    { entityType: "STOCK_TRANSFER", prefix: "STN", yearFormat: "YYYY", currentNumber: 18, paddingLength: 4 },
    { entityType: "STOCK_ADJUSTMENT", prefix: "ADJ", yearFormat: "YYYY", currentNumber: 12, paddingLength: 4 },
  ];
  for (const seq of numberingSequences) {
    await prisma.numberingSequence.create({ data: seq });
  }

  // 3. DEPARTMENTS
  console.log("Seeding Departments...");
  const departmentsData = [
    { code: DepartmentCode.ADMIN, name: "System Administration", description: "System config, security & master governance" },
    { code: DepartmentCode.PURCHASE, name: "Procurement & Sourcing", description: "Vendor management, purchase requisitions & purchase orders" },
    { code: DepartmentCode.GATE, name: "Security Gate & Logistics Entry", description: "Vehicle entry, weighbridge verification & security clearance" },
    { code: DepartmentCode.WAREHOUSE, name: "Raw Materials & Stores", description: "Goods receipt, bin storage & production staging" },
    { code: DepartmentCode.QC, name: "Quality Control & Assurance", description: "Specification tests, chemical assays & batch releases" },
    { code: DepartmentCode.PRODUCTION, name: "Manufacturing & Processing", description: "Formula execution, batch processing & yield controls" },
    { code: DepartmentCode.FINISHED_GOODS, name: "Finished Goods Warehouse", description: "Finished lots quarantine, palletizing & storage" },
    { code: DepartmentCode.DISPATCH, name: "Dispatch & Commercial Logistics", description: "Customer order allocation, challans & transport" },
    { code: DepartmentCode.ACCOUNTS, name: "Finance & Commercial Reconciliation", description: "3-way matching, invoice tracking & receivables" },
    { code: DepartmentCode.MANAGEMENT, name: "Executive Leadership & Operations", description: "Cross-departmental KPIs, yields & audit oversight" },
  ];

  const depts: Record<string, any> = {};
  for (const d of departmentsData) {
    depts[d.code] = await prisma.department.create({ data: d });
  }

  // 4. ROLES & PERMISSIONS
  console.log("Seeding Roles and Permissions...");
  const modules = ["PURCHASE", "GATE", "WAREHOUSE", "QC", "PRODUCTION", "FINISHED_GOODS", "DISPATCH", "ACCOUNTS", "ADMIN", "REPORTS"];
  const actions = ["VIEW", "CREATE", "EDIT", "SUBMIT", "APPROVE", "REJECT", "CANCEL", "RELEASE", "REVERSE", "EXPORT", "CONFIGURE"];

  const createdPermissions: Record<string, string> = {};
  for (const mod of modules) {
    for (const act of actions) {
      const code = `${mod}_${act}`;
      const perm = await prisma.permission.create({
        data: {
          code,
          module: mod,
          action: act,
          description: `Can ${act} within ${mod} domain`,
        },
      });
      createdPermissions[code] = perm.id;
    }
  }

  const rolesData = [
    { code: "SUPER_ADMIN", name: "Super Administrator", description: "Unrestricted system-wide configuration and governance", isSystem: true },
    { code: "SYSTEM_ADMIN", name: "System Administrator", description: "System configuration, user management & workflows", isSystem: true },
    { code: "PURCHASE_MANAGER", name: "Purchase Manager", description: "Procurement approvals, PO creation & vendor management" },
    { code: "GATE_OPERATOR", name: "Security Gate Operator", description: "Vehicle entries, driver check-in & weighbridge readings" },
    { code: "WAREHOUSE_MANAGER", name: "Warehouse Manager", description: "Goods receipts, inventory movements & stock transfers" },
    { code: "QC_MANAGER", name: "QC Manager", description: "QC specifications, inspection approvals & material release notes" },
    { code: "QC_INSPECTOR", name: "QC Inspector", description: "Sample testing, parameter recording & in-process checks" },
    { code: "PRODUCTION_MANAGER", name: "Production Manager", description: "Formula approvals, production orders & batch supervision" },
    { code: "FG_MANAGER", name: "Finished Goods Manager", description: "Finished lots receipt, storage & dispatch reservation" },
    { code: "DISPATCH_MANAGER", name: "Dispatch Manager", description: "Customer order fulfillment, challans & transporter allocation" },
    { code: "ACCOUNTS_MANAGER", name: "Accounts Manager", description: "3-way commercial match, payment status & invoice tracking" },
    { code: "MANAGEMENT_VIEWER", name: "Management Executive", description: "Cross-departmental KPIs, audit trails & reports oversight" },
  ];

  const roles: Record<string, any> = {};
  for (const r of rolesData) {
    roles[r.code] = await prisma.role.create({ data: r });
  }

  // Assign permissions to SUPER_ADMIN (All permissions)
  for (const pId of Object.values(createdPermissions)) {
    await prisma.rolePermission.create({
      data: { roleId: roles["SUPER_ADMIN"].id, permissionId: pId },
    });
  }

  // 5. USERS & CREDENTIALS
  console.log("Seeding Demo Users...");
  const defaultPasswordHash = await bcrypt.hash("demo123", 10);

  const demoUsers = [
    { email: "admin@deepakcellulose.com", fullName: "Priya Shah", employeeCode: "DC-001", dept: DepartmentCode.ADMIN, role: "SUPER_ADMIN" },
    { email: "purchase@deepakcellulose.com", fullName: "Rajesh Mehta", employeeCode: "DC-012", dept: DepartmentCode.PURCHASE, role: "PURCHASE_MANAGER" },
    { email: "gate@deepakcellulose.com", fullName: "Vikram Singh", employeeCode: "DC-024", dept: DepartmentCode.GATE, role: "GATE_OPERATOR" },
    { email: "warehouse@deepakcellulose.com", fullName: "Anil Sharma", employeeCode: "DC-031", dept: DepartmentCode.WAREHOUSE, role: "WAREHOUSE_MANAGER" },
    { email: "qc@deepakcellulose.com", fullName: "Dr. Sunita Patel", employeeCode: "DC-045", dept: DepartmentCode.QC, role: "QC_MANAGER" },
    { email: "production@deepakcellulose.com", fullName: "Manoj Joshi", employeeCode: "DC-052", dept: DepartmentCode.PRODUCTION, role: "PRODUCTION_MANAGER" },
    { email: "fg@deepakcellulose.com", fullName: "Sanjay Verma", employeeCode: "DC-063", dept: DepartmentCode.FINISHED_GOODS, role: "FG_MANAGER" },
    { email: "dispatch@deepakcellulose.com", fullName: "Amit Dave", employeeCode: "DC-071", dept: DepartmentCode.DISPATCH, role: "DISPATCH_MANAGER" },
    { email: "accounts@deepakcellulose.com", fullName: "Rakesh Trivedi", employeeCode: "DC-082", dept: DepartmentCode.ACCOUNTS, role: "ACCOUNTS_MANAGER" },
    { email: "management@deepakcellulose.com", fullName: "Deepak Parikh", employeeCode: "DC-099", dept: DepartmentCode.MANAGEMENT, role: "MANAGEMENT_VIEWER" },
  ];

  const users: Record<string, any> = {};
  for (const u of demoUsers) {
    const user = await prisma.user.create({
      data: {
        email: u.email,
        fullName: u.fullName,
        employeeCode: u.employeeCode,
        passwordHash: defaultPasswordHash,
        departmentId: depts[u.dept].id,
      },
    });
    users[u.email] = user;

    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: roles[u.role].id,
      },
    });
  }

  // 6. UNITS OF MEASURE
  console.log("Seeding Units of Measure...");
  const uomData = [
    { code: "KG", name: "Kilogram", type: UnitType.MASS, conversionFactorToBase: 1.0, precision: 3 },
    { code: "MT", name: "Metric Tonne", type: UnitType.MASS, conversionFactorToBase: 1000.0, precision: 3 },
    { code: "GM", name: "Gram", type: UnitType.MASS, conversionFactorToBase: 0.001, precision: 2 },
    { code: "LTR", name: "Litre", type: UnitType.VOLUME, conversionFactorToBase: 1.0, precision: 2 },
    { code: "ML", name: "Millilitre", type: UnitType.VOLUME, conversionFactorToBase: 0.001, precision: 1 },
    { code: "DRUM", name: "Drum", type: UnitType.PACKAGING, conversionFactorToBase: 1.0, precision: 0 },
    { code: "BAG", name: "Bag", type: UnitType.PACKAGING, conversionFactorToBase: 1.0, precision: 0 },
    { code: "PCS", name: "Pieces", type: UnitType.COUNT, conversionFactorToBase: 1.0, precision: 0 },
  ];

  const uoms: Record<string, any> = {};
  for (const u of uomData) {
    uoms[u.code] = await prisma.unitOfMeasure.create({ data: u });
  }

  // 7. PACKAGING TYPES
  console.log("Seeding Packaging Types...");
  const packTypes = [
    { code: "FIBER_DRUM_50KG", name: "Fiber Drum with Inner Poly Liner 50KG", capacity: 50.0, unitId: uoms["KG"].id },
    { code: "HDPE_BAG_25KG", name: "Multiwall Laminated Paper/HDPE Bag 25KG", capacity: 25.0, unitId: uoms["KG"].id },
    { code: "CORRUGATED_BOX_20KG", name: "Corrugated Carton 20KG", capacity: 20.0, unitId: uoms["KG"].id },
    { code: "PALLET_1000KG", name: "Wooden Heat-Treated Pallet 1000KG", capacity: 1000.0, unitId: uoms["KG"].id },
  ];
  const packaging: Record<string, any> = {};
  for (const p of packTypes) {
    packaging[p.code] = await prisma.packagingType.create({ data: p });
  }

  // 8. WAREHOUSES & LOCATIONS
  console.log("Seeding Warehouses and Bins...");
  const whRM = await prisma.warehouse.create({
    data: {
      code: "WH-RM-01",
      name: "Central Raw Material Warehouse",
      type: WarehouseType.RAW_MATERIAL,
      address: "Deepak Cellulose Plant 1, Plot 42, GIDC Industrial Estate, Nandesari, Vadodara, Gujarat",
    },
  });

  const whQUAR = await prisma.warehouse.create({
    data: {
      code: "WH-QUAR-01",
      name: "QC Quarantine & Inspection Hold",
      type: WarehouseType.QUARANTINE,
      address: "Deepak Cellulose Plant 1 - Bay 0 (Controlled Access)",
    },
  });

  const whFG = await prisma.warehouse.create({
    data: {
      code: "WH-FG-01",
      name: "Finished Goods Climate-Controlled Store",
      type: WarehouseType.FINISHED_GOODS,
      address: "Deepak Cellulose Logistics Hub, Bay 3",
    },
  });

  const locRM1 = await prisma.warehouseLocation.create({
    data: { warehouseId: whRM.id, code: "RACK-A1-BIN01", zone: "Zone A - Wood Pulp", rack: "A1", bin: "BIN01", maxCapacity: 25000 },
  });
  const locRM2 = await prisma.warehouseLocation.create({
    data: { warehouseId: whRM.id, code: "RACK-B1-BIN01", zone: "Zone B - Chemical Store", rack: "B1", bin: "BIN01", maxCapacity: 10000 },
  });
  const locQuar1 = await prisma.warehouseLocation.create({
    data: { warehouseId: whQUAR.id, code: "QUAR-STAGING-01", zone: "Quarantine Bay", rack: "Q1", bin: "BIN01", maxCapacity: 15000 },
  });
  const locFG1 = await prisma.warehouseLocation.create({
    data: { warehouseId: whFG.id, code: "FG-BAY1-RACK01", zone: "Pharma Grade Finished Goods", rack: "FG-A", bin: "BIN01", maxCapacity: 30000 },
  });

  // 9. EQUIPMENT & PRODUCTION ASSETS
  console.log("Seeding Production Equipment...");
  await prisma.equipment.createMany({
    data: [
      { code: "RCTR-01", name: "Alkalization & Etherification Reactor 5000L (SS-316L)", stageType: "Reaction", capacity: 5000, unit: "LTR", status: "ACTIVE" },
      { code: "DRYR-01", name: "High-Efficiency Fluid Bed Dryer FBD-200", stageType: "Drying", capacity: 1500, unit: "KG", status: "ACTIVE" },
      { code: "MILL-01", name: "Air Classifying Micro-Pulverizer ACM-40", stageType: "Milling", capacity: 800, unit: "KG", status: "ACTIVE" },
      { code: "BLND-01", name: "Double Cone GMP Blender 3000L", stageType: "Blending", capacity: 2500, unit: "KG", status: "ACTIVE" },
    ],
  });

  // 10. MATERIALS (Raw Materials & Packing)
  console.log("Seeding Master Raw Materials...");
  const rawMaterials = [
    {
      code: "RM-MCC-PULP",
      name: "Alpha Cellulose Wood Pulp Sheets (Imported Coniferous Softwood)",
      type: MaterialType.RAW_MATERIAL,
      category: "Cellulose Base",
      description: "High-purity dissolving wood pulp sheets with >95% alpha-cellulose for MCC synthesis",
      baseUnitId: uoms["KG"].id,
      minStockAlert: 5000,
      maxStockLimit: 50000,
      reorderPoint: 15000,
      qcRequired: true,
    },
    {
      code: "RM-NAOH-FLAKES",
      name: "Sodium Hydroxide (Caustic Soda) 99% Pure Flakes",
      type: MaterialType.RAW_MATERIAL,
      category: "Alkalizing Agent",
      description: "Pure anhydrous sodium hydroxide flakes used for alkali cellulose generation & neutralization",
      baseUnitId: uoms["KG"].id,
      minStockAlert: 2000,
      maxStockLimit: 20000,
      reorderPoint: 6000,
      qcRequired: true,
    },
    {
      code: "RM-MCA-ACID",
      name: "Monochloroacetic Acid (MCA) Technical Flakes 99%",
      type: MaterialType.RAW_MATERIAL,
      category: "Etherifying Reagent",
      description: "Key reactant in the synthesis of Sodium Carboxymethyl Cellulose (CMC)",
      baseUnitId: uoms["KG"].id,
      minStockAlert: 2000,
      maxStockLimit: 15000,
      reorderPoint: 5000,
      qcRequired: true,
    },
    {
      code: "RM-HCL-TECH",
      name: "Hydrochloric Acid 33% Technical / Pure Grade",
      type: MaterialType.RAW_MATERIAL,
      category: "Acid Hydrolysis Agent",
      description: "Controlled hydrolysis reagent used to depolymerize amorphous cellulose into microcrystalline cellulose",
      baseUnitId: uoms["LTR"].id,
      minStockAlert: 1500,
      maxStockLimit: 12000,
      reorderPoint: 4000,
      qcRequired: true,
    },
    {
      code: "PM-FIBER-DRUM",
      name: "Pharma Grade Fiber Drum 50KG with Inner LDPE Liner",
      type: MaterialType.PACKING_MATERIAL,
      category: "Secondary Packaging",
      description: "Moisture-barrier fiber drums complying with US-FDA guidelines for bulk excipient transport",
      baseUnitId: uoms["PCS"].id,
      minStockAlert: 150,
      maxStockLimit: 2000,
      reorderPoint: 400,
      qcRequired: false,
    },
  ];

  const materials: Record<string, any> = {};
  for (const m of rawMaterials) {
    materials[m.code] = await prisma.material.create({ data: m });
  }

  // 11. PRODUCTS (Finished Goods)
  console.log("Seeding Finished Products...");
  const finishedProducts = [
    {
      code: "FG-MCC-101",
      name: "Microcrystalline Cellulose IP/BP/USP Grade 101",
      grade: "Pharma IP/BP/USP",
      description: "Direct compression pharmaceutical binder and disintegrant (Nominal mean particle size 50 µm)",
      baseUnitId: uoms["KG"].id,
      shelfLifeDays: 1460, // 4 years
      qcRequired: true,
      standardBatchSize: 2000.0,
    },
    {
      code: "FG-MCC-102",
      name: "Microcrystalline Cellulose IP/BP/USP Grade 102",
      grade: "Pharma IP/BP/USP",
      description: "Larger particle size MCC with exceptional flowability for automated high-speed tableting (Nominal 100 µm)",
      baseUnitId: uoms["KG"].id,
      shelfLifeDays: 1460,
      qcRequired: true,
      standardBatchSize: 2500.0,
    },
    {
      code: "FG-CMC-HIGH",
      name: "Sodium Carboxymethyl Cellulose (Sodium CMC) High Viscosity",
      grade: "Food & Pharma Grade",
      description: "High-viscosity cellulose gum for suspension stability, rheology modifier & excipient binder",
      baseUnitId: uoms["KG"].id,
      shelfLifeDays: 1095, // 3 years
      qcRequired: true,
      standardBatchSize: 1500.0,
    },
    {
      code: "FG-HPMC-E15",
      name: "Hydroxypropyl Methylcellulose (HPMC) E15 Film Coating Grade",
      grade: "Pharma Grade USP",
      description: "Hypromellose coating polymer for aqueous film coating of pharmaceutical solid dosage forms",
      baseUnitId: uoms["KG"].id,
      shelfLifeDays: 1095,
      qcRequired: true,
      standardBatchSize: 1000.0,
    },
  ];

  const products: Record<string, any> = {};
  for (const p of finishedProducts) {
    products[p.code] = await prisma.product.create({ data: p });
  }

  // 12. SUPPLIERS & CUSTOMERS
  console.log("Seeding Suppliers and Customers...");
  const suppliersData = [
    {
      code: "SUP-001",
      name: "Nordic Cellulose Fibers Ltd.",
      contactPerson: "Einar Lindholm",
      email: "supply@nordiccellulose.com",
      phone: "+46 8 555 1234",
      gstNumber: "07AAACN1234F1Z1",
      address: "Sveavagen 44, Stockholm, Sweden / India Depot: JNPT Port, Navi Mumbai",
      paymentTerms: "Net 60 Days",
      rating: 4.85,
    },
    {
      code: "SUP-002",
      name: "Gujarat Alkalis and Chemicals Ltd. (GACL)",
      contactPerson: "Bhavesh Patel",
      email: "b.patel@gacl.co.in",
      phone: "+91 265 223 2681",
      gstNumber: "24AAACG1234G1Z8",
      address: "P.O. Petrochemicals - 391346, Dist. Vadodara, Gujarat",
      paymentTerms: "Net 30 Days",
      rating: 4.90,
    },
    {
      code: "SUP-003",
      name: "Atul Chemicals Corp.",
      contactPerson: "Prakash Desai",
      email: "sales@atulchemicals.com",
      phone: "+91 2632 233 261",
      gstNumber: "24AAACA5678H1ZP",
      address: "Atul 396020, Dist. Valsad, Gujarat",
      paymentTerms: "Net 45 Days",
      rating: 4.70,
    },
    {
      code: "SUP-004",
      name: "Apex Packaging Solutions Pvt. Ltd.",
      contactPerson: "Nilesh Shah",
      email: "orders@apexpack.in",
      phone: "+91 265 283 1199",
      gstNumber: "24AAACA9876J1ZQ",
      address: "Plot 88, Makarpura GIDC, Vadodara, Gujarat",
      paymentTerms: "Net 30 Days",
      rating: 4.65,
    },
  ];
  const suppliers: Record<string, any> = {};
  for (const s of suppliersData) {
    suppliers[s.code] = await prisma.supplier.create({ data: s });
  }

  const customersData = [
    {
      code: "CUST-001",
      name: "Sun Healthcare Laboratories Ltd.",
      contactPerson: "Dr. Arvind Rao",
      email: "procurement@sunhealthlab.com",
      phone: "+91 22 4324 0000",
      gstNumber: "27AAACS1122K1Z4",
      billingAddress: "Sun House, Western Express Highway, Goregaon East, Mumbai, Maharashtra 400063",
      shippingAddress: "Plot 24, GIDC Panoli, Ankleshwar, Dist. Bharuch, Gujarat 394116",
      paymentTerms: "Net 45 Days",
      creditLimit: 5000000.0,
    },
    {
      code: "CUST-002",
      name: "Torrent Formulations Pvt. Ltd.",
      contactPerson: "Kavita Singhania",
      email: "materials@torrentform.com",
      phone: "+91 79 2659 9000",
      gstNumber: "24AAACT3344M1Z2",
      billingAddress: "Torrent House, Off Ashram Road, Ahmedabad, Gujarat 380009",
      shippingAddress: "Vill. Indrad, Taluka Kadi, Dist. Mehsana, Gujarat 382721",
      paymentTerms: "Net 60 Days",
      creditLimit: 7500000.0,
    },
    {
      code: "CUST-003",
      name: "Haldiram Snack & Foods Ltd.",
      contactPerson: "R. K. Agarwal",
      email: "ingredients@haldiram.com",
      phone: "+91 712 277 8888",
      gstNumber: "27AAACH5566P1Z9",
      billingAddress: "Haldiram Complex, Nagpur, Maharashtra 440008",
      shippingAddress: "Plot 14, Food Park, Butibori, Nagpur, Maharashtra 441122",
      paymentTerms: "Net 30 Days",
      creditLimit: 3000000.0,
    },
  ];
  const customers: Record<string, any> = {};
  for (const c of customersData) {
    customers[c.code] = await prisma.customer.create({ data: c });
  }

  // 13. QC SPECIFICATIONS (DEMONSTRATION SAMPLE)
  console.log("Seeding Demo QC Specifications...");
  const qcSpecPulp = await prisma.qCSpecification.create({
    data: {
      code: "QC-SPEC-RM-PULP",
      name: "Raw Material Specification: Alpha Cellulose Dissolving Pulp Sheets (DEMO SAMPLE)",
      targetType: QCSpecificationTarget.RAW_MATERIAL,
      materialId: materials["RM-MCC-PULP"].id,
      revisionNumber: 1,
      status: "APPROVED",
      approvedById: users["qc@deepakcellulose.com"].id,
      parameters: {
        create: [
          { parameterName: "Alpha Cellulose Purity", testMethod: "TAPPI T-203", unit: "%", minLimit: 95.0, maxLimit: 99.8, targetValue: "96.5", sequence: 1 },
          { parameterName: "Moisture Content", testMethod: "LOD @ 105°C", unit: "%", minLimit: 3.0, maxLimit: 7.0, targetValue: "5.5", sequence: 2 },
          { parameterName: "Ash Content", testMethod: "Muffle Furnace @ 575°C", unit: "%", minLimit: 0.0, maxLimit: 0.2, targetValue: "0.08", sequence: 3 },
          { parameterName: "Visual Appearance", testMethod: "Visual Inspection", qualitativeCriteria: "Clean, odorless white to off-white rectangular sheets free from specs", isMandatory: true, sequence: 4 },
        ],
      },
    },
    include: { parameters: true },
  });

  const qcSpecMCC101 = await prisma.qCSpecification.create({
    data: {
      code: "QC-SPEC-FG-MCC101",
      name: "Finished Good Release Specification: Microcrystalline Cellulose IP/BP/USP Grade 101 (DEMO SAMPLE)",
      targetType: QCSpecificationTarget.FINISHED_GOODS,
      productId: products["FG-MCC-101"].id,
      revisionNumber: 1,
      status: "APPROVED",
      approvedById: users["qc@deepakcellulose.com"].id,
      parameters: {
        create: [
          { parameterName: "Assay (as Cellulose)", testMethod: "IP / USP Monograph", unit: "%", minLimit: 97.0, maxLimit: 102.0, targetValue: "99.5", sequence: 1 },
          { parameterName: "Loss on Drying (LOD)", testMethod: "Halogen Moisture Analyzer 105°C", unit: "%", minLimit: 2.0, maxLimit: 5.0, targetValue: "3.8", sequence: 2 },
          { parameterName: "Bulk Density", testMethod: "USP <616> Method I", unit: "g/cc", minLimit: 0.28, maxLimit: 0.34, targetValue: "0.31", sequence: 3 },
          { parameterName: "pH of Aqueous Slurry", testMethod: "USP <791>", unit: "pH", minLimit: 5.0, maxLimit: 7.5, targetValue: "6.2", sequence: 4 },
          { parameterName: "Particle Size Retention on #200 mesh", testMethod: "Air Jet Sieve", unit: "%", minLimit: 0.0, maxLimit: 30.0, targetValue: "18.0", sequence: 5 },
        ],
      },
    },
    include: { parameters: true },
  });

  // 14. FORMULAS & BOM (DEMONSTRATION SAMPLE)
  console.log("Seeding Demo Product Formula & Manufacturing Stages...");
  const formulaMCC101 = await prisma.formula.create({
    data: {
      formulaCode: "BOM-MCC-101-REV1",
      name: "Standard Production Formula for Microcrystalline Cellulose Grade 101 (DEMO SAMPLE)",
      productId: products["FG-MCC-101"].id,
      revisionNumber: 1,
      status: "APPROVED",
      standardBatchSize: 2000.0,
      unit: "KG",
      expectedYieldPercentage: 92.5,
      description: "Validated recipe for 2000 KG finished batch of MCC 101 via acid hydrolysis of dissolving pulp",
      approvedById: users["production@deepakcellulose.com"].id,
      approvedAt: new Date("2026-01-10T10:00:00Z"),
      lines: {
        create: [
          { materialId: materials["RM-MCC-PULP"].id, standardQuantity: 2150.0, unit: "KG", tolerancePercentage: 1.5, sequenceOrder: 1 },
          { materialId: materials["RM-HCL-TECH"].id, standardQuantity: 420.0, unit: "LTR", tolerancePercentage: 2.0, sequenceOrder: 2 },
          { materialId: materials["RM-NAOH-FLAKES"].id, standardQuantity: 65.0, unit: "KG", tolerancePercentage: 2.0, sequenceOrder: 3 },
        ],
      },
      stages: {
        create: [
          { stageName: "Pulp Shredding & Slurry Charging", sequenceOrder: 1, equipmentType: "Shredder & Charge Hopper", instructions: "Feed dry wood pulp sheets through shredder into reactor slurry tank", estimatedDurationMinutes: 90, mandatoryQCCheck: false },
          { stageName: "Acid Hydrolysis & Reflux Reaction", sequenceOrder: 2, equipmentType: "Glass-Lined Reactor RCTR-01", instructions: "Maintain reactor at 105°C ± 2°C with continuous agitation for 45 minutes to depolymerize amorphous regions", estimatedDurationMinutes: 120, mandatoryQCCheck: true },
          { stageName: "De-acidification & Multi-stage Washing", sequenceOrder: 3, equipmentType: "Centrifugal Decanter & Wash Column", instructions: "Wash slurry with demineralized water until effluent pH exceeds 5.8", estimatedDurationMinutes: 150, mandatoryQCCheck: true },
          { stageName: "Spray Drying & Fluid Bed Conditioning", sequenceOrder: 4, equipmentType: "Fluid Bed Dryer DRYR-01", instructions: "Atomize slurry into hot air stream; maintain outlet temperature at 85°C", estimatedDurationMinutes: 180, mandatoryQCCheck: false },
          { stageName: "Classification, Sifting & Drum Packing", sequenceOrder: 5, equipmentType: "ACM-40 Mill & Double Cone Blender BLND-01", instructions: "Pass through 60-mesh vibratory sifter into 50KG fiber drums with poly liners", estimatedDurationMinutes: 120, mandatoryQCCheck: true },
        ],
      },
    },
  });

  // 15. DYNAMIC FORM & WORKFLOW DEFINITIONS
  console.log("Seeding Dynamic Form & Workflow Configs...");
  const formPO = await prisma.formDefinition.create({
    data: {
      code: "FORM_PURCHASE_ORDER",
      name: "Purchase Order Dynamic Specification",
      entityType: "PURCHASE_ORDER",
      description: "Configurable purchase order headers, terms, and custom compliance flags",
      versions: {
        create: {
          version: 1,
          status: "PUBLISHED",
          publishedAt: new Date("2026-01-01T00:00:00Z"),
          publishedById: users["admin@deepakcellulose.com"].id,
          schema: {
            sections: [
              {
                id: "commercial_terms",
                title: "Commercial & Statutory Details",
                fields: [
                  { key: "incoterms", label: "Incoterms (e.g. CIF JNPT, Ex-Works Vadodara)", type: "select", options: ["Ex-Works", "FOB", "CIF", "FOR Destination"], required: true, defaultValue: "FOR Destination" },
                  { key: "gst_type", label: "GST Structure", type: "select", options: ["IGST (Inter-state 18%)", "CGST+SGST (Intra-state 9%+9%)", "Exempt"], required: true, defaultValue: "CGST+SGST (Intra-state 9%+9%)" },
                  { key: "insurance_borne_by", label: "Transit Insurance", type: "text", required: false, defaultValue: "Supplier Policy" },
                ],
              },
            ],
          },
        },
      },
    },
  });

  const wfProcure = await prisma.workflowDefinition.create({
    data: {
      code: "WF_PROCURE_TO_RELEASE",
      name: "Purchase Requisition to Material Production Release",
      entityType: "PURCHASE_TO_RELEASE",
      description: "Standard compliant inbound workflow: PO -> Gate -> GRN -> QC Inspection -> Disposition -> Available Stock",
      versions: {
        create: {
          version: 1,
          status: "PUBLISHED",
          publishedAt: new Date("2026-01-01T00:00:00Z"),
          stages: [
            { code: "PO_DRAFT", name: "PO Draft", department: "PURCHASE", allowedRoles: ["PURCHASE_MANAGER", "PURCHASE_EXECUTIVE"] },
            { code: "PO_APPROVED", name: "PO Approved", department: "PURCHASE", allowedRoles: ["PURCHASE_MANAGER", "SUPER_ADMIN"] },
            { code: "GATE_RECORDED", name: "Gate Entry Recorded", department: "GATE", allowedRoles: ["GATE_OPERATOR"] },
            { code: "GRN_PENDING_QC", name: "Received in Quarantine (Pending QC)", department: "WAREHOUSE", allowedRoles: ["WAREHOUSE_MANAGER", "WAREHOUSE_OPERATOR"] },
            { code: "QC_IN_TESTING", name: "QC Sampling & Testing", department: "QC", allowedRoles: ["QC_INSPECTOR", "QC_MANAGER"] },
            { code: "QC_RELEASED", name: "Approved for Production Release", department: "QC", allowedRoles: ["QC_MANAGER"] },
          ],
          transitions: [
            { from: "PO_DRAFT", to: "PO_APPROVED", action: "APPROVE_PO", roleRequired: "PURCHASE_MANAGER" },
            { from: "PO_APPROVED", to: "GATE_RECORDED", action: "LOG_TRUCK_ARRIVAL", roleRequired: "GATE_OPERATOR" },
            { from: "GATE_RECORDED", to: "GRN_PENDING_QC", action: "PHYSICAL_RECEIPT", roleRequired: "WAREHOUSE_MANAGER" },
            { from: "GRN_PENDING_QC", to: "QC_IN_TESTING", action: "COLLECT_QC_SAMPLE", roleRequired: "QC_INSPECTOR" },
            { from: "QC_IN_TESTING", to: "QC_RELEASED", action: "AUTHORIZE_DISPOSITION", roleRequired: "QC_MANAGER" },
          ],
        },
      },
    },
  });

  // 16. LIVE DEMO BUSINESS TRANSACTIONS
  console.log("Seeding Active Realistic Transactions...");

  // Transaction 1: Approved Purchase Order for 15,000 KG Wood Pulp
  const po1 = await prisma.purchaseOrder.create({
    data: {
      poNumber: "PO-2026-0101",
      supplierId: suppliers["SUP-001"].id,
      orderDate: new Date("2026-10-01T09:30:00Z"),
      expectedDeliveryDate: new Date("2026-10-20T17:00:00Z"),
      status: PurchaseOrderStatus.APPROVED,
      subtotal: 1875000.0, // 15,000 KG * 125 INR/KG
      taxAmount: 337500.0, // 18% IGST
      totalAmount: 2212500.0,
      currency: "INR",
      paymentTerms: "Net 60 Days after Delivery",
      notes: "Strict requirement: Alpha-cellulose must be >95.5%, moisture <7%. Certificate of Analysis required with consignment.",
      approvedById: users["purchase@deepakcellulose.com"].id,
      approvedAt: new Date("2026-10-02T11:15:00Z"),
      lines: {
        create: [
          {
            materialId: materials["RM-MCC-PULP"].id,
            quantity: 15000.0,
            unitId: uoms["KG"].id,
            unitPrice: 125.0,
            taxRate: 18.0,
            totalPrice: 2212500.0,
            receivedQuantity: 0.0,
            notes: "Baled sheets on ISPM-15 heat-treated pallets",
          },
        ],
      },
    },
    include: { lines: true },
  });

  // Transaction 2: Security Gate Entry recorded for Arrived Vehicle carrying Caustic Soda & Pulp
  const po2 = await prisma.purchaseOrder.create({
    data: {
      poNumber: "PO-2026-0102",
      supplierId: suppliers["SUP-002"].id,
      orderDate: new Date("2026-09-28T14:00:00Z"),
      expectedDeliveryDate: new Date("2026-10-14T12:00:00Z"),
      status: PurchaseOrderStatus.PARTIALLY_RECEIVED,
      subtotal: 480000.0, // 8000 KG * 60 INR/KG
      taxAmount: 86400.0,
      totalAmount: 566400.0,
      paymentTerms: "Net 30 Days",
      approvedById: users["purchase@deepakcellulose.com"].id,
      approvedAt: new Date("2026-09-29T10:00:00Z"),
      lines: {
        create: [
          {
            materialId: materials["RM-NAOH-FLAKES"].id,
            quantity: 8000.0,
            unitId: uoms["KG"].id,
            unitPrice: 60.0,
            taxRate: 18.0,
            totalPrice: 566400.0,
            receivedQuantity: 4000.0,
            acceptedQuantity: 4000.0,
            notes: "25 KG sealed bags with tamper-proof seal",
          },
        ],
      },
    },
    include: { lines: true },
  });

  const gate1 = await prisma.gateEntry.create({
    data: {
      gatePassNumber: "GE-2026-0088",
      arrivalTime: new Date("2026-10-15T08:45:00Z"),
      supplierId: suppliers["SUP-002"].id,
      vehicleNumber: "GJ-06-AX-8912",
      driverName: "Kailash Chand Yadav",
      driverPhone: "+91 98251 12345",
      challanNumber: "GACL/DEL/2026/8941",
      challanDate: new Date("2026-10-14T00:00:00Z"),
      purchaseOrderId: po2.id,
      declaredMaterials: "Sodium Hydroxide 99% Flakes",
      declaredQuantity: 4000.0,
      declaredUnit: "KG",
      numberOfPackages: 160,
      weighbridgeGrossWeight: 14250.0,
      weighbridgeTareWeight: 10230.0,
      weighbridgeNetWeight: 4020.0,
      securityOfficerId: users["gate@deepakcellulose.com"].id,
      status: GateEntryStatus.SENT_TO_WAREHOUSE,
      remarks: "Vehicle tare checked. Driver presented original invoice & GACL delivery challan. No physical damage on bags.",
    },
  });

  // Transaction 3: Goods Receipt Note (GRN) in Quarantine & Inventory Lot
  const grn1 = await prisma.goodsReceipt.create({
    data: {
      grnNumber: "GRN-2026-0076",
      gateEntryId: gate1.id,
      purchaseOrderId: po2.id,
      supplierId: suppliers["SUP-002"].id,
      supplierChallanNumber: "GACL/DEL/2026/8941",
      challanDate: new Date("2026-10-14T00:00:00Z"),
      receiptDate: new Date("2026-10-15T09:30:00Z"),
      receivedById: users["warehouse@deepakcellulose.com"].id,
      status: GoodsReceiptStatus.RECEIVED_PENDING_QC,
      remarks: "Unloaded in Quarantine Bay. Count verified: 160 bags of 25KG each.",
    },
  });

  const grnLine1 = await prisma.goodsReceiptLine.create({
    data: {
      goodsReceiptId: grn1.id,
      poLineId: po2.lines[0].id,
      materialId: materials["RM-NAOH-FLAKES"].id,
      declaredQuantity: 4000.0,
      receivedQuantity: 4000.0,
      acceptedQuantity: 0.0,
      unit: "KG",
      warehouseId: whQUAR.id,
      locationId: locQuar1.id,
      supplierBatchNumber: "GACL-NAOH-26B14",
    },
  });

  const lot1 = await prisma.inventoryLot.create({
    data: {
      lotNumber: "LOT-2026-00215",
      entityType: "RAW_MATERIAL",
      materialId: materials["RM-NAOH-FLAKES"].id,
      initialQuantity: 4000.0,
      currentQuantity: 4000.0,
      unit: "KG",
      warehouseId: whQUAR.id,
      locationId: locQuar1.id,
      status: InventoryLotStatus.RECEIVED_PENDING_QC,
      supplierBatchNumber: "GACL-NAOH-26B14",
      grnLineId: grnLine1.id,
      qrCode: "DC-LOT-2026-00215-RM-NAOH-4000KG",
    },
  });

  // Append-only stock ledger entry for Goods Receipt
  await prisma.inventoryLedgerEntry.create({
    data: {
      transactionNumber: "STK-TXN-2026-00341",
      transactionType: InventoryTransactionType.GRN_RECEIPT,
      materialId: materials["RM-NAOH-FLAKES"].id,
      lotId: lot1.id,
      quantity: 4000.0,
      unit: "KG",
      toWarehouseId: whQUAR.id,
      toLocationId: locQuar1.id,
      toStatus: InventoryLotStatus.RECEIVED_PENDING_QC,
      referenceType: "GOODS_RECEIPT",
      referenceId: grn1.id,
      actorId: users["warehouse@deepakcellulose.com"].id,
      reason: "Initial physical receipt into Quarantine awaiting QC sampling",
    },
  });

  // Transaction 4: Quality Control Inspection assigned & in testing for Lot-215
  const qcInspection1 = await prisma.qCInspection.create({
    data: {
      inspectionNumber: "QC-2026-0062",
      stage: "INCOMING_RM",
      lotId: lot1.id,
      grnId: grn1.id,
      sampleQuantity: 0.5,
      sampleUnit: "KG",
      inspectionDate: new Date("2026-10-15T10:15:00Z"),
      inspectorId: users["qc@deepakcellulose.com"].id,
      status: QCInspectionStatus.IN_TESTING,
      remarks: "Sample composite drawn from 12 representative bags (√N + 1 sampling rule). Testing for purity & carbonates.",
      results: {
        create: [
          { testName: "Purity as NaOH", testMethod: "Acid-Base Titration", expectedMin: 98.5, expectedMax: 100.0, observedValue: 99.4, isConforming: true, remarks: "Complies with technical grade specification" },
          { testName: "Sodium Carbonate Content", testMethod: "Barium Precipitation", expectedMin: 0.0, expectedMax: 0.4, observedValue: 0.18, isConforming: true, remarks: "Within limit" },
        ],
      },
    },
  });

  // Transaction 5: Approved & Released Raw Material Lot (Already in Central Warehouse)
  const lotPulpReleased = await prisma.inventoryLot.create({
    data: {
      lotNumber: "LOT-2026-00198",
      entityType: "RAW_MATERIAL",
      materialId: materials["RM-MCC-PULP"].id,
      initialQuantity: 12000.0,
      currentQuantity: 8700.0, // After some consumption
      reservedQuantity: 2150.0, // Reserved for active batch
      unit: "KG",
      warehouseId: whRM.id,
      locationId: locRM1.id,
      status: InventoryLotStatus.AVAILABLE,
      supplierBatchNumber: "NORDIC-2026-SEP-09",
      qrCode: "DC-LOT-2026-00198-RM-PULP-8700KG",
    },
  });

  // Transaction 6: Active Production Order & Batch Manufacturing Record (BMR)
  const prodOrder1 = await prisma.productionOrder.create({
    data: {
      orderNumber: "PRD-2026-0042",
      productId: products["FG-MCC-101"].id,
      formulaId: formulaMCC101.id,
      plannedQuantity: 2000.0,
      unit: "KG",
      startDate: new Date("2026-10-14T08:00:00Z"),
      targetCompletionDate: new Date("2026-10-16T18:00:00Z"),
      priority: "HIGH",
      status: ProductionOrderStatus.IN_PRODUCTION,
      assignedSupervisorId: users["production@deepakcellulose.com"].id,
      notes: "Dedicated pharmaceutical campaign for Sun Healthcare customer order SO-2026-0051",
    },
  });

  const batch1 = await prisma.batch.create({
    data: {
      batchNumber: "BMR-2026-0042",
      productionOrderId: prodOrder1.id,
      formulaId: formulaMCC101.id,
      plannedQuantity: 2000.0,
      unit: "KG",
      status: BatchStatus.IN_PROGRESS,
      startedAt: new Date("2026-10-14T09:00:00Z"),
      operatorId: users["production@deepakcellulose.com"].id,
      supervisorId: users["production@deepakcellulose.com"].id,
      notes: "Acid hydrolysis completed at 104.8°C. De-acidification washing currently in progress.",
      consumptions: {
        create: [
          {
            materialId: materials["RM-MCC-PULP"].id,
            lotId: lotPulpReleased.id,
            plannedQuantity: 2150.0,
            actualQuantity: 2150.0,
            unit: "KG",
            variance: 0.0,
            issueSlipNumber: "MIS-2026-0091",
            issuedById: users["warehouse@deepakcellulose.com"].id,
          },
        ],
      },
      operations: {
        create: [
          { stageName: "Pulp Shredding & Slurry Charging", sequenceOrder: 1, status: "COMPLETED", startedAt: new Date("2026-10-14T09:00:00Z"), completedAt: new Date("2026-10-14T10:30:00Z"), remarks: "2150 KG charged without blockages" },
          { stageName: "Acid Hydrolysis & Reflux Reaction", sequenceOrder: 2, status: "COMPLETED", startedAt: new Date("2026-10-14T10:45:00Z"), completedAt: new Date("2026-10-14T12:45:00Z"), remarks: "Reaction time 50 mins @ 105°C; viscosity drop reached end-point" },
          { stageName: "De-acidification & Multi-stage Washing", sequenceOrder: 3, status: "IN_PROGRESS", startedAt: new Date("2026-10-14T13:00:00Z"), remarks: "Wash cycle 4 in progress. Wash liquor conductivity dropping" },
        ],
      },
    },
  });

  // Transaction 7: Finished Goods Lot (Previously completed batch BMR-2026-0038)
  const fgReceipt1 = await prisma.finishedGoodsReceipt.create({
    data: {
      receiptNumber: "FGR-2026-0039",
      batchId: batch1.id,
      productId: products["FG-MCC-101"].id,
      producedQuantity: 1950.0,
      unit: "KG",
      packageCount: 39,
      packagingTypeId: packaging["FIBER_DRUM_50KG"].id,
      warehouseId: whFG.id,
      locationId: locFG1.id,
      receivedById: users["fg@deepakcellulose.com"].id,
      qcStatus: "APPROVED",
    },
  });

  const fgLot1 = await prisma.finishedGoodsLot.create({
    data: {
      lotNumber: "LOT-FG-2026-0089",
      receiptId: fgReceipt1.id,
      productId: products["FG-MCC-101"].id,
      initialQuantity: 1950.0,
      currentQuantity: 1950.0,
      reservedQuantity: 1000.0, // Reserved for customer order
      unit: "KG",
      warehouseId: whFG.id,
      locationId: locFG1.id,
      status: "AVAILABLE",
      manufacturingDate: new Date("2026-10-10T00:00:00Z"),
      expiryDate: new Date("2030-10-09T00:00:00Z"),
    },
  });

  // Transaction 8: Customer Order & Ready Dispatch
  const so1 = await prisma.customerOrder.create({
    data: {
      orderNumber: "SO-2026-0051",
      customerId: customers["CUST-001"].id,
      customerPoNumber: "SUN/PO/EXC/2026/4412",
      orderDate: new Date("2026-10-08T11:00:00Z"),
      requiredDeliveryDate: new Date("2026-10-22T00:00:00Z"),
      status: CustomerOrderStatus.PROCESSING,
      subtotal: 240000.0, // 1000 KG * 240 INR/KG
      taxAmount: 43200.0, // 18% GST
      totalAmount: 283200.0,
      paymentTerms: "Net 45 Days",
      approvedById: users["dispatch@deepakcellulose.com"].id,
      lines: {
        create: [
          {
            productId: products["FG-MCC-101"].id,
            orderedQuantity: 1000.0,
            unit: "KG",
            unitPrice: 240.0,
            taxRate: 18.0,
            totalPrice: 283200.0,
            dispatchedQuantity: 0.0,
            remainingQuantity: 1000.0,
          },
        ],
      },
    },
    include: { lines: true },
  });

  const dispatch1 = await prisma.dispatch.create({
    data: {
      dispatchChallanNumber: "DC-2026-0034",
      customerOrderId: so1.id,
      customerId: customers["CUST-001"].id,
      dispatchDate: new Date("2026-10-15T14:00:00Z"),
      status: DispatchStatus.ALLOCATED,
      transporterName: "V-Trans India Logistics Pvt. Ltd.",
      vehicleNumber: "GJ-06-BT-4411",
      driverName: "Dharmesh Rathod",
      driverPhone: "+91 94280 98765",
      lrNumber: "VT/VAD/26/99120",
      totalPackages: 20, // 20 drums of 50KG
      netWeight: 1000.0,
      grossWeight: 1080.0,
      remarks: "Allocated from approved batch LOT-FG-2026-0089. COA & MSDS attached.",
      preparedById: users["dispatch@deepakcellulose.com"].id,
      lines: {
        create: [
          {
            customerOrderLineId: so1.lines[0].id,
            productId: products["FG-MCC-101"].id,
            quantity: 1000.0,
            unit: "KG",
            unitPrice: 240.0,
            taxRate: 18.0,
            totalPrice: 283200.0,
            allocations: {
              create: [
                {
                  finishedGoodsLotId: fgLot1.id,
                  allocatedQuantity: 1000.0,
                  unit: "KG",
                },
              ],
            },
          },
        ],
      },
    },
  });

  // Transaction 9: Accounts 3-Way Match Record & Supplier Invoice
  await prisma.supplierInvoice.create({
    data: {
      invoiceNumber: "INV-GACL-2026-10892",
      supplierId: suppliers["SUP-002"].id,
      invoiceDate: new Date("2026-10-14T00:00:00Z"),
      dueDate: new Date("2026-11-14T00:00:00Z"),
      purchaseOrderId: po2.id,
      goodsReceiptId: grn1.id,
      subtotal: 240000.0, // 4000 KG * 60 INR
      taxAmount: 43200.0,
      totalAmount: 283200.0,
      paymentStatus: PaymentStatus.PENDING,
      threeWayMatchStatus: ThreeWayMatchStatus.MATCHED,
      discrepancyDetails: { matched: true, rateMatched: true, qtyMatched: true, notes: "PO, Gate Weighment & GRN match GACL invoice exactly" },
      notes: "Approved for payment scheduling in next commercial run",
    },
  });

  // 17. INITIAL AUDIT LOGS & NOTIFICATIONS
  console.log("Seeding Audit Trail & Notifications...");
  await prisma.auditLog.createMany({
    data: [
      {
        actorId: users["admin@deepakcellulose.com"].id,
        actorEmail: "admin@deepakcellulose.com",
        actorName: "Priya Shah",
        action: "CONFIG_PUBLISH",
        entityType: "FORM_DEFINITION",
        entityId: formPO.id,
        documentNumber: "FORM_PURCHASE_ORDER",
        details: { version: 1, status: "PUBLISHED", notes: "Initial production baseline published" },
      },
      {
        actorId: users["purchase@deepakcellulose.com"].id,
        actorEmail: "purchase@deepakcellulose.com",
        actorName: "Rajesh Mehta",
        action: "APPROVE",
        entityType: "PURCHASE_ORDER",
        entityId: po1.id,
        documentNumber: "PO-2026-0101",
        details: { approvedAmount: 2212500.0, supplier: "Nordic Cellulose Fibers Ltd." },
      },
      {
        actorId: users["gate@deepakcellulose.com"].id,
        actorEmail: "gate@deepakcellulose.com",
        actorName: "Vikram Singh",
        action: "CREATE",
        entityType: "GATE_ENTRY",
        entityId: gate1.id,
        documentNumber: "GE-2026-0088",
        details: { vehicle: "GJ-06-AX-8912", netWeight: 4020.0 },
      },
      {
        actorId: users["qc@deepakcellulose.com"].id,
        actorEmail: "qc@deepakcellulose.com",
        actorName: "Dr. Sunita Patel",
        action: "QC_SAMPLE",
        entityType: "QC_INSPECTION",
        entityId: qcInspection1.id,
        documentNumber: "QC-2026-0062",
        details: { sampleDrawn: "0.5 KG", lot: "LOT-2026-00215" },
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: users["qc@deepakcellulose.com"].id,
        title: "QC Inspection Required: Inbound Lot LOT-2026-00215",
        message: "Caustic soda flakes consignment received from GACL. Please complete assay and release disposition.",
        type: "ACTION_REQUIRED",
        link: "/qc/inspections/QC-2026-0062",
      },
      {
        userId: users["warehouse@deepakcellulose.com"].id,
        title: "Pending Quarantine Receipt: Gate Pass GE-2026-0088",
        message: "Vehicle GJ-06-AX-8912 arrived at Bay 1 with 160 packages.",
        type: "INFO",
        link: "/warehouse/receipts",
      },
      {
        userId: users["dispatch@deepakcellulose.com"].id,
        title: "Stock Reserved: Sun Healthcare Order SO-2026-0051",
        message: "1000 KG of MCC-101 allocated. Ready for driver verification & challan printing.",
        type: "SUCCESS",
        link: "/dispatch/challans/DC-2026-0034",
      },
    ],
  });

  // 17. CONFIGURABLE BATCH PROCESS WORKFLOWS
  console.log("Seeding Configurable Manufacturing Process Templates...");
  const { seedHpmcProcessTemplate } = await import("../server/services/process-workflow.service");
  await seedHpmcProcessTemplate();

  console.log("✅ Seed completed successfully! Connected live ERP dataset generated.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
