export default function Alert({ title, message, tone = "error", onRetry }) {
  const colors = {
    error: "border-red-500/40 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-200 dark:border-red-700/40",
    warning: "border-amber-500/40 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700/40",
    info: "border-blue-500/40 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700/40",
    success: "border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-700/40",
  };

  const palette = colors[tone] || colors.info;

  return (
    <div className={`border rounded-md px-4 py-3 text-sm flex flex-col gap-2 ${palette}`} role="alert">
      {title ? <strong className="text-sm font-semibold">{title}</strong> : null}
      <span>{message}</span>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="self-start px-3 py-1.5 text-xs font-semibold rounded bg-white/80 text-current shadow hover:bg-white/60 dark:bg-white/10"
        >
          Tentar novamente
        </button>
      ) : null}
    </div>
  );
}
