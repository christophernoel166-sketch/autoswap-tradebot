import Layout from "../components/Layout";
import { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE;

export default function DashboardPage() {
  const [user, setUser] = useState(null);

  // TODO: replace with real connected wallet
  const walletAddress = "Gex4FzUyCz1tqzUc5JCzQXk3WC6jH9a9apzCCbdx6zX7";

  useEffect(() => {
    async function loadUser() {
      const res = await axios.get(`${API_BASE}/api/users`, {
        params: { walletAddress },
      });
      setUser(res.data.user);
    }

    loadUser();
  }, []);

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="bg-white rounded shadow p-4">
        <h2 className="text-lg font-semibold mb-4">Subscriptions</h2>

        {!user?.subscribedChannels?.length && (
          <p className="text-gray-500">No channels connected</p>
        )}

        {user?.subscribedChannels?.map((sub) => {
          const status = sub.status;

          return (
            <div
              key={sub.channelId}
              className="flex items-center justify-between border-b py-3"
            >
              {/* Channel ID (we’ll improve name later – Step 5.3) */}
              <div>
                <div className="font-medium">
                  {sub.channelId}
                </div>

                {/* Status badge */}
                <span
                  className={`text-sm px-2 py-1 rounded ${
                    status === "approved"
                      ? "bg-green-100 text-green-700"
                      : status === "pending"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {status}
                </span>
              </div>

              {/* Button behavior */}
              <div>
                {status === "approved" && (
                  <button className="px-3 py-1 bg-green-500 text-white rounded">
                    Enable
                  </button>
                )}

                {status === "pending" && (
                  <button
                    disabled
                    className="px-3 py-1 bg-gray-300 text-gray-600 rounded cursor-not-allowed"
                  >
                    Pending
                  </button>
                )}

                {status === "rejected" && (
                  <button className="px-3 py-1 bg-orange-500 text-white rounded">
                    Re-request
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Layout>
  );
}
