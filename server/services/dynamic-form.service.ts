import prisma from "@/lib/db";
import { logAuditEvent } from "./audit.service";

export interface FormFieldDefinition {
  key: string;
  label: string;
  type:
    | "text"
    | "textarea"
    | "integer"
    | "decimal"
    | "currency"
    | "date"
    | "datetime"
    | "boolean"
    | "select"
    | "multiselect"
    | "reference"
    | "attachment";
  required?: boolean;
  defaultValue?: any;
  options?: string[];
  referenceEntity?: string;
  unit?: string;
  helpText?: string;
  readOnly?: boolean;
  conditionalOn?: {
    fieldKey: string;
    operator: "equals" | "not_equals" | "contains";
    value: any;
  };
}

export interface FormSectionDefinition {
  id: string;
  title: string;
  description?: string;
  fields: FormFieldDefinition[];
}

export interface FormSchemaDefinition {
  sections: FormSectionDefinition[];
}

export async function publishFormVersion(params: {
  formDefinitionId: string;
  schema: FormSchemaDefinition;
  uiSchema?: Record<string, any>;
  actorId: string;
  actorEmail?: string;
  actorName?: string;
}) {
  return await prisma.$transaction(async (tx) => {
    // 1. Find max version number
    const latest = await tx.formVersion.findFirst({
      where: { formDefinitionId: params.formDefinitionId },
      orderBy: { version: "desc" },
    });

    const nextVersion = (latest?.version || 0) + 1;

    // Archive previous published versions
    await tx.formVersion.updateMany({
      where: { formDefinitionId: params.formDefinitionId, status: "PUBLISHED" },
      data: { status: "ARCHIVED" },
    });

    // Create new published version
    const newVersion = await tx.formVersion.create({
      data: {
        formDefinitionId: params.formDefinitionId,
        version: nextVersion,
        schema: params.schema as any,
        uiSchema: params.uiSchema as any,
        status: "PUBLISHED",
        publishedAt: new Date(),
        publishedById: params.actorId,
      },
    });

    await logAuditEvent({
      actorId: params.actorId,
      actorEmail: params.actorEmail,
      actorName: params.actorName,
      action: "PUBLISH_FORM_VERSION",
      entityType: "FORM_VERSION",
      entityId: newVersion.id,
      details: {
        formDefinitionId: params.formDefinitionId,
        version: nextVersion,
        sectionsCount: params.schema.sections.length,
      },
    });

    return newVersion;
  });
}

export async function getActiveFormDefinition(code: string) {
  const form = await prisma.formDefinition.findUnique({
    where: { code },
    include: {
      versions: {
        where: { status: "PUBLISHED" },
        orderBy: { version: "desc" },
        take: 1,
      },
    },
  });

  if (!form || form.versions.length === 0) return null;

  return {
    id: form.id,
    code: form.code,
    name: form.name,
    entityType: form.entityType,
    version: form.versions[0].version,
    versionId: form.versions[0].id,
    schema: form.versions[0].schema as unknown as FormSchemaDefinition,
    uiSchema: form.versions[0].uiSchema as unknown as Record<string, any>,
  };
}
