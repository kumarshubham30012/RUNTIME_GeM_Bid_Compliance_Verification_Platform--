import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { ComparisonBidder, ComparisonRisk } from "../api/comparison.ts";

type SortKey =
  | "bidderName"
  | "score"
  | "risk"
  | "PASS"
  | "REVIEW"
  | "PENDING"
  | "FAIL"
  | "NOT_APPLICABLE";

const RISK_ORDER: Record<ComparisonRisk, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

function riskClass(risk: ComparisonRisk): string {
  if (risk === "LOW") {
    return "bg-emerald-50 text-emerald-800";
  }
  if (risk === "MEDIUM") {
    return "bg-amber-50 text-amber-800";
  }
  return "bg-red-50 text-red-800";
}

function sortValue(row: ComparisonBidder, key: SortKey): string | number {
  if (key === "bidderName") {
    return row.bidderName.toLowerCase();
  }
  if (key === "score") {
    return row.score ?? -1;
  }
  if (key === "risk") {
    return RISK_ORDER[row.risk];
  }
  return row.counts[key];
}

export function BidderComparisonTable({
  bidders,
}: {
  bidders: ComparisonBidder[];
}) {
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [ascending, setAscending] = useState(false);

  const sorted = useMemo(() => {
    return [...bidders].sort((left, right) => {
      const a = sortValue(left, sortKey);
      const b = sortValue(right, sortKey);
      if (a < b) {
        return ascending ? -1 : 1;
      }
      if (a > b) {
        return ascending ? 1 : -1;
      }
      return left.applicationId - right.applicationId;
    });
  }, [ascending, bidders, sortKey]);

  const maxScore = Math.max(0, ...bidders.map((row) => row.score ?? 0));

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setAscending(!ascending);
      return;
    }
    setSortKey(key);
    setAscending(key === "bidderName");
  }

  function header(label: string, key: SortKey) {
    const active = sortKey === key;
    return (
      <button className="font-medium text-slate-600 hover:text-slate-900" type="button" onClick={() => toggleSort(key)}>
        {label}
        {active ? (ascending ? " ↑" : " ↓") : ""}
      </button>
    );
  }

  if (bidders.length === 0) {
    return <p className="text-sm text-slate-600">No applications on this tender yet.</p>;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3">{header("Bidder", "bidderName")}</th>
              <th className="px-4 py-3">{header("Score", "score")}</th>
              <th className="px-4 py-3">{header("Risk", "risk")}</th>
              <th className="px-4 py-3">{header("PASS", "PASS")}</th>
              <th className="px-4 py-3">{header("REVIEW", "REVIEW")}</th>
              <th className="px-4 py-3">{header("PENDING", "PENDING")}</th>
              <th className="px-4 py-3">{header("FAIL", "FAIL")}</th>
              <th className="px-4 py-3">{header("N/A", "NOT_APPLICABLE")}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.applicationId} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{row.bidderName}</p>
                  <p className="text-xs text-slate-500">
                    {row.bidderEmail} · application #{row.applicationId}
                  </p>
                  <Link
                    className="text-xs font-medium text-slate-900 hover:underline"
                    to={`/officer/applications/${row.applicationId}`}
                  >
                    Review
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-900">{row.score === null ? "—" : row.score}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${riskClass(row.risk)}`}>
                    {row.risk}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-700">{row.counts.PASS}</td>
                <td className="px-4 py-3 text-slate-700">{row.counts.REVIEW}</td>
                <td className="px-4 py-3 text-slate-700">{row.counts.PENDING}</td>
                <td className="px-4 py-3 text-slate-700">{row.counts.FAIL}</td>
                <td className="px-4 py-3 text-slate-700">{row.counts.NOT_APPLICABLE}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h4 className="mt-8 text-sm font-semibold text-slate-900">Score ranking</h4>
      <ul className="mt-3 space-y-3">
        {[...bidders]
          .sort((left, right) => (right.score ?? -1) - (left.score ?? -1))
          .map((row, index) => {
            const width = maxScore > 0 && row.score !== null ? Math.max(4, (row.score / maxScore) * 100) : 4;
            return (
              <li key={row.applicationId}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">
                    {index + 1}. {row.bidderName}
                  </span>
                  <span className="font-medium text-slate-900">{row.score === null ? "—" : row.score}</span>
                </div>
                <div className="mt-1 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-slate-900" style={{ width: `${width}%` }} />
                </div>
              </li>
            );
          })}
      </ul>
    </>
  );
}
