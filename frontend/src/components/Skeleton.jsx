export function TableSkeleton({ rows = 8, columns = 6 }) {
  return (
    <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-md">
      <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-500">Carregando…</div>
      <div className="divide-y divide-gray-200 dark:divide-gray-800">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {Array.from({ length: columns }).map((__, colIndex) => (
              <div
                key={colIndex}
                className="h-10 animate-pulse bg-gray-200 dark:bg-gray-700/80"
                aria-hidden="true"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton({ count = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="h-20 rounded-md bg-gray-200 dark:bg-gray-700 animate-pulse" />
      ))}
    </div>
  );
}
