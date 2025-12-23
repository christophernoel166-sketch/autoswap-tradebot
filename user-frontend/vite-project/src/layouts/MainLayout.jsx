import Sidebar from "../components/Sidebar";

export default function MainLayout({ children }) {
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Sidebar */}
      <div style={{ width: "220px", borderRight: "1px solid #eee" }}>
        <Sidebar />
      </div>

      {/* Page content */}
      <div style={{ flex: 1, padding: "20px" }}>
        {children}
      </div>
    </div>
  );
}
