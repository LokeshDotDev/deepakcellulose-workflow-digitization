"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Eye, CheckCircle2, Sliders, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FormBuilderClientProps {
  existingForms: any[];
}

export function FormBuilderClient({ existingForms }: FormBuilderClientProps) {
  const [formCode, setFormCode] = useState("FORM_QC_SUPPLEMENTAL");
  const [formName, setFormName] = useState("Supplemental QC Impurities & Moisture Log");
  const [entityType, setEntityType] = useState("QC_INSPECTION");
  const [description, setDescription] = useState("Configurable HPLC impurity profiles and LOD readings");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [fields, setFields] = useState<any[]>([
    {
      key: "hplc_retention_time",
      label: "HPLC Relative Retention Time (RRT)",
      type: "decimal",
      required: true,
      helpText: "Record observed peak retention relative to reference standard",
    },
    {
      key: "heavy_metals_ppm",
      label: "Heavy Metals Limit (PPM)",
      type: "integer",
      required: true,
      helpText: "Atomic absorption spectrophotometry result",
    },
    {
      key: "solvent_residue_status",
      label: "Residual Solvents Compliance",
      type: "select",
      options: "Pass (Below 50 PPM),Fail,Inconclusive",
      required: true,
      helpText: "Residual methanol/ethanol gas chromatography result",
    },
  ]);

  const handleAddField = () => {
    setFields([
      ...fields,
      {
        key: `field_${Date.now()}`,
        label: "New Parameter Field",
        type: "text",
        required: false,
        helpText: "",
        options: "",
      },
    ]);
  };

  const handleUpdateField = (index: number, key: string, value: any) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], [key]: value };
    setFields(updated);
  };

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handlePublish = async () => {
    try {
      setLoading(true);
      const formattedFields = fields.map((f) => ({
        ...f,
        options: typeof f.options === "string" ? f.options.split(",").map((o: string) => o.trim()).filter(Boolean) : f.options,
      }));

      const schema = {
        sections: [
          {
            id: "custom_section_1",
            title: "Custom Form Parameters",
            fields: formattedFields,
          },
        ],
      };

      const res = await fetch("/api/admin/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: formCode,
          name: formName,
          entityType,
          description,
          schema,
        }),
      });

      if (res.ok) {
        alert("Form schema published successfully as a new version!");
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to publish schema");
      }
    } catch (err) {
      console.error(err);
      alert("Error publishing form schema");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-600" />
            Visual Schema Builder (Field Definition & Preview)
          </h2>
          <p className="text-xs text-slate-500">Design dynamic fields and publish versioned definitions</p>
        </div>

        <Button onClick={handlePublish} isLoading={loading} className="gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Publish New Version
        </Button>
      </div>

      {/* Form Metadata */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Form Name *</label>
          <input
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            className="w-full text-xs p-2 rounded-lg border border-slate-300"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Form Code (Identifier) *</label>
          <input
            type="text"
            value={formCode}
            onChange={(e) => setFormCode(e.target.value.toUpperCase())}
            className="w-full text-xs p-2 rounded-lg border border-slate-300 uppercase font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Applicable Entity Type *</label>
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
          >
            <option value="QC_INSPECTION">QC Inspection</option>
            <option value="PURCHASE_ORDER">Purchase Order</option>
            <option value="GATE_ENTRY">Security Gate Entry</option>
            <option value="GOODS_RECEIPT">Goods Receipt Note</option>
            <option value="PRODUCTION_BATCH">Production Batch BMR</option>
            <option value="DISPATCH_CHALLAN">Dispatch Challan</option>
          </select>
        </div>
      </div>

      {/* Two Column Layout: Field Editor & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* Left: Field Editor */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Configured Fields</span>
            <button
              type="button"
              onClick={handleAddField}
              className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Field
            </button>
          </div>

          <div className="space-y-3">
            {fields.map((field, idx) => (
              <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Field #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveField(idx)}
                    className="text-rose-600 hover:text-rose-700"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-medium mb-1">Field Label *</label>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => handleUpdateField(idx, "label", e.target.value)}
                      className="w-full text-xs p-1.5 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-medium mb-1">Field Key (JSON) *</label>
                    <input
                      type="text"
                      value={field.key}
                      onChange={(e) => handleUpdateField(idx, "key", e.target.value)}
                      className="w-full text-xs p-1.5 rounded-lg border border-slate-300 bg-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-medium mb-1">Field Type</label>
                    <select
                      value={field.type}
                      onChange={(e) => handleUpdateField(idx, "type", e.target.value)}
                      className="w-full text-xs p-1.5 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="text">Text (Single Line)</option>
                      <option value="textarea">Long Text (Textarea)</option>
                      <option value="integer">Integer Number</option>
                      <option value="decimal">Decimal Precision</option>
                      <option value="select">Single Dropdown Select</option>
                      <option value="boolean">Boolean (Yes/No)</option>
                      <option value="date">Date</option>
                      <option value="attachment">File Attachment</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-4">
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => handleUpdateField(idx, "required", e.target.checked)}
                        className="rounded border-slate-300"
                      />
                      <span>Mandatory Field</span>
                    </label>
                  </div>
                </div>

                {field.type === "select" && (
                  <div>
                    <label className="block text-[10px] text-slate-500 font-medium mb-1">Options (Comma-separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. Pass, Fail, Inconclusive"
                      value={field.options}
                      onChange={(e) => handleUpdateField(idx, "options", e.target.value)}
                      className="w-full text-xs p-1.5 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Live Interactive Preview */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              Live Interactive Form Preview
            </span>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
              Client Rendering
            </span>
          </div>

          <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs text-xs">
            <div className="font-bold text-sm text-slate-900 mb-1">{formName}</div>
            <p className="text-[11px] text-slate-500">{description}</p>

            <div className="space-y-3 pt-3">
              {fields.map((f, i) => (
                <div key={i} className="space-y-1">
                  <label className="block font-semibold text-slate-700">
                    {f.label} {f.required && <span className="text-rose-500">*</span>}
                  </label>
                  {f.type === "select" ? (
                    <select className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white" disabled>
                      {(typeof f.options === "string" ? f.options.split(",") : f.options || []).map((opt: string, oIdx: number) => (
                        <option key={oIdx}>{opt.trim()}</option>
                      ))}
                    </select>
                  ) : f.type === "textarea" ? (
                    <textarea rows={2} placeholder="User response text..." className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-slate-50" disabled />
                  ) : (
                    <input
                      type={f.type === "integer" || f.type === "decimal" ? "number" : f.type === "date" ? "date" : "text"}
                      placeholder={`Enter ${f.label.toLowerCase()}...`}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-slate-50"
                      disabled
                    />
                  )}
                  {f.helpText && <p className="text-[10px] text-slate-400">{f.helpText}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
