import React from "react";
import { NavLink } from "react-router-dom";
import { Home, Link as LinkIcon, LayoutDashboard, BarChart } from "lucide-react";

export default function Sidebar() {
  const items = [
    { to: "/", label: "Register", icon: <Home size={18} /> },
    { to: "/connect-channel", label: "Connect", icon: <LinkIcon size={18} /> },
    { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { to: "/positions", label: "Positions", icon: <BarChart size={18} /> }, // NEW
  ];

  return (
    <aside className="h-full w-20 bg-gray-900 text-white flex flex-col items-center py-6 gap-6">
      {/* Logo */}
      <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-lg font-bold">
        U
      </div>

      {/* Navigation */}
      <nav className="flex flex-col items-center gap-4">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.to === "/"}
            className={({ isActive }) =>
              `relative w-12 h-12 rounded-xl flex items-center justify-center transition ${
                isActive ? "bg-indigo-600 shadow-lg" : "bg-gray-800 hover:bg-gray-700"
              }`
            }
            title={it.label}
          >
            {it.icon}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto text-xs text-gray-500">v1.0</div>
    </aside>
  );
}
