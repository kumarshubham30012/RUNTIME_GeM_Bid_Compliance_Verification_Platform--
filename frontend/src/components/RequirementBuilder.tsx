import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "../api/client.ts";
import {
  RULE_TYPES,
  VERIFICATION_METHODS,
  createRequirement,
  deleteRequirement,
  listRequirements,
  updateRequirement,
  type Requirement,
  type RequirementInput,
  type RuleType,
  type VerificationMethod,
} from "../api/requirements.ts";

const emptyForm: RequirementInput = {
  name: "",
  tenderClause: "",
  mandatory: true,
  verificationMethod: "DOCUMENT",
  ruleType: "EXISTS",
};

export function RequirementBuilder({ token, tenderId }: { token: string; tenderId: number }) {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [form, setForm] = useState<RequirementInput>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const result = await listRequirements(token, tenderId);
    setRequirements(result);
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    listRequirements(token, tenderId)
      .then((result) => {
        if (!cancelled) {
          setRequirements(result);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof ApiError ? caught.message : "Unable to load requirements");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, tenderId]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setError(null);
  }

  function openEdit(requirement: Requirement) {
    setEditingId(requirement.id);
    setForm({
      name: requirement.name,
      tenderClause: requirement.tenderClause,
      mandatory: requirement.mandatory,
      verificationMethod: requirement.verificationMethod,
      ruleType: requirement.ruleType,
    });
    setShowForm(true);
    setError(null);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editingId === null) {
        await createRequirement(token, tenderId, form);
      } else {
        await updateRequirement(token, tenderId, editingId, form);
      }
      await refresh();
      cancelForm();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Unable to save requirement");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(requirement: Requirement) {
    if (!window.confirm("Delete this requirement?")) {
      return;
    }

    try {
      await deleteRequirement(token, tenderId, requirement.id);
      await refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Unable to delete requirement");
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Requirements</h3>
          <p className="mt-1 text-sm text-slate-600">
            Configure how compliance will be judged for this tender.
          </p>
        </div>
        <button
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          type="button"
          onClick={openCreate}
        >
          Add Requirement
        </button>
      </div>

      {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {showForm ? (
        <form className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4" onSubmit={handleSubmit}>
          <h4 className="text-sm font-medium text-slate-900">
            {editingId === null ? "Add requirement" : "Edit requirement"}
          </h4>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Requirement name</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-slate-500"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Tender clause</span>
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-slate-500"
              rows={3}
              value={form.tenderClause}
              onChange={(event) => setForm({ ...form, tenderClause: event.target.value })}
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Mandatory</span>
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-slate-500"
              value={form.mandatory ? "true" : "false"}
              onChange={(event) => setForm({ ...form, mandatory: event.target.value === "true" })}
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Verification method</span>
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-slate-500"
              value={form.verificationMethod}
              onChange={(event) =>
                setForm({ ...form, verificationMethod: event.target.value as VerificationMethod })
              }
            >
              {VERIFICATION_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Rule type</span>
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-slate-500"
              value={form.ruleType}
              onChange={(event) => setForm({ ...form, ruleType: event.target.value as RuleType })}
            >
              {RULE_TYPES.map((ruleType) => (
                <option key={ruleType} value={ruleType}>
                  {ruleType}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center gap-3">
            <button
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              type="submit"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Requirement"}
            </button>
            <button className="text-sm text-slate-600 hover:underline" type="button" onClick={cancelForm}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-slate-600">Loading requirements...</p>
        ) : requirements.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-600">
            No requirements have been configured for this tender yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Clause</th>
                  <th className="py-2 pr-4 font-medium">Mandatory</th>
                  <th className="py-2 pr-4 font-medium">Verification</th>
                  <th className="py-2 pr-4 font-medium">Rule</th>
                  <th className="py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requirements.map((requirement) => (
                  <tr key={requirement.id} className="border-b border-slate-100 last:border-0 align-top">
                    <td className="py-3 pr-4 font-medium text-slate-900">{requirement.name}</td>
                    <td className="py-3 pr-4 text-slate-700">{requirement.tenderClause}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          requirement.mandatory
                            ? "bg-amber-50 text-amber-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {requirement.mandatory ? "MANDATORY" : "OPTIONAL"}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-slate-700">{requirement.verificationMethod}</td>
                    <td className="py-3 pr-4 text-slate-700">{requirement.ruleType}</td>
                    <td className="py-3">
                      <div className="flex gap-3">
                        <button
                          className="text-sm text-slate-700 hover:underline"
                          type="button"
                          onClick={() => openEdit(requirement)}
                        >
                          Edit
                        </button>
                        <button
                          className="text-sm text-red-700 hover:underline"
                          type="button"
                          onClick={() => void handleDelete(requirement)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
