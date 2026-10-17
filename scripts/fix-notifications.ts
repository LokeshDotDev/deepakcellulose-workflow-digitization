import prisma from "../lib/db";

async function main() {
  const updated = await prisma.notification.updateMany({
    where: { link: "/warehouse/receipts" },
    data: { link: "/warehouse" },
  });
  console.log(`Updated ${updated.count} notification links.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
