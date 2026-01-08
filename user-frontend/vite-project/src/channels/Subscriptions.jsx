export default function Subscriptions({
  userChannels,
  toggleChannel,
  reRequestChannel,
  getChannelStatusBadge,
}) {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-sm w-full">
      <h3 className="font-medium mb-2 text-gray-900 dark:text-gray-100">
        Subscriptions
      </h3>

      {userChannels.length === 0 ? (
        <div className="text-gray-500 dark:text-gray-400 text-sm">
          No channel subscriptions yet.
        </div>
      ) : (
        userChannels.map((ch) => {
          const badge = getChannelStatusBadge(ch.channelId);

          return (
            <div
              key={ch.channelId}
              className="flex justify-between items-center
                         border dark:border-gray-700
                         rounded px-2 py-2 mb-2
                         bg-gray-50 dark:bg-gray-700"
            >
              {/* Channel info */}
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  @{ch.username || ch.title || ch.channelId}
                </span>

                <span
                  className={`text-xs mt-1 inline-block px-2 py-0.5 rounded
                    ${
                      badge.color === "green"
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : badge.color === "yellow"
                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                        : badge.color === "red"
                        ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                        : "bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300"
                    }`}
                >
                  {badge.label}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 items-center">
                {ch.status === "rejected" && (
                  <button
                    onClick={() => reRequestChannel(ch.channelId)}
                    className="text-xs px-2 py-1 border rounded
                               bg-yellow-100 dark:bg-yellow-800
                               text-yellow-800 dark:text-yellow-200"
                  >
                    Re-request
                  </button>
                )}

                {ch.enabled ? (
                  <button
                    onClick={() => toggleChannel(ch.channelId, false)}
                    className="text-xs px-2 py-1 border rounded
                               bg-red-100 dark:bg-red-800
                               text-red-800 dark:text-red-200"
                  >
                    Disable
                  </button>
                ) : (
                  <button
                    disabled={ch.status !== "approved"}
                    onClick={() => toggleChannel(ch.channelId, true)}
                    className={`text-xs px-2 py-1 border rounded
                      ${
                        ch.status !== "approved"
                          ? "bg-gray-300 dark:bg-gray-600 text-gray-400 cursor-not-allowed"
                          : "bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200"
                      }`}
                  >
                    Enable
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
