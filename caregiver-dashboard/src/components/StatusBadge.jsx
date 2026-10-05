import React from "react";

export function StatusBadge({ status }) {
  const normalized = (status || "").toUpperCase();

  const styles = {
    CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-600/20",
    CONFIRMED_LATE: "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-600/20",
    SKIPPED: "bg-slate-100 text-slate-700 border-slate-200 ring-slate-600/20",
    NOTIFIED: "bg-amber-50 text-amber-700 border-amber-200 ring-amber-600/20",
    MISSED: "bg-rose-50 text-rose-700 border-rose-200 ring-rose-600/20",
    SCHEDULED: "bg-blue-50 text-blue-700 border-blue-200 ring-blue-600/20",
  };

  const labels = {
    CONFIRMED: "Confirmed",
    CONFIRMED_LATE: "Confirmed Late",
    SKIPPED: "Skipped",
    NOTIFIED: "Notified",
    MISSED: "Missed",
    SCHEDULED: "Scheduled",
  };

  const styleClass = styles[normalized] || "bg-slate-100 text-slate-700 border-slate-200 ring-slate-600/20";
  const label = labels[normalized] || status;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ring-1 ring-inset ${styleClass}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-80" />
      {label}
    </span>
  );
}
