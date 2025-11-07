import { useMemo } from "react";

export default function Sparkline({ data, width = 200, height = 60, color = "#2563eb" }) {
  const path = useMemo(() => {
    if (!data || data.length === 0) return "";
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const step = data.length > 1 ? width / (data.length - 1) : width;
    return data
      .map((value, index) => {
        const x = index * step;
        const y = height - ((value - min) / range) * height;
        return `${index === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");
  }, [data, width, height]);

  if (!data || data.length === 0) {
    return (
      <div className="text-xs text-gray-500 dark:text-gray-400">Sem dados suficientes</div>
    );
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-16">
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}
