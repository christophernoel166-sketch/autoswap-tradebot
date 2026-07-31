export default function ProgressBar({
  value = 0,
  max = 100,
  color = "blue",
  height = "h-2.5",
  showValue = true,
}) {
  const percentage = Math.max(
    0,
    Math.min((value / max) * 100, 100)
  );

  const colors = {
    green: "bg-green-500",
    blue: "bg-blue-500",
    red: "bg-red-500",
    yellow: "bg-yellow-500",
    orange: "bg-orange-500",
    purple: "bg-purple-500",
    cyan: "bg-cyan-500",
  };

  return (
    <div className="w-full">

      {showValue && (
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Score</span>
          <span>{Math.round(value)}/{max}</span>
        </div>
      )}

      <div
        className={`w-full bg-[#2b2b2b] rounded-full overflow-hidden ${height}`}
      >
        <div
          className={`${colors[color] || colors.blue} ${height} rounded-full transition-all duration-500`}
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>

    </div>
  );
}