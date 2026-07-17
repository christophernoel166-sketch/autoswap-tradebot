// src/components/ai/AIStatCard.jsx

const colorClasses = {
    green: "text-green-400 border-green-500/30",
    cyan: "text-cyan-400 border-cyan-500/30",
    blue: "text-blue-400 border-blue-500/30",
    yellow: "text-yellow-400 border-yellow-500/30",
    red: "text-red-400 border-red-500/30",
    purple: "text-purple-400 border-purple-500/30",
    gray: "text-gray-300 border-gray-600",
};

export default function AIStatCard({
    title,
    value,
    icon,
    subtitle,
    color = "cyan",
}) {
    const styles = colorClasses[color] || colorClasses.cyan;

    return (
        <div
            className={`
                rounded-xl
                border
                bg-gray-800
                p-5
                transition-all
                duration-300
                hover:scale-[1.02]
                hover:shadow-lg
                ${styles}
            `}
        >
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-400">
                    {title}
                </span>

                <span className="text-xl">
                    {icon}
                </span>
            </div>

            <div className="text-2xl font-bold">
                {value}
            </div>

            {subtitle && (
                <div className="mt-2 text-xs text-gray-500">
                    {subtitle}
                </div>
            )}
        </div>
    );
}