const STATUS_CONFIG = {
  SAFE: {
    bg: "bg-green-500/15",
    text: "text-green-400",
    border: "border-green-500/30",
  },

  VERY_SAFE: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
  },

  BUY: {
    bg: "bg-green-500/15",
    text: "text-green-400",
    border: "border-green-500/30",
  },

  STRONG_BUY: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
  },

  WATCH: {
    bg: "bg-yellow-500/15",
    text: "text-yellow-400",
    border: "border-yellow-500/30",
  },

  WARNING: {
    bg: "bg-orange-500/15",
    text: "text-orange-400",
    border: "border-orange-500/30",
  },

  CAUTION: {
    bg: "bg-orange-500/15",
    text: "text-orange-400",
    border: "border-orange-500/30",
  },

  SELL: {
    bg: "bg-red-500/15",
    text: "text-red-400",
    border: "border-red-500/30",
  },

  AVOID: {
    bg: "bg-red-500/15",
    text: "text-red-400",
    border: "border-red-500/30",
  },

  DANGER: {
    bg: "bg-red-600/15",
    text: "text-red-500",
    border: "border-red-600/30",
  },

  HEALTHY: {
    bg: "bg-blue-500/15",
    text: "text-blue-400",
    border: "border-blue-500/30",
  },

  STRONG: {
    bg: "bg-cyan-500/15",
    text: "text-cyan-400",
    border: "border-cyan-500/30",
  },

  UNKNOWN: {
    bg: "bg-gray-700/20",
    text: "text-gray-400",
    border: "border-gray-700",
  },
};

export default function StatusBadge({
  status,
  className = "",
}) {
  const key = String(status || "UNKNOWN").toUpperCase();

  const style =
    STATUS_CONFIG[key] ||
    STATUS_CONFIG.UNKNOWN;

  return (
    <span
      className={`
        inline-flex
        items-center
        rounded-full
        px-3
        py-1
        text-xs
        font-semibold
        border
        ${style.bg}
        ${style.text}
        ${style.border}
        ${className}
      `}
    >
      {status || "Unknown"}
    </span>
  );
}