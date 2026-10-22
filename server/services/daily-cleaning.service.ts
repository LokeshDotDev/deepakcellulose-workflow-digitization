import prisma from "@/lib/db";
import { SessionUser } from "@/lib/auth";
import { logAuditEvent } from "./audit.service";
import { generateCsvString } from "./hr-registry.service";

export const CLEANING_AREAS = [
  { key: "securityCabinArea", name: "Security Cabin Area", code: 1 },
  { key: "etpArea", name: "ETP Area", code: 2 },
  { key: "tankFarmArea", name: "Tank Farm Area", code: 3 },
  { key: "materialVehicleEntryArea", name: "Material Entry / Vehicle Entry Area", code: 4 },
  { key: "bldg1StaircaseTerrace", name: "Building No.-01 Stair case and Terrace Area", code: 5 },
  { key: "maintenanceRoomArea", name: "Maintenance Room Area", code: 6 },
  { key: "roPlantArea", name: "RO Plant Area", code: 7 },
  { key: "bldg2StaircaseTerrace", name: "Building No.-02 Stair case and Terrace Area", code: 8 },
  { key: "bldg34EastSideArea", name: "Building No.-03/04 East Side Area", code: 9 },
  { key: "bldg34WestSideArea", name: "Building No.-03/04 West Side Area", code: 10 },
  { key: "psychometricEvaporatorPassage", name: "Psychometric Evaporator Passage Area", code: 11 },
  { key: "bldg34InBetweenArea", name: "Building No.-03/04 In Between Area", code: 12 },
  { key: "scrapYardArea", name: "Scrap Yard Area", code: 13 },
  { key: "bldg3StaircaseTerrace", name: "Building No.-03 Stair case and Terrace Area", code: 14 },
  { key: "bldg4StaircaseTerrace", name: "Building No.-04 Stair case and Terrace Area", code: 15 },
] as const;

export async function getDailyCleaningSheet(monthYear: string) {
  // Returns records for the month ordered by dayOfMonth asc
  const records = await prisma.dailyCleaningBuildingRecord.findMany({
    where: { monthYear },
    orderBy: { dayOfMonth: "asc" },
    include: { recordedBy: { select: { fullName: true } } },
  });

  const totalDaysInMonth = new Date(
    Number(monthYear.split("-")[0]),
    Number(monthYear.split("-")[1]),
    0
  ).getDate();

  return {
    records,
    monthYear,
    totalDaysInMonth,
    areas: CLEANING_AREAS,
    summary: {
      daysRecorded: records.length,
      completionRate: Math.round((records.length / totalDaysInMonth) * 100),
    },
  };
}

export async function upsertDailyCleaningDay(
  data: {
    monthYear: string;
    dayOfMonth: number;
    doneBy: string;
    checkedBy?: string;
    verifiedByQa?: string;
    remarks?: string;
    areas?: Record<string, boolean>;
  },
  user: SessionUser
) {
  const [year, month] = data.monthYear.split("-").map(Number);
  const date = new Date(year, month - 1, data.dayOfMonth);

  const areaStates = data.areas || {};

  const record = await prisma.dailyCleaningBuildingRecord.upsert({
    where: {
      monthYear_dayOfMonth: {
        monthYear: data.monthYear,
        dayOfMonth: data.dayOfMonth,
      },
    },
    create: {
      monthYear: data.monthYear,
      dayOfMonth: data.dayOfMonth,
      date,
      securityCabinArea: areaStates.securityCabinArea ?? true,
      etpArea: areaStates.etpArea ?? true,
      tankFarmArea: areaStates.tankFarmArea ?? true,
      materialVehicleEntryArea: areaStates.materialVehicleEntryArea ?? true,
      bldg1StaircaseTerrace: areaStates.bldg1StaircaseTerrace ?? true,
      maintenanceRoomArea: areaStates.maintenanceRoomArea ?? true,
      roPlantArea: areaStates.roPlantArea ?? true,
      bldg2StaircaseTerrace: areaStates.bldg2StaircaseTerrace ?? true,
      bldg34EastSideArea: areaStates.bldg34EastSideArea ?? true,
      bldg34WestSideArea: areaStates.bldg34WestSideArea ?? true,
      psychometricEvaporatorPassage: areaStates.psychometricEvaporatorPassage ?? true,
      bldg34InBetweenArea: areaStates.bldg34InBetweenArea ?? true,
      scrapYardArea: areaStates.scrapYardArea ?? true,
      bldg3StaircaseTerrace: areaStates.bldg3StaircaseTerrace ?? true,
      bldg4StaircaseTerrace: areaStates.bldg4StaircaseTerrace ?? true,
      doneBy: data.doneBy.trim(),
      checkedBy: data.checkedBy || "Ajinath Thombre",
      verifiedByQa: data.verifiedByQa || "Sankarsana Patra",
      remarks: data.remarks || null,
      recordedById: user.id,
    },
    update: {
      securityCabinArea: areaStates.securityCabinArea !== undefined ? areaStates.securityCabinArea : undefined,
      etpArea: areaStates.etpArea !== undefined ? areaStates.etpArea : undefined,
      tankFarmArea: areaStates.tankFarmArea !== undefined ? areaStates.tankFarmArea : undefined,
      materialVehicleEntryArea: areaStates.materialVehicleEntryArea !== undefined ? areaStates.materialVehicleEntryArea : undefined,
      bldg1StaircaseTerrace: areaStates.bldg1StaircaseTerrace !== undefined ? areaStates.bldg1StaircaseTerrace : undefined,
      maintenanceRoomArea: areaStates.maintenanceRoomArea !== undefined ? areaStates.maintenanceRoomArea : undefined,
      roPlantArea: areaStates.roPlantArea !== undefined ? areaStates.roPlantArea : undefined,
      bldg2StaircaseTerrace: areaStates.bldg2StaircaseTerrace !== undefined ? areaStates.bldg2StaircaseTerrace : undefined,
      bldg34EastSideArea: areaStates.bldg34EastSideArea !== undefined ? areaStates.bldg34EastSideArea : undefined,
      bldg34WestSideArea: areaStates.bldg34WestSideArea !== undefined ? areaStates.bldg34WestSideArea : undefined,
      psychometricEvaporatorPassage: areaStates.psychometricEvaporatorPassage !== undefined ? areaStates.psychometricEvaporatorPassage : undefined,
      bldg34InBetweenArea: areaStates.bldg34InBetweenArea !== undefined ? areaStates.bldg34InBetweenArea : undefined,
      scrapYardArea: areaStates.scrapYardArea !== undefined ? areaStates.scrapYardArea : undefined,
      bldg3StaircaseTerrace: areaStates.bldg3StaircaseTerrace !== undefined ? areaStates.bldg3StaircaseTerrace : undefined,
      bldg4StaircaseTerrace: areaStates.bldg4StaircaseTerrace !== undefined ? areaStates.bldg4StaircaseTerrace : undefined,
      doneBy: data.doneBy.trim(),
      checkedBy: data.checkedBy !== undefined ? data.checkedBy : undefined,
      verifiedByQa: data.verifiedByQa !== undefined ? data.verifiedByQa : undefined,
      remarks: data.remarks !== undefined ? data.remarks : undefined,
    },
  });

  await logAuditEvent({
    actorId: user.id,
    actorEmail: user.email,
    actorName: user.fullName,
    action: "RECORD_DAILY_CLEANING",
    entityType: "DAILY_CLEANING_BUILDING_RECORD",
    entityId: record.id,
    details: { monthYear: record.monthYear, day: record.dayOfMonth, doneBy: record.doneBy },
  });

  return record;
}

export async function verifyDailyCleaningMonth(
  monthYear: string,
  qaSignName: string,
  user: SessionUser
) {
  const updated = await prisma.dailyCleaningBuildingRecord.updateMany({
    where: { monthYear },
    data: { verifiedByQa: qaSignName },
  });

  await logAuditEvent({
    actorId: user.id,
    actorEmail: user.email,
    actorName: user.fullName,
    action: "VERIFY_DAILY_CLEANING_MONTH",
    entityType: "DAILY_CLEANING_BUILDING_RECORD",
    entityId: monthYear,
    details: { monthYear, verifiedBy: qaSignName, recordsCount: updated.count },
  });

  return updated;
}
