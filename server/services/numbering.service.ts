import prisma from "@/lib/db";

export async function generateDocumentNumber(entityType: string): Promise<string> {
  const currentYear = new Date().getFullYear().toString();

  // Atomically increment the sequence number
  const sequence = await prisma.$transaction(async (tx) => {
    let seq = await tx.numberingSequence.findUnique({
      where: { entityType },
    });

    if (!seq) {
      seq = await tx.numberingSequence.create({
        data: {
          entityType,
          prefix: entityType.substring(0, 3).toUpperCase(),
          yearFormat: "YYYY",
          currentNumber: 1,
          paddingLength: 4,
          resetPeriod: "ANNUAL",
        },
      });
      return seq;
    }

    const updated = await tx.numberingSequence.update({
      where: { entityType },
      data: {
        currentNumber: { increment: 1 },
      },
    });

    return updated;
  });

  const paddedNum = sequence.currentNumber.toString().padStart(sequence.paddingLength, "0");
  const yearPart = sequence.yearFormat === "YYYY" ? currentYear : sequence.yearFormat === "YY" ? currentYear.slice(-2) : "";
  
  if (yearPart) {
    return `${sequence.prefix}-${yearPart}-${paddedNum}`;
  }
  return `${sequence.prefix}-${paddedNum}`;
}
