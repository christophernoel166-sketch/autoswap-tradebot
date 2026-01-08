export default function AddChannel({
  isTelegramLinked,
  availableChannels,
  linkTelegramAccount,
  requestChannel,
}) {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-sm w-full">
      <h3 className="font-medium mb-2 text-gray-900 dark:text-gray-100">
        Add Channel
      </h3>

      {!isTelegramLinked ? (
        <>
          <div className="w-full border dark:border-gray-600 rounded px-2 py-2 text-sm
                          bg-gray-100 dark:bg-gray-700
                          text-gray-400 dark:text-gray-400
                          cursor-not-allowed">
            Link Telegram to request channels
          </div>

          <p className="text-xs text-red-600 dark:text-red-400 mt-2">
            ⚠️ You must link your Telegram account before requesting channel access.
          </p>

          <button
            onClick={linkTelegramAccount}
            className="inline-block mt-3 text-xs px-4 py-2 rounded
                       bg-blue-600 hover:bg-blue-700
                       text-white transition"
          >
            🔗 Link Telegram Account
          </button>
        </>
      ) : (
        <>
          <select
            className="w-full border dark:border-gray-600 rounded px-2 py-2 text-sm
                       bg-white dark:bg-gray-700
                       text-gray-900 dark:text-gray-100"
            defaultValue=""
            onChange={(e) => {
              const channelId = e.target.value;
              if (!channelId) return;
              requestChannel(channelId);
            }}
          >
            <option value="" disabled>
              Select a channel to request access
            </option>

            {availableChannels.map((ch) => (
              <option key={ch.channelId} value={ch.channelId}>
                @{ch.username || ch.title || ch.channelId}
              </option>
            ))}
          </select>

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Request will be sent to the channel owner for approval.
          </p>
        </>
      )}
    </div>
  );
}
