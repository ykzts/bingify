"use client";

import { useState } from "react";
import { banUser } from "../actions";

interface User {
  avatar_url: string | null;
  created_at: string | null;
  email: string | null;
  full_name: string | null;
  id: string;
  role: string;
  updated_at: string | null;
}

interface UserListProps {
  initialUsers: User[];
}

export function UserList({ initialUsers }: UserListProps) {
  const [users, setUsers] = useState(initialUsers);
  const [banning, setBanning] = useState<string | null>(null);

  const handleBan = async (userId: string, userEmail: string | null) => {
    if (
      // biome-ignore lint/suspicious/noAlert: Admin panel using simple confirmation dialog
      !confirm(
        `ユーザー ${userEmail || userId} をBANしますか？この操作は元に戻せません。`
      )
    ) {
      return;
    }

    setBanning(userId);
    const result = await banUser(userId);

    if (result.success) {
      setUsers((prev) => prev.filter((user) => user.id !== userId));
      // biome-ignore lint/suspicious/noAlert: Admin panel using simple notification
      alert("ユーザーをBANしました");
    } else {
      // biome-ignore lint/suspicious/noAlert: Admin panel using simple error notification
      alert(`エラー: ${result.error}`);
    }

    setBanning(null);
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-200 bg-white">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
              メールアドレス
            </th>
            <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
              名前
            </th>
            <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
              ロール
            </th>
            <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
              作成日
            </th>
            <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
              アクション
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {users.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                ユーザーがいません
              </td>
            </tr>
          ) : (
            users.map((user) => (
              <tr key={user.id}>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  {user.email || "N/A"}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  {user.full_name || "N/A"}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span
                    className={`inline-flex rounded-full px-2 font-semibold text-xs leading-5 ${
                      user.role === "admin"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-gray-500 text-sm">
                  {user.created_at
                    ? new Date(user.created_at).toLocaleDateString("ja-JP")
                    : "N/A"}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  {user.role === "admin" ? (
                    <span className="text-gray-400">管理者</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleBan(user.id, user.email)}
                      disabled={banning === user.id}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                    >
                      {banning === user.id ? "BAN中..." : "BAN"}
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
