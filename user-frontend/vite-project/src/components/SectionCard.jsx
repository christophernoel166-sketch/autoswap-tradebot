export default function SectionCard({
  title,
  icon,
  children,
  className = "",
}) {
  return (
    <div
      className={`
        bg-[#151515]
        border border-[#2b2b2b]
        rounded-2xl
        p-5
        shadow-lg
        ${className}
      `}
    >
      <div className="flex items-center gap-3 mb-5">
        {icon && (
          <div className="text-blue-400 text-xl">
            {icon}
          </div>
        )}

        <h2 className="text-lg font-semibold text-white">
          {title}
        </h2>
      </div>

      {children}
    </div>
  );
}