export default function MobileHeader({ connected, walletAddress }) {
  return (
    <div className="lg:hidden sticky top-0 z-40 bg-white border-b px-4 py-3 flex justify-between items-center">
      <h1 className="font-semibold text-lg">Autoswap</h1>

      <div className="text-xs text-gray-600 truncate max-w-[160px]">
        {connected && walletAddress
          ? walletAddress.slice(0, 4) + "..." + walletAddress.slice(-4)
          : "Wallet not connected"}
      </div>
    </div>
  );
}
