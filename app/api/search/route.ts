import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q")?.trim();
  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const results: any[] = [];

  const [pos, gates, grns, lots, qcs, prods, batches, fgLots, dispatches, suppliers, customers] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: {
        OR: [
          { poNumber: { contains: query, mode: "insensitive" } },
          { supplier: { name: { contains: query, mode: "insensitive" } } },
        ],
      },
      take: 4,
      include: { supplier: true },
    }),
    prisma.gateEntry.findMany({
      where: {
        OR: [
          { gatePassNumber: { contains: query, mode: "insensitive" } },
          { vehicleNumber: { contains: query, mode: "insensitive" } },
          { challanNumber: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 4,
    }),
    prisma.goodsReceipt.findMany({
      where: {
        OR: [
          { grnNumber: { contains: query, mode: "insensitive" } },
          { supplierChallanNumber: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 4,
    }),
    prisma.inventoryLot.findMany({
      where: {
        OR: [
          { lotNumber: { contains: query, mode: "insensitive" } },
          { supplierBatchNumber: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 4,
      include: { material: true, product: true },
    }),
    prisma.qCInspection.findMany({
      where: {
        OR: [
          { inspectionNumber: { contains: query, mode: "insensitive" } },
          { coaNumber: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 4,
    }),
    prisma.productionOrder.findMany({
      where: {
        orderNumber: { contains: query, mode: "insensitive" },
      },
      take: 4,
      include: { product: true },
    }),
    prisma.batch.findMany({
      where: {
        batchNumber: { contains: query, mode: "insensitive" },
      },
      take: 4,
    }),
    prisma.finishedGoodsLot.findMany({
      where: {
        lotNumber: { contains: query, mode: "insensitive" },
      },
      take: 4,
      include: { product: true },
    }),
    prisma.dispatch.findMany({
      where: {
        OR: [
          { dispatchChallanNumber: { contains: query, mode: "insensitive" } },
          { vehicleNumber: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 4,
      include: { customer: true },
    }),
    prisma.supplier.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { code: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 3,
    }),
    prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { code: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 3,
    }),
  ]);

  for (const po of pos) {
    results.push({
      category: "Purchase Orders",
      title: po.poNumber,
      subtitle: `${po.supplier.name} - ₹${po.totalAmount}`,
      status: po.status,
      href: `/procurement/orders/${po.id}`,
    });
  }

  for (const ge of gates) {
    results.push({
      category: "Security Gate Passes",
      title: ge.gatePassNumber,
      subtitle: `Vehicle: ${ge.vehicleNumber} (Challan: ${ge.challanNumber})`,
      status: ge.status,
      href: `/gate`,
    });
  }

  for (const grn of grns) {
    results.push({
      category: "Goods Receipts (GRN)",
      title: grn.grnNumber,
      subtitle: `Supplier Challan: ${grn.supplierChallanNumber}`,
      status: grn.status,
      href: `/warehouse`,
    });
  }

  for (const lot of lots) {
    results.push({
      category: "Inventory Lots",
      title: lot.lotNumber,
      subtitle: `${lot.material?.name || lot.product?.name || "Lot"} - ${lot.currentQuantity} ${lot.unit}`,
      status: lot.status,
      href: `/warehouse`,
    });
  }

  for (const qc of qcs) {
    results.push({
      category: "QC Inspections",
      title: qc.inspectionNumber,
      subtitle: `Stage: ${qc.stage} ${qc.coaNumber ? `(COA: ${qc.coaNumber})` : ""}`,
      status: qc.status,
      href: `/qc/inspections`,
    });
  }

  for (const prd of prods) {
    results.push({
      category: "Production Orders",
      title: prd.orderNumber,
      subtitle: `${prd.product.name} - Planned: ${prd.plannedQuantity} ${prd.unit}`,
      status: prd.status,
      href: `/production/orders`,
    });
  }

  for (const b of batches) {
    results.push({
      category: "Manufacturing Batches (BMR)",
      title: b.batchNumber,
      subtitle: `Batch Status: ${b.status} (${b.plannedQuantity} ${b.unit})`,
      status: b.status,
      href: `/production/batches/${b.id}`,
    });
  }

  for (const fgl of fgLots) {
    results.push({
      category: "Finished Goods Lots",
      title: fgl.lotNumber,
      subtitle: `${fgl.product.name} - Available: ${Number(fgl.currentQuantity) - Number(fgl.reservedQuantity)} ${fgl.unit}`,
      status: fgl.status,
      href: `/finished-goods`,
    });
  }

  for (const d of dispatches) {
    results.push({
      category: "Dispatch Challans",
      title: d.dispatchChallanNumber,
      subtitle: `Customer: ${d.customer.name} - Vehicle: ${d.vehicleNumber || "Pending"}`,
      status: d.status,
      href: `/dispatch`,
    });
  }

  for (const s of suppliers) {
    results.push({
      category: "Suppliers",
      title: s.name,
      subtitle: `Code: ${s.code} - ${s.contactPerson || ""}`,
      status: s.isActive ? "ACTIVE" : "INACTIVE",
      href: `/procurement/suppliers`,
    });
  }

  for (const c of customers) {
    results.push({
      category: "Customers",
      title: c.name,
      subtitle: `Code: ${c.code} - ${c.contactPerson || ""}`,
      status: c.isActive ? "ACTIVE" : "INACTIVE",
      href: `/dispatch/customers`,
    });
  }

  return NextResponse.json({ results });
}
