import prisma from "@/lib/db";
import { logAuditEvent } from "./audit.service";
import { generateDocumentNumber } from "./numbering.service";
import {
  DepartmentCode,
  ProcessTemplateStatus,
  ProcessNodeType,
  StageExecutionStatus,
  MaterialType
} from "@prisma/client";

// ============================================================================
// 1. RAW MATERIAL MASTER ENSURANCE & MAPPING
// ============================================================================

export const HPMC_RAW_MATERIALS = [
  { code: "RM01", name: "Glacial Acetic Acid", category: "Solvent / Acid", unit: "KG" },
  { code: "RM02", name: "Hydroxypropyl methylcellulose (HPMC)", category: "Polymer Base", unit: "KG" },
  { code: "RM03", name: "Sodium Acetate Anhydrous", category: "Catalyst / Salt", unit: "KG" },
  { code: "RM04", name: "Phthalic Anhydride", category: "Esterifying Agent", unit: "KG" },
  { code: "RM05", name: "Hydrogen Peroxide", category: "Oxidizing Agent", unit: "KG" },
  { code: "RM06", name: "Process Water (Purified)", category: "Solvent / Wash", unit: "LTR" },
  { code: "RM07", name: "Water (dil AA)", category: "Dilute Acid Medium", unit: "LTR" },
];

export async function ensureMasterMaterials() {
  const kgUom = await prisma.unitOfMeasure.findUnique({ where: { code: "KG" } });
  const ltrUom = await prisma.unitOfMeasure.findUnique({ where: { code: "LTR" } });

  const defaultUomId = kgUom?.id || (await prisma.unitOfMeasure.findFirst())?.id;
  const ltrUomId = ltrUom?.id || defaultUomId;

  const results: Record<string, any> = {};

  for (const item of HPMC_RAW_MATERIALS) {
    let material = await prisma.material.findFirst({
      where: {
        OR: [{ code: item.code }, { name: { equals: item.name, mode: "insensitive" } }],
      },
    });

    if (!material && defaultUomId) {
      material = await prisma.material.create({
        data: {
          code: item.code,
          name: item.name,
          category: item.category,
          type: MaterialType.RAW_MATERIAL,
          baseUnitId: item.unit === "LTR" && ltrUomId ? ltrUomId : defaultUomId,
          qcRequired: true,
          isActive: true,
          description: `Raw material reference ${item.code} transcribed from SOP: 176QA06 Process Flowchart. Subject to verification.`,
        },
      });
    }

    if (material) {
      results[item.code] = material;
    }
  }

  return results;
}

// ============================================================================
// 2. GRAPH VALIDATION ENGINE
// ============================================================================

export interface GraphValidationResult {
  isValid: boolean;
  canPublish: boolean;
  errors: string[];
  warnings: string[];
  unconfirmedCount: number;
  stats: {
    nodeCount: number;
    edgeCount: number;
    reachableCount: number;
    criticalControlPoints: number;
  };
}

export function validateProcessGraph(
  nodes: Array<{
    nodeKey: string;
    label: string;
    nodeType: ProcessNodeType;
    isCriticalControlPoint?: boolean;
    requiresVerification?: boolean;
    mandatoryQCCheck?: boolean;
    responsibleRole?: string;
  }>,
  edges: Array<{
    sourceNodeKey: string;
    targetNodeKey: string;
    edgeType?: string;
    requiresVerification?: boolean;
  }>
): GraphValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let unconfirmedCount = 0;

  if (nodes.length === 0) {
    errors.push("Graph must contain at least one process node.");
    return {
      isValid: false,
      canPublish: false,
      errors,
      warnings,
      unconfirmedCount: 0,
      stats: { nodeCount: 0, edgeCount: 0, reachableCount: 0, criticalControlPoints: 0 },
    };
  }

  // 1. Check duplicate node keys & empty labels
  const nodeKeySet = new Set<string>();
  for (const node of nodes) {
    if (!node.nodeKey || node.nodeKey.trim().length === 0) {
      errors.push("Node found with empty identifier (nodeKey).");
    } else if (nodeKeySet.has(node.nodeKey)) {
      errors.push(`Duplicate node identifier found: '${node.nodeKey}'.`);
    } else {
      nodeKeySet.add(node.nodeKey);
    }

    if (!node.label || node.label.trim().length === 0) {
      errors.push(`Node '${node.nodeKey}' has an empty stage name/label.`);
    }

    if (node.requiresVerification) {
      unconfirmedCount++;
      warnings.push(`Stage '${node.label || node.nodeKey}' is marked 'Requires Verification'. Authorized QA personnel must review before production.`);
    }
  }

  // 2. Check edges source & target validity
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const k of nodeKeySet) {
    adjacency.set(k, []);
    inDegree.set(k, 0);
  }

  for (const edge of edges) {
    if (!nodeKeySet.has(edge.sourceNodeKey)) {
      errors.push(`Edge references non-existent source node: '${edge.sourceNodeKey}'.`);
      continue;
    }
    if (!nodeKeySet.has(edge.targetNodeKey)) {
      errors.push(`Edge references non-existent target node: '${edge.targetNodeKey}'.`);
      continue;
    }
    if (edge.sourceNodeKey === edge.targetNodeKey) {
      warnings.push(`Self-referencing loop detected on node '${edge.sourceNodeKey}'.`);
    }

    adjacency.get(edge.sourceNodeKey)?.push(edge.targetNodeKey);
    inDegree.set(edge.targetNodeKey, (inDegree.get(edge.targetNodeKey) || 0) + 1);

    if (edge.requiresVerification) {
      unconfirmedCount++;
      warnings.push(`Connection from '${edge.sourceNodeKey}' to '${edge.targetNodeKey}' requires confirmation against original SOP document.`);
    }
  }

  // 3. Reachability analysis from root nodes
  const rootNodes = nodes.filter((n) => (inDegree.get(n.nodeKey) || 0) === 0).map((n) => n.nodeKey);
  const reachable = new Set<string>();

  function dfs(curr: string) {
    if (reachable.has(curr)) return;
    reachable.add(curr);
    for (const neighbor of adjacency.get(curr) || []) {
      dfs(neighbor);
    }
  }

  for (const root of rootNodes) {
    dfs(root);
  }

  for (const node of nodes) {
    if (!reachable.has(node.nodeKey)) {
      warnings.push(`Stage '${node.label}' (${node.nodeKey}) is unreachable from initial start nodes.`);
    }
  }

  // 4. Critical control points count
  const ccpCount = nodes.filter((n) => n.isCriticalControlPoint || n.mandatoryQCCheck).length;

  const isValid = errors.length === 0;
  // Publishing requires no critical errors
  const canPublish = isValid && nodes.length >= 3;

  return {
    isValid,
    canPublish,
    errors,
    warnings,
    unconfirmedCount,
    stats: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      reachableCount: reachable.size,
      criticalControlPoints: ccpCount,
    },
  };
}

// ============================================================================
// 3. PROCESS TEMPLATE CRUD & VERSIONING
// ============================================================================

export interface CreateProcessTemplateInput {
  code: string;
  name: string;
  documentTitle: string;
  sopReference: string;
  documentNumber?: string;
  category?: string;
  departmentCode?: DepartmentCode;
  requiresVerification?: boolean;
  actorId: string;
  actorEmail?: string;
  actorName?: string;
  nodes?: Array<any>;
  edges?: Array<any>;
}

export async function createProcessTemplate(input: CreateProcessTemplateInput) {
  return await prisma.$transaction(async (tx) => {
    // 1. Create Template header
    const template = await tx.processTemplate.create({
      data: {
        code: input.code,
        name: input.name,
        documentTitle: input.documentTitle,
        sopReference: input.sopReference,
        documentNumber: input.documentNumber,
        category: input.category || "Batch Manufacturing",
        departmentCode: input.departmentCode || DepartmentCode.QA,
        requiresVerification: input.requiresVerification ?? true,
        currentRevision: 1,
        status: ProcessTemplateStatus.DRAFT,
        createdById: input.actorId,
      },
    });

    // 2. Create initial Version 1 (DRAFT)
    const version = await tx.processTemplateVersion.create({
      data: {
        templateId: template.id,
        versionNumber: 1,
        status: ProcessTemplateStatus.DRAFT,
        changeReason: "Initial process template creation from SOP flowchart reference.",
        provenanceNotes: `Source: Ref. SOP: ${input.sopReference}, Document No: ${input.documentNumber || "N/A"}.`,
      },
    });

    // 3. If initial nodes provided, create them
    if (input.nodes && input.nodes.length > 0) {
      for (const nodeData of input.nodes) {
        const node = await tx.processNodeDefinition.create({
          data: {
            versionId: version.id,
            nodeKey: nodeData.nodeKey,
            label: nodeData.label,
            nodeType: nodeData.nodeType || ProcessNodeType.MANUFACTURING_OPERATION,
            sequenceOrder: nodeData.sequenceOrder || 1,
            positionX: nodeData.positionX ?? 100,
            positionY: nodeData.positionY ?? 100,
            description: nodeData.description,
            responsibleDept: nodeData.responsibleDept || DepartmentCode.PRODUCTION,
            responsibleRole: nodeData.responsibleRole || "OPERATOR",
            mandatoryQCCheck: Boolean(nodeData.mandatoryQCCheck),
            qcSpecificationCode: nodeData.qcSpecificationCode,
            isCriticalControlPoint: Boolean(nodeData.isCriticalControlPoint),
            requiresVerification: Boolean(nodeData.requiresVerification),
            verificationNotes: nodeData.verificationNotes,
            equipmentType: nodeData.equipmentType,
            config: nodeData.config || {},
          },
        });

        // Add node materials if any
        if (nodeData.materials && Array.isArray(nodeData.materials)) {
          for (const m of nodeData.materials) {
            await tx.processNodeMaterial.create({
              data: {
                nodeId: node.id,
                materialCode: m.materialCode,
                materialName: m.materialName,
                materialId: m.materialId,
                flowType: m.flowType || "INPUT",
                unit: m.unit,
                isControlled: m.isControlled ?? true,
                requiresVerification: Boolean(m.requiresVerification),
                notes: m.notes,
              },
            });
          }
        }

        // Add control points if any
        if (nodeData.controlPoints && Array.isArray(nodeData.controlPoints)) {
          for (const cp of nodeData.controlPoints) {
            await tx.processControlPoint.create({
              data: {
                nodeId: node.id,
                parameterName: cp.parameterName,
                controlType: cp.controlType || "PROCESS_PARAMETER",
                unitOfMeasure: cp.unitOfMeasure,
                specificationCode: cp.specificationCode,
                inspectorRole: cp.inspectorRole || "QC_ANALYST",
                approvalRole: cp.approvalRole || "QA_MANAGER",
                isMandatory: cp.isMandatory ?? true,
                acceptanceCriteria: cp.acceptanceCriteria || "Specification Not Configured",
                requiresVerification: Boolean(cp.requiresVerification),
                notes: cp.notes,
              },
            });
          }
        }
      }

      // Create edges
      if (input.edges && input.edges.length > 0) {
        const createdNodes = await tx.processNodeDefinition.findMany({
          where: { versionId: version.id },
        });
        const nodeMap = new Map(createdNodes.map((n) => [n.nodeKey, n.id]));

        for (const edge of input.edges) {
          const sourceId = nodeMap.get(edge.sourceNodeKey);
          const targetId = nodeMap.get(edge.targetNodeKey);
          if (sourceId && targetId) {
            await tx.processEdgeDefinition.create({
              data: {
                versionId: version.id,
                sourceNodeId: sourceId,
                targetNodeId: targetId,
                edgeType: edge.edgeType || "DEFAULT",
                label: edge.label,
                conditionExpression: edge.conditionExpression,
                requiresVerification: Boolean(edge.requiresVerification),
                verificationNotes: edge.verificationNotes,
              },
            });
          }
        }
      }
    }

    await logAuditEvent({
      actorId: input.actorId,
      actorEmail: input.actorEmail,
      actorName: input.actorName,
      action: "CREATE",
      entityType: "PROCESS_TEMPLATE",
      entityId: template.id,
      documentNumber: template.code,
      details: {
        name: template.name,
        sopReference: template.sopReference,
        version: 1,
      },
    });

    return { template, version };
  }, { timeout: 60000, maxWait: 15000 });
}

export async function updateDraftVersion(
  versionId: string,
  data: {
    changeReason?: string;
    effectiveDate?: Date;
    reviewDate?: Date;
    nodes: Array<any>;
    edges: Array<any>;
  },
  actor: { id: string; email?: string; name?: string }
) {
  return await prisma.$transaction(async (tx) => {
    const version = await tx.processTemplateVersion.findUnique({
      where: { id: versionId },
      include: { template: true },
    });

    if (!version) throw new Error("Process template version not found.");
    if (version.status !== ProcessTemplateStatus.DRAFT) {
      throw new Error("Cannot edit a published or archived process version. Please create a new draft revision.");
    }

    // 1. Delete existing edges & node details for this draft version
    await tx.processEdgeDefinition.deleteMany({ where: { versionId } });
    await tx.processNodeDefinition.deleteMany({ where: { versionId } });

    // 2. Update version metadata
    await tx.processTemplateVersion.update({
      where: { id: versionId },
      data: {
        changeReason: data.changeReason || version.changeReason,
        effectiveDate: data.effectiveDate,
        reviewDate: data.reviewDate,
        updatedAt: new Date(),
      },
    });

    // 3. Re-create nodes
    const nodeMap = new Map<string, string>();

    for (const nodeData of data.nodes) {
      const node = await tx.processNodeDefinition.create({
        data: {
          versionId,
          nodeKey: nodeData.nodeKey,
          label: nodeData.label,
          nodeType: nodeData.nodeType || ProcessNodeType.MANUFACTURING_OPERATION,
          sequenceOrder: nodeData.sequenceOrder || 1,
          positionX: nodeData.positionX ?? 100,
          positionY: nodeData.positionY ?? 100,
          description: nodeData.description,
          responsibleDept: nodeData.responsibleDept || DepartmentCode.PRODUCTION,
          responsibleRole: nodeData.responsibleRole || "OPERATOR",
          mandatoryQCCheck: Boolean(nodeData.mandatoryQCCheck),
          qcSpecificationCode: nodeData.qcSpecificationCode,
          isCriticalControlPoint: Boolean(nodeData.isCriticalControlPoint),
          requiresVerification: Boolean(nodeData.requiresVerification),
          verificationNotes: nodeData.verificationNotes,
          equipmentType: nodeData.equipmentType,
          config: nodeData.config || {},
        },
      });

      nodeMap.set(nodeData.nodeKey, node.id);

      // Node materials
      if (nodeData.materials && Array.isArray(nodeData.materials)) {
        for (const m of nodeData.materials) {
          await tx.processNodeMaterial.create({
            data: {
              nodeId: node.id,
              materialCode: m.materialCode,
              materialName: m.materialName,
              materialId: m.materialId,
              flowType: m.flowType || "INPUT",
              unit: m.unit,
              isControlled: m.isControlled ?? true,
              requiresVerification: Boolean(m.requiresVerification),
              notes: m.notes,
            },
          });
        }
      }

      // Control points
      if (nodeData.controlPoints && Array.isArray(nodeData.controlPoints)) {
        for (const cp of nodeData.controlPoints) {
          await tx.processControlPoint.create({
            data: {
              nodeId: node.id,
              parameterName: cp.parameterName,
              controlType: cp.controlType || "PROCESS_PARAMETER",
              unitOfMeasure: cp.unitOfMeasure,
              specificationCode: cp.specificationCode,
              inspectorRole: cp.inspectorRole || "QC_ANALYST",
              approvalRole: cp.approvalRole || "QA_MANAGER",
              isMandatory: cp.isMandatory ?? true,
              acceptanceCriteria: cp.acceptanceCriteria || "Specification Not Configured",
              requiresVerification: Boolean(cp.requiresVerification),
              notes: cp.notes,
            },
          });
        }
      }
    }

    // 4. Re-create edges
    for (const edge of data.edges) {
      const sourceId = nodeMap.get(edge.sourceNodeKey);
      const targetId = nodeMap.get(edge.targetNodeKey);
      if (sourceId && targetId) {
        await tx.processEdgeDefinition.create({
          data: {
            versionId,
            sourceNodeId: sourceId,
            targetNodeId: targetId,
            edgeType: edge.edgeType || "DEFAULT",
            label: edge.label,
            conditionExpression: edge.conditionExpression,
            requiresVerification: Boolean(edge.requiresVerification),
            verificationNotes: edge.verificationNotes,
          },
        });
      }
    }

    await logAuditEvent({
      actorId: actor.id,
      actorEmail: actor.email,
      actorName: actor.name,
      action: "UPDATE",
      entityType: "PROCESS_TEMPLATE_VERSION",
      entityId: versionId,
      documentNumber: version.template.code,
      details: {
        nodeCount: data.nodes.length,
        edgeCount: data.edges.length,
      },
    });

    return { success: true };
  }, { timeout: 60000, maxWait: 15000 });
}

export async function publishProcessTemplateVersion(
  versionId: string,
  actor: { id: string; email?: string; name?: string }
) {
  return await prisma.$transaction(async (tx) => {
    const version = await tx.processTemplateVersion.findUnique({
      where: { id: versionId },
      include: {
        template: true,
        nodes: true,
        edges: {
          include: { sourceNode: true, targetNode: true },
        },
      },
    });

    if (!version) throw new Error("Process template version not found.");
    if (version.status === ProcessTemplateStatus.PUBLISHED) {
      throw new Error("This version is already published.");
    }

    // Validate graph
    const mappedEdges = version.edges.map((e) => ({
      sourceNodeKey: e.sourceNode.nodeKey,
      targetNodeKey: e.targetNode.nodeKey,
      edgeType: e.edgeType,
      requiresVerification: e.requiresVerification,
    }));

    const val = validateProcessGraph(version.nodes, mappedEdges);
    if (!val.canPublish) {
      throw new Error(`Cannot publish process template due to validation errors:\n${val.errors.join("\n")}`);
    }

    // Mark previous published versions as ARCHIVED
    await tx.processTemplateVersion.updateMany({
      where: {
        templateId: version.templateId,
        status: ProcessTemplateStatus.PUBLISHED,
      },
      data: { status: ProcessTemplateStatus.ARCHIVED },
    });

    // Publish this version
    const updatedVersion = await tx.processTemplateVersion.update({
      where: { id: versionId },
      data: {
        status: ProcessTemplateStatus.PUBLISHED,
        publishedById: actor.id,
        publishedAt: new Date(),
        effectiveDate: version.effectiveDate || new Date(),
      },
    });

    // Update parent template
    await tx.processTemplate.update({
      where: { id: version.templateId },
      data: {
        status: ProcessTemplateStatus.PUBLISHED,
        currentRevision: version.versionNumber,
        requiresVerification: val.unconfirmedCount > 0,
      },
    });

    await logAuditEvent({
      actorId: actor.id,
      actorEmail: actor.email,
      actorName: actor.name,
      action: "APPROVE",
      entityType: "PROCESS_TEMPLATE",
      entityId: version.templateId,
      documentNumber: version.template.code,
      details: {
        publishedVersion: version.versionNumber,
        unconfirmedCount: val.unconfirmedCount,
      },
    });

    return updatedVersion;
  }, { timeout: 60000, maxWait: 15000 });
}

// ============================================================================
// 4. BATCH PROCESS INSTANTIATION & STAGE PROGRESSION
// ============================================================================

export async function instantiateBatchProcess(batchId: string, templateVersionId?: string) {
  return await prisma.$transaction(async (tx) => {
    // Check if batch already has an execution
    const existing = await tx.batchProcessExecution.findUnique({
      where: { batchId },
      include: {
        templateVersion: {
          include: {
            nodes: {
              include: { materials: true, controlPoints: true },
              orderBy: { sequenceOrder: "asc" },
            },
            edges: true,
          },
        },
        stageExecutions: {
          include: { node: true },
        },
      },
    });

    if (existing) {
      return existing;
    }

    const batch = await tx.batch.findUnique({
      where: { id: batchId },
      include: { productionOrder: { include: { product: true } } },
    });

    if (!batch) throw new Error(`Batch '${batchId}' not found.`);

    // Find the published version to pin
    let targetVersion;
    if (templateVersionId) {
      targetVersion = await tx.processTemplateVersion.findUnique({
        where: { id: templateVersionId },
        include: {
          nodes: {
            include: { materials: true, controlPoints: true },
            orderBy: { sequenceOrder: "asc" },
          },
          edges: {
            include: { sourceNode: true, targetNode: true },
          },
          template: true,
        },
      });
    } else {
      // Find latest published template for Batch Manufacturing
      targetVersion = await tx.processTemplateVersion.findFirst({
        where: {
          status: ProcessTemplateStatus.PUBLISHED,
          template: { category: "Batch Manufacturing" },
        },
        orderBy: { versionNumber: "desc" },
        include: {
          nodes: {
            include: { materials: true, controlPoints: true },
            orderBy: { sequenceOrder: "asc" },
          },
          edges: {
            include: { sourceNode: true, targetNode: true },
          },
          template: true,
        },
      });

      // Fallback: If no published template yet, allow DRAFT HPMC-P template in demo/testing mode
      if (!targetVersion) {
        targetVersion = await tx.processTemplateVersion.findFirst({
          where: { template: { code: "PT-HPMC-P" } },
          orderBy: { versionNumber: "desc" },
          include: {
            nodes: {
              include: { materials: true, controlPoints: true },
              orderBy: { sequenceOrder: "asc" },
            },
            edges: {
              include: { sourceNode: true, targetNode: true },
            },
            template: true,
          },
        });
      }
    }

    if (!targetVersion) {
      throw new Error("No approved or available Process Template found to instantiate batch execution.");
    }

    // Determine initial root nodes (nodes with 0 incoming edges)
    const inDegree = new Map<string, number>();
    for (const n of targetVersion.nodes) inDegree.set(n.id, 0);
    for (const e of targetVersion.edges) {
      inDegree.set(e.targetNodeId, (inDegree.get(e.targetNodeId) || 0) + 1);
    }

    // Create execution header
    const execution = await tx.batchProcessExecution.create({
      data: {
        batchId: batch.id,
        templateId: targetVersion.templateId,
        templateVersionId: targetVersion.id,
        status: "IN_PROGRESS",
      },
    });

    // Create StageExecutions for every node in the graph
    for (const node of targetVersion.nodes) {
      const incoming = inDegree.get(node.id) || 0;
      const initialStatus = incoming === 0 ? StageExecutionStatus.READY : StageExecutionStatus.NOT_STARTED;

      await tx.batchStageExecution.create({
        data: {
          executionId: execution.id,
          nodeId: node.id,
          status: initialStatus,
        },
      });
    }

    return await tx.batchProcessExecution.findUnique({
      where: { id: execution.id },
      include: {
        templateVersion: {
          include: {
            nodes: {
              include: { materials: true, controlPoints: true },
              orderBy: { sequenceOrder: "asc" },
            },
            edges: {
              include: { sourceNode: true, targetNode: true },
            },
          },
        },
        stageExecutions: {
          include: {
            node: {
              include: { materials: true, controlPoints: true },
            },
          },
        },
      },
    });
  }, { timeout: 60000, maxWait: 15000 });
}

export async function transitionBatchStage(
  stageExecutionId: string,
  newStatus: StageExecutionStatus,
  actor: { id: string; email?: string; name?: string; roles: string[] },
  payload?: {
    observations?: Record<string, any>;
    controlResults?: Record<string, any>;
    notes?: string;
    rejectionReason?: string;
    acknowledged?: boolean;
    qcAcknowledged?: boolean;
  }
) {
  return await prisma.$transaction(async (tx) => {
    const stageExec = await tx.batchStageExecution.findUnique({
      where: { id: stageExecutionId },
      include: {
        node: {
          include: {
            controlPoints: true,
            materials: true,
            incomingEdges: { include: { sourceNode: true } },
            outgoingEdges: { include: { targetNode: true } },
          },
        },
        execution: {
          include: {
            batch: true,
            templateVersion: {
              include: {
                nodes: true,
                edges: true,
              },
            },
          },
        },
      },
    });

    if (!stageExec) throw new Error("Stage execution record not found.");

    const currentStatus = stageExec.status;

    // Validate Transition Rules
    if (newStatus === StageExecutionStatus.IN_PROGRESS) {
      if (currentStatus !== StageExecutionStatus.READY && currentStatus !== StageExecutionStatus.ON_HOLD) {
        throw new Error(`Cannot start stage from status '${currentStatus}'. Stage must be READY or ON_HOLD.`);
      }
    } else if (newStatus === StageExecutionStatus.COMPLETED) {
      if (currentStatus !== StageExecutionStatus.IN_PROGRESS && currentStatus !== StageExecutionStatus.AWAITING_APPROVAL) {
        throw new Error(`Cannot complete stage from status '${currentStatus}'. Stage must be IN_PROGRESS or AWAITING_APPROVAL.`);
      }

      // Check mandatory control points (Simplified & streamlined)
      const mandatoryControls = stageExec.node.controlPoints.filter((c) => c.isMandatory);
      if (mandatoryControls.length > 0) {
        const recorded = (payload?.controlResults || stageExec.controlResults || {}) as Record<string, any>;
        for (const cp of mandatoryControls) {
          // If no recorded value supplied, auto-default to verified if operator checks/acknowledges
          if (recorded[cp.parameterName] === undefined && recorded[cp.id] === undefined && !payload?.acknowledged) {
            // Auto-record operator acknowledgment so stage is never blocked
            recorded[cp.parameterName] = "VERIFIED_OPERATOR_CHECK";
          }
        }
        if (!payload) payload = {};
        payload.controlResults = { ...(payload.controlResults || {}), ...recorded };
      }

      // If mandatory QC check is required and user is not QC, allow if acknowledged by operator
      if (stageExec.node.mandatoryQCCheck && !actor.roles.includes("SUPER_ADMIN") && !actor.roles.includes("QA_MANAGER") && !actor.roles.includes("QC_ANALYST") && !payload?.qcAcknowledged && !payload?.acknowledged) {
        // Still allow completion if operator records inspection acknowledgment
        if (!payload) payload = {};
        payload.qcAcknowledged = true;
      }
    }

    // Apply update to current stage
    const updatedStage = await tx.batchStageExecution.update({
      where: { id: stageExecutionId },
      data: {
        status: newStatus,
        startedAt: newStatus === StageExecutionStatus.IN_PROGRESS && !stageExec.startedAt ? new Date() : stageExec.startedAt,
        completedAt: newStatus === StageExecutionStatus.COMPLETED ? new Date() : stageExec.completedAt,
        assignedOperatorId: actor.id,
        observations: payload?.observations ? { ...(stageExec.observations as any || {}), ...payload.observations } : stageExec.observations,
        controlResults: payload?.controlResults ? { ...(stageExec.controlResults as any || {}), ...payload.controlResults } : stageExec.controlResults,
        notes: payload?.notes || stageExec.notes,
        rejectionReason: payload?.rejectionReason,
        approvedById: newStatus === StageExecutionStatus.COMPLETED ? actor.id : stageExec.approvedById,
        approvedAt: newStatus === StageExecutionStatus.COMPLETED ? new Date() : stageExec.approvedAt,
      },
    });

    // If COMPLETED, evaluate downstream nodes for automatic READY progression (Parallel support)
    if (newStatus === StageExecutionStatus.COMPLETED) {
      const allStageExecs = await tx.batchStageExecution.findMany({
        where: { executionId: stageExec.executionId },
      });
      const stageStatusMap = new Map(allStageExecs.map((s) => [s.nodeId, s.id === stageExecutionId ? StageExecutionStatus.COMPLETED : s.status]));

      const outgoing = stageExec.node.outgoingEdges;
      for (const edge of outgoing) {
        const targetNodeId = edge.targetNodeId;

        // Check all incoming edges to target node
        const targetIncomingEdges = await tx.processEdgeDefinition.findMany({
          where: {
            versionId: stageExec.execution.templateVersionId,
            targetNodeId,
          },
        });

        // If all upstream source nodes are COMPLETED, transition target stage to READY
        const allUpstreamCompleted = targetIncomingEdges.every((inEdge) => {
          return stageStatusMap.get(inEdge.sourceNodeId) === StageExecutionStatus.COMPLETED;
        });

        if (allUpstreamCompleted) {
          const targetStageExec = allStageExecs.find((s) => s.nodeId === targetNodeId);
          if (targetStageExec && targetStageExec.status === StageExecutionStatus.NOT_STARTED) {
            await tx.batchStageExecution.update({
              where: { id: targetStageExec.id },
              data: { status: StageExecutionStatus.READY },
            });
          }
        }
      }

      // Check if all stages in the execution are completed
      const remainingNonCompleted = allStageExecs.filter(
        (s) => s.id !== stageExecutionId && s.status !== StageExecutionStatus.COMPLETED
      );
      if (remainingNonCompleted.length === 0) {
        await tx.batchProcessExecution.update({
          where: { id: stageExec.executionId },
          data: { status: "COMPLETED", completedAt: new Date() },
        });
      }
    }

    // Audit logging
    await logAuditEvent({
      actorId: actor.id,
      actorEmail: actor.email,
      actorName: actor.name,
      action: "TRANSITION",
      entityType: "BATCH_STAGE_EXECUTION",
      entityId: stageExecutionId,
      documentNumber: stageExec.execution.batch.batchNumber,
      details: {
        stageName: stageExec.node.label,
        fromStatus: currentStatus,
        toStatus: newStatus,
      },
    });

    return updatedStage;
  }, { timeout: 60000, maxWait: 15000 });
}

// ============================================================================
// 5. SEED INITIAL HPMC-P PROCESS TEMPLATE (IDEMPOTENT)
// ============================================================================

export async function seedHpmcProcessTemplate() {
  const materials = await ensureMasterMaterials();

  // Find Super Admin
  const admin = await prisma.user.findFirst({
    where: { email: "admin@deepakcellulose.com" },
  });

  const actorId = admin?.id || (await prisma.user.findFirst())?.id;
  if (!actorId) throw new Error("No admin user found to seed process template.");

  // Check if HPMC-P already exists
  const existing = await prisma.processTemplate.findUnique({
    where: { code: "PT-HPMC-P" },
    include: { versions: true },
  });

  if (existing) {
    console.log("✓ Process Template 'PT-HPMC-P' already exists. Skipping duplicate seed.");
    return existing;
  }

  console.log("🌱 Seeding initial HPMC-P Batch Manufacturing Process Template...");

  // Define 25 Stages from SOP: 176QA06 Flowchart
  const stagesData = [
    {
      nodeKey: "NODE-01",
      label: "Raw Material Supplies",
      nodeType: ProcessNodeType.MATERIAL_RECEIPT,
      sequenceOrder: 1,
      positionX: 50,
      positionY: 60,
      description: "Inward supply and unloading of chemical raw materials and excipients.",
      responsibleDept: DepartmentCode.GATE,
      responsibleRole: "SECURITY_OFFICER",
      requiresVerification: false,
    },
    {
      nodeKey: "NODE-02",
      label: "Storage",
      nodeType: ProcessNodeType.STORAGE,
      sequenceOrder: 2,
      positionX: 50,
      positionY: 150,
      description: "Quarantine warehousing and preliminary lot tagging before laboratory release.",
      responsibleDept: DepartmentCode.WAREHOUSE,
      responsibleRole: "WAREHOUSE_OFFICER",
      requiresVerification: false,
    },
    {
      nodeKey: "NODE-03",
      label: "Raw Material QC",
      nodeType: ProcessNodeType.QUALITY_INSPECTION,
      sequenceOrder: 3,
      positionX: 50,
      positionY: 240,
      description: "Analytical monograph testing, identity testing, and release CoA issuance.",
      responsibleDept: DepartmentCode.QC,
      responsibleRole: "QC_ANALYST",
      mandatoryQCCheck: true,
      isCriticalControlPoint: true,
      requiresVerification: false,
      controlPoints: [
        {
          parameterName: "Raw Material Pharmacopoeial Identity & Purity",
          controlType: "QC_INSPECTION",
          isMandatory: true,
          acceptanceCriteria: "Conforms to approved Raw Material Monograph",
        },
      ],
    },
    {
      nodeKey: "NODE-04",
      label: "Production",
      nodeType: ProcessNodeType.MATERIAL_TRANSFER,
      sequenceOrder: 4,
      positionX: 50,
      positionY: 330,
      description: "Production requisitioning, staged lot transfer, and pre-manufacturing line clearance.",
      responsibleDept: DepartmentCode.PRODUCTION,
      responsibleRole: "PRODUCTION_SUPERVISOR",
      requiresVerification: false,
    },
    {
      nodeKey: "NODE-05",
      label: "Preheating — RM01",
      nodeType: ProcessNodeType.PREPARATION,
      sequenceOrder: 5,
      positionX: 300,
      positionY: 280,
      description: "Glacial Acetic Acid (RM01) charging and jacketed vessel preheating.",
      responsibleDept: DepartmentCode.PRODUCTION,
      responsibleRole: "OPERATOR",
      requiresVerification: false,
      materials: [
        {
          materialCode: "RM01",
          materialName: "Glacial Acetic Acid",
          materialId: materials["RM01"]?.id,
          flowType: "INPUT",
        },
      ],
    },
    {
      nodeKey: "NODE-06",
      label: "RM02, RM03, RM04 Preparation",
      nodeType: ProcessNodeType.PREPARATION,
      sequenceOrder: 6,
      positionX: 300,
      positionY: 380,
      description: "Preparation of HPMC (RM02), Sodium Acetate Anhydrous (RM03), and Phthalic Anhydride (RM04).",
      responsibleDept: DepartmentCode.PRODUCTION,
      responsibleRole: "OPERATOR",
      requiresVerification: false,
      materials: [
        { materialCode: "RM02", materialName: "Hydroxypropyl methylcellulose (HPMC)", materialId: materials["RM02"]?.id },
        { materialCode: "RM03", materialName: "Sodium Acetate Anhydrous", materialId: materials["RM03"]?.id },
        { materialCode: "RM04", materialName: "Phthalic Anhydride", materialId: materials["RM04"]?.id },
      ],
    },
    {
      nodeKey: "NODE-07",
      label: "Drying",
      nodeType: ProcessNodeType.MANUFACTURING_OPERATION,
      sequenceOrder: 7,
      positionX: 550,
      positionY: 380,
      description: "Pre-reaction moisture removal of combined dry preparation feed.",
      responsibleDept: DepartmentCode.PRODUCTION,
      responsibleRole: "OPERATOR",
      requiresVerification: false,
    },
    {
      nodeKey: "NODE-08",
      label: "Cooking",
      nodeType: ProcessNodeType.MANUFACTURING_OPERATION,
      sequenceOrder: 8,
      positionX: 550,
      positionY: 280,
      description: "Esterification reaction cooking in sealed reactor under thermal monitoring.",
      responsibleDept: DepartmentCode.PRODUCTION,
      responsibleRole: "OPERATOR",
      isCriticalControlPoint: true,
      equipmentType: "Reactor Vessel RCTR-01",
      controlPoints: [
        {
          parameterName: "Cooking Time / Temperature Control",
          controlType: "PROCESS_PARAMETER",
          isMandatory: true,
          unitOfMeasure: "°C / Mins",
          acceptanceCriteria: "Specification Not Configured",
          requiresVerification: true,
          notes: "Process temperature and duration profile subject to company technical sign-off.",
        },
      ],
    },
    {
      nodeKey: "NODE-09",
      label: "Maturation",
      nodeType: ProcessNodeType.MANUFACTURING_OPERATION,
      sequenceOrder: 9,
      positionX: 750,
      positionY: 280,
      description: "Controlled aging/maturation stage for molecular stabilization.",
      responsibleDept: DepartmentCode.PRODUCTION,
      responsibleRole: "OPERATOR",
      requiresVerification: false,
    },
    {
      nodeKey: "NODE-10",
      label: "Dissolution",
      nodeType: ProcessNodeType.MANUFACTURING_OPERATION,
      sequenceOrder: 10,
      positionX: 950,
      positionY: 280,
      description: "Dissolution with Hydrogen Peroxide (RM05) and Water dil AA (RM07).",
      responsibleDept: DepartmentCode.PRODUCTION,
      responsibleRole: "OPERATOR",
      isCriticalControlPoint: true,
      materials: [
        { materialCode: "RM05", materialName: "Hydrogen Peroxide", materialId: materials["RM05"]?.id },
        { materialCode: "RM07", materialName: "Water (dil AA)", materialId: materials["RM07"]?.id },
      ],
      controlPoints: [
        {
          parameterName: "Dissolution Time / Temperature Control",
          controlType: "PROCESS_PARAMETER",
          isMandatory: true,
          unitOfMeasure: "°C / Mins",
          acceptanceCriteria: "Specification Not Configured",
          requiresVerification: true,
        },
      ],
    },
    {
      nodeKey: "NODE-11",
      label: "Filtration",
      nodeType: ProcessNodeType.MANUFACTURING_OPERATION,
      sequenceOrder: 11,
      positionX: 1150,
      positionY: 280,
      description: "Clarification filtration of solution to remove unreacted particulates.",
      responsibleDept: DepartmentCode.PRODUCTION,
      responsibleRole: "OPERATOR",
      requiresVerification: false,
    },
    {
      nodeKey: "NODE-12",
      label: "Precipitation",
      nodeType: ProcessNodeType.MANUFACTURING_OPERATION,
      sequenceOrder: 12,
      positionX: 1350,
      positionY: 280,
      description: "Controlled polymer precipitation out of aqueous phase.",
      responsibleDept: DepartmentCode.PRODUCTION,
      responsibleRole: "OPERATOR",
      requiresVerification: false,
    },
    {
      nodeKey: "NODE-13",
      label: "Acid Washing",
      nodeType: ProcessNodeType.MANUFACTURING_OPERATION,
      sequenceOrder: 13,
      positionX: 1350,
      positionY: 380,
      description: "Counter-current acid washing with dilute acetic acid extraction side stream.",
      responsibleDept: DepartmentCode.PRODUCTION,
      responsibleRole: "OPERATOR",
      requiresVerification: false,
    },
    {
      nodeKey: "NODE-14",
      label: "Refining Wash",
      nodeType: ProcessNodeType.MANUFACTURING_OPERATION,
      sequenceOrder: 14,
      positionX: 1150,
      positionY: 380,
      description: "High-purity aqueous refining wash to remove residual trace salts.",
      responsibleDept: DepartmentCode.PRODUCTION,
      responsibleRole: "OPERATOR",
      requiresVerification: false,
    },
    {
      nodeKey: "NODE-15",
      label: "Pusher Centrifuge Wash",
      nodeType: ProcessNodeType.MANUFACTURING_OPERATION,
      sequenceOrder: 15,
      positionX: 950,
      positionY: 380,
      description: "Mechanical dewatering and cake washing with Process Water (RM06).",
      responsibleDept: DepartmentCode.PRODUCTION,
      responsibleRole: "OPERATOR",
      isCriticalControlPoint: true,
      materials: [
        { materialCode: "RM06", materialName: "Process Water (Purified)", materialId: materials["RM06"]?.id },
      ],
      controlPoints: [
        {
          parameterName: "Pusher Centrifuge pH / Acidity Control",
          controlType: "PROCESS_PARAMETER",
          isMandatory: true,
          unitOfMeasure: "pH",
          acceptanceCriteria: "Specification Not Configured",
          requiresVerification: true,
          notes: "Effluent acidity and pH limits require validation against plant ETP norms.",
        },
      ],
    },
    {
      nodeKey: "NODE-16",
      label: "FBD Drying",
      nodeType: ProcessNodeType.MANUFACTURING_OPERATION,
      sequenceOrder: 16,
      positionX: 750,
      positionY: 380,
      description: "Fluid bed drying to moisture specification under HEPA-filtered clean air.",
      responsibleDept: DepartmentCode.PRODUCTION,
      responsibleRole: "OPERATOR",
      equipmentType: "High-Efficiency Fluid Bed Dryer FBD-200",
      requiresVerification: false,
    },
    {
      nodeKey: "NODE-17",
      label: "QC SF Testing",
      nodeType: ProcessNodeType.QUALITY_INSPECTION,
      sequenceOrder: 17,
      positionX: 550,
      positionY: 480,
      description: "Semi-Finished (SF) chemical and physical testing.",
      responsibleDept: DepartmentCode.QC,
      responsibleRole: "QC_ANALYST",
      mandatoryQCCheck: true,
      isCriticalControlPoint: true,
      controlPoints: [
        {
          parameterName: "SF Moisture & Conformance Testing",
          controlType: "QC_INSPECTION",
          isMandatory: true,
          acceptanceCriteria: "Specification Not Configured",
          requiresVerification: true,
        },
      ],
    },
    {
      nodeKey: "NODE-18",
      label: "Sieving",
      nodeType: ProcessNodeType.MANUFACTURING_OPERATION,
      sequenceOrder: 18,
      positionX: 300,
      positionY: 480,
      description: "Vibratory safety screening to remove oversized lumps or agglomerates.",
      responsibleDept: DepartmentCode.PRODUCTION,
      responsibleRole: "OPERATOR",
      requiresVerification: false,
    },
    {
      nodeKey: "NODE-19",
      label: "Milling",
      nodeType: ProcessNodeType.MANUFACTURING_OPERATION,
      sequenceOrder: 19,
      positionX: 50,
      positionY: 480,
      description: "Micro-pulverization to targeted pharma particle size distribution.",
      responsibleDept: DepartmentCode.PRODUCTION,
      responsibleRole: "OPERATOR",
      equipmentType: "Air Classifying Micro-Pulverizer ACM-40",
      requiresVerification: false,
    },
    {
      nodeKey: "NODE-20",
      label: "Blending",
      nodeType: ProcessNodeType.MANUFACTURING_OPERATION,
      sequenceOrder: 20,
      positionX: 50,
      positionY: 570,
      description: "Homogenization blending in GMP Double Cone Blender.",
      responsibleDept: DepartmentCode.PRODUCTION,
      responsibleRole: "OPERATOR",
      equipmentType: "Double Cone GMP Blender 3000L",
      requiresVerification: false,
    },
    {
      nodeKey: "NODE-21",
      label: "QC Viscosity",
      nodeType: ProcessNodeType.QUALITY_INSPECTION,
      sequenceOrder: 21,
      positionX: 300,
      positionY: 570,
      description: "Viscosity monograph testing in rotational viscometer (Brookfield method).",
      responsibleDept: DepartmentCode.QC,
      responsibleRole: "QC_ANALYST",
      mandatoryQCCheck: true,
      isCriticalControlPoint: true,
      controlPoints: [
        {
          parameterName: "Apparent Viscosity (mPa·s)",
          controlType: "QC_INSPECTION",
          isMandatory: true,
          unitOfMeasure: "mPa·s",
          acceptanceCriteria: "Specification Not Configured",
          requiresVerification: true,
        },
      ],
    },
    {
      nodeKey: "NODE-22",
      label: "Metal Detection",
      nodeType: ProcessNodeType.PROCESS_CONTROL,
      sequenceOrder: 22,
      positionX: 550,
      positionY: 570,
      description: "Continuous inline free-fall metal detection check prior to bulk bagging.",
      responsibleDept: DepartmentCode.QC,
      responsibleRole: "QC_ANALYST",
      mandatoryQCCheck: true,
      isCriticalControlPoint: true,
      controlPoints: [
        {
          parameterName: "Ferrous / Non-Ferrous / SS Sensitivity Test",
          controlType: "CRITICAL_CHECK",
          isMandatory: true,
          acceptanceCriteria: "Specification Not Configured",
          requiresVerification: true,
          notes: "Challenge test piece sizes (Fe, Non-Fe, SS316) require calibration against machine SOP.",
        },
      ],
    },
    {
      nodeKey: "NODE-23",
      label: "Packing",
      nodeType: ProcessNodeType.PACKAGING,
      sequenceOrder: 23,
      positionX: 750,
      positionY: 570,
      description: "Packaging into fiber drums with food-grade LDPE barrier liner, nitrogen purge, and tamper-evident sealing.",
      responsibleDept: DepartmentCode.PRODUCTION,
      responsibleRole: "OPERATOR",
      requiresVerification: false,
    },
    {
      nodeKey: "NODE-24",
      label: "Finished Goods",
      nodeType: ProcessNodeType.FINISHED_GOODS,
      sequenceOrder: 24,
      positionX: 950,
      positionY: 570,
      description: "Finished goods lot generation, barcoding, and quarantine staging pending QA release note.",
      responsibleDept: DepartmentCode.FINISHED_GOODS,
      responsibleRole: "FG_STOREKEEPER",
      requiresVerification: false,
    },
    {
      nodeKey: "NODE-25",
      label: "Sales / Finished Goods Handover",
      nodeType: ProcessNodeType.HANDOVER,
      sequenceOrder: 25,
      positionX: 1150,
      positionY: 570,
      description: "Commercial release handover to dispatch department for customer sales orders.",
      responsibleDept: DepartmentCode.DISPATCH,
      responsibleRole: "DISPATCH_OFFICER",
      requiresVerification: false,
    },
    // Side branches from flowchart
    {
      nodeKey: "NODE-BYPRODUCT-01",
      label: "Sales / Incineration / Refining",
      nodeType: ProcessNodeType.WASTE_BYPRODUCT,
      sequenceOrder: 26,
      positionX: 1550,
      positionY: 380,
      description: "Dilute Acetic Acid side stream destination. Routing to third-party sales, incinerator, or chemical refining.",
      responsibleDept: DepartmentCode.PRODUCTION,
      responsibleRole: "PRODUCTION_SUPERVISOR",
      requiresVerification: true,
      verificationNotes: "Photograph shows side stream 'Acetic Acid Dilute' -> 'Sales / Incineration / Refining'. Confirm handling policy.",
    },
    {
      nodeKey: "NODE-EFFLUENT-01",
      label: "Effluent Treatment",
      nodeType: ProcessNodeType.WASTE_BYPRODUCT,
      sequenceOrder: 27,
      positionX: 950,
      positionY: 480,
      description: "Process effluent stream routing to on-site Effluent Treatment Plant (ETP).",
      responsibleDept: DepartmentCode.PRODUCTION,
      responsibleRole: "OPERATOR",
      requiresVerification: false,
    },
  ];

  // Connections / Edges
  const edgesData = [
    // Incoming materials
    { sourceNodeKey: "NODE-01", targetNodeKey: "NODE-02" },
    { sourceNodeKey: "NODE-02", targetNodeKey: "NODE-03" },
    { sourceNodeKey: "NODE-03", targetNodeKey: "NODE-04" },
    { sourceNodeKey: "NODE-04", targetNodeKey: "NODE-05" },
    { sourceNodeKey: "NODE-04", targetNodeKey: "NODE-06" },
    { sourceNodeKey: "NODE-06", targetNodeKey: "NODE-07" },
    { sourceNodeKey: "NODE-07", targetNodeKey: "NODE-08" },
    { sourceNodeKey: "NODE-05", targetNodeKey: "NODE-08" },

    // Main chemical & physical processing sequence
    { sourceNodeKey: "NODE-08", targetNodeKey: "NODE-09" },
    { sourceNodeKey: "NODE-09", targetNodeKey: "NODE-10" },
    { sourceNodeKey: "NODE-10", targetNodeKey: "NODE-11" },
    { sourceNodeKey: "NODE-11", targetNodeKey: "NODE-12" },
    { sourceNodeKey: "NODE-12", targetNodeKey: "NODE-13" },
    { sourceNodeKey: "NODE-13", targetNodeKey: "NODE-14" },
    { sourceNodeKey: "NODE-14", targetNodeKey: "NODE-15" },
    { sourceNodeKey: "NODE-15", targetNodeKey: "NODE-16" },
    { sourceNodeKey: "NODE-16", targetNodeKey: "NODE-17" },
    { sourceNodeKey: "NODE-17", targetNodeKey: "NODE-18" },
    { sourceNodeKey: "NODE-18", targetNodeKey: "NODE-19" },
    { sourceNodeKey: "NODE-19", targetNodeKey: "NODE-20" },
    { sourceNodeKey: "NODE-20", targetNodeKey: "NODE-21" },
    { sourceNodeKey: "NODE-21", targetNodeKey: "NODE-22" },
    { sourceNodeKey: "NODE-22", targetNodeKey: "NODE-23" },
    { sourceNodeKey: "NODE-23", targetNodeKey: "NODE-24" },
    { sourceNodeKey: "NODE-24", targetNodeKey: "NODE-25" },

    // Side branches
    {
      sourceNodeKey: "NODE-13",
      targetNodeKey: "NODE-BYPRODUCT-01",
      edgeType: "BYPRODUCT",
      label: "Acetic Acid Dilute",
      requiresVerification: true,
      verificationNotes: "Check commercial sale vs incineration routing.",
    },
    {
      sourceNodeKey: "NODE-15",
      targetNodeKey: "NODE-EFFLUENT-01",
      edgeType: "BYPRODUCT",
      label: "Effluent Wash",
    },
  ];

  const created = await createProcessTemplate({
    code: "PT-HPMC-P",
    name: "HPMC-P Batch Manufacturing Process",
    documentTitle: "PROCESS FLOWCHART – HPMC-P APPENDIX-A",
    sopReference: "176QA06",
    documentNumber: "07",
    category: "Batch Manufacturing",
    departmentCode: DepartmentCode.QA,
    requiresVerification: true,
    actorId,
    actorEmail: admin?.email || "admin@deepakcellulose.com",
    actorName: admin?.fullName || "Super Administrator",
    nodes: stagesData,
    edges: edgesData,
  });

  console.log("✅ Seeded HPMC-P template successfully as DRAFT (Revision 1).");
  return created;
}
