import { ProgressStep } from "../types";

interface ProgressBarProps {
  steps: ProgressStep[];
}

export function ProgressBar({ steps }: ProgressBarProps) {
  const total = steps.length || 1;
  const completed = steps.filter((s) => s.status === "done").length;
  const percent = Math.min(100, Math.round((completed / total) * 100));

  return (
    <div className="space-y-2">
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <ol className="grid gap-2 text-xs text-slate-300 sm:grid-cols-5">
        {steps.map((step) => {
          const color =
            step.status === "done"
              ? "bg-emerald-500 border-emerald-500"
              : step.status === "active"
              ? "bg-amber-400 border-amber-400"
              : "bg-slate-700 border-slate-600";

          return (
            <li key={step.key} className="flex items-center gap-2">
              <span className={`inline-flex h-2.5 w-2.5 rounded-full border ${color}`} />
              <span className="truncate">{step.label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
