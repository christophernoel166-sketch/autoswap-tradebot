export default function MetricCard({
  label,
  value,
  subtitle,
  status,
  icon,
  color = "text-white",
}) {
  return (
    <div className="bg-[#1b1b1b] border border-[#2d2d2d] rounded-xl p-4 transition-all hover:border-blue-500">

      {/* Header */}
      <div className="flex items-center justify-between mb-3">

        <div className="flex items-center gap-2">

          {icon && (
            <div className="text-blue-400 text-lg">
              {icon}
            </div>
          )}

          <span className="text-sm text-gray-400">
            {label}
          </span>

        </div>

        {status && (
          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-[#262626] text-gray-300">
            {status}
          </span>
        )}

      </div>

      {/* Main Value */}
      <div className={`text-2xl font-bold ${color}`}>
        {value}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div className="mt-2 text-xs text-gray-500">
          {subtitle}
        </div>
      )}

    </div>
  );
}