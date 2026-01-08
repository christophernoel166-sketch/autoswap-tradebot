export default function Sidebar({ children }) {
  return (
    <aside className="col-span-12 lg:col-span-4 space-y-4">
      {children}
    </aside>
  );
}
