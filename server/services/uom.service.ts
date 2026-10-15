import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";

export interface ConversionResult {
  convertedQuantity: number;
  fromUnit: string;
  toUnit: string;
  conversionFactor: number;
  ruleType: "STANDARD_BASE" | "MATERIAL_SPECIFIC";
}

export async function convertUnit(params: {
  quantity: number | Prisma.Decimal;
  fromUnitCode: string;
  toUnitCode: string;
  materialId?: string;
}): Promise<ConversionResult> {
  const qty = Number(params.quantity);
  const fromCode = params.fromUnitCode.toUpperCase();
  const toCode = params.toUnitCode.toUpperCase();

  if (fromCode === toCode) {
    return {
      convertedQuantity: qty,
      fromUnit: fromCode,
      toUnit: toCode,
      conversionFactor: 1.0,
      ruleType: "STANDARD_BASE",
    };
  }

  const [fromUnit, toUnit] = await Promise.all([
    prisma.unitOfMeasure.findUnique({ where: { code: fromCode } }),
    prisma.unitOfMeasure.findUnique({ where: { code: toCode } }),
  ]);

  if (!fromUnit || !toUnit) {
    throw new Error(`Invalid unit specified: '${fromCode}' or '${toCode}' not found in system.`);
  }

  // 1. Same physical dimension (e.g., MASS -> MASS, VOLUME -> VOLUME)
  if (fromUnit.type === toUnit.type && fromUnit.type !== "PACKAGING") {
    const fromFactor = Number(fromUnit.conversionFactorToBase);
    const toFactor = Number(toUnit.conversionFactorToBase);

    if (toFactor === 0) {
      throw new Error(`Invalid conversion factor 0 configured for unit '${toCode}'.`);
    }

    // Convert from -> Base -> to
    const baseQuantity = qty * fromFactor;
    const converted = baseQuantity / toFactor;
    const effectiveFactor = fromFactor / toFactor;

    return {
      convertedQuantity: converted,
      fromUnit: fromCode,
      toUnit: toCode,
      conversionFactor: effectiveFactor,
      ruleType: "STANDARD_BASE",
    };
  }

  // 2. Cross-dimension or packaging conversion: Requires material-specific conversion factor!
  if (!params.materialId) {
    throw new Error(
      `Cross-dimension conversion from '${fromCode}' (${fromUnit.type}) to '${toCode}' (${toUnit.type}) requires a specific materialId with an approved conversion rule.`
    );
  }

  const materialConversion = await prisma.materialUnitConversion.findFirst({
    where: {
      materialId: params.materialId,
      fromUnitId: fromUnit.id,
      toUnitId: toUnit.id,
    },
  });

  if (materialConversion) {
    const factor = Number(materialConversion.factor);
    return {
      convertedQuantity: qty * factor,
      fromUnit: fromCode,
      toUnit: toCode,
      conversionFactor: factor,
      ruleType: "MATERIAL_SPECIFIC",
    };
  }

  // Check reciprocal conversion
  const reciprocalConversion = await prisma.materialUnitConversion.findFirst({
    where: {
      materialId: params.materialId,
      fromUnitId: toUnit.id,
      toUnitId: fromUnit.id,
    },
  });

  if (reciprocalConversion) {
    const recipFactor = Number(reciprocalConversion.factor);
    if (recipFactor === 0) {
      throw new Error(`Reciprocal factor is zero for material unit conversion.`);
    }
    const factor = 1 / recipFactor;
    return {
      convertedQuantity: qty * factor,
      fromUnit: fromCode,
      toUnit: toCode,
      conversionFactor: factor,
      ruleType: "MATERIAL_SPECIFIC",
    };
  }

  throw new Error(
    `No approved conversion rule found between '${fromCode}' and '${toCode}' for this material. Please configure a valid conversion factor in Master Data.`
  );
}
