export default function MobileTabs({ mobileTab, setMobileTab }) {
  const tabClass = (tab) =>
    `flex-1 py-2 ${
      mobileTab === tab
        ? "border-b-2 border-indigo-600 text-indigo-600"
        : "text-gray-500"
    }`;

  return (
    <div className="lg:hidden bg-white border-b flex justify-around text-sm font-medium">
      <button
        onClick={() => setMobileTab("dashboard")}
        className={tabClass("dashboard")}
      >
        Dashboard
      </button>

      <button
        onClick={() => setMobileTab("channels")}
        className={tabClass("channels")}
      >
        Channels
      </button>

      <button
        onClick={() => setMobileTab("settings")}
        className={tabClass("settings")}
      >
        Settings
      </button>
    </div>
  );
}
