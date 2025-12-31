"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/providers/confirm-provider";
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
  const t = useTranslations("Admin");
  const confirm = useConfirm();
  const [users, setUsers] = useState(initialUsers);
  const [banning, setBanning] = useState<string | null>(null);

  const handleBan = async (userId: string, userEmail: string | null) => {
    if (
      !(await confirm({
        description: t("banConfirm", { email: userEmail || userId }),
        title: t("banAction"),
        variant: "destructive",
      }))
    ) {
      return;
    }

    setBanning(userId);
    const result = await banUser(userId);

    if (result.success) {
      setUsers((prev) => prev.filter((user) => user.id !== userId));
      toast.success(t("banSuccess"));
    } else {
      toast.error(t(result.error || "errorGeneric"));
    }

    setBanning(null);
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-200 bg-white">
        <thead className="bg-gray-50">
          <tr>
            <th
              className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider"
              scope="col"
            >
              {t("email")}
            </th>
            <th
              className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider"
              scope="col"
            >
              {t("fullName")}
            </th>
            <th
              className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider"
              scope="col"
            >
              {t("role")}
            </th>
            <th
              className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider"
              scope="col"
            >
              {t("createDate")}
            </th>
            <th
              className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider"
              scope="col"
            >
              {t("banAction")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {users.length === 0 ? (
            <tr>
              <td className="px-6 py-4 text-center text-gray-500" colSpan={5}>
                {t("noUsers")}
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
                    ? new Date(user.created_at).toLocaleDateString()
                    : "N/A"}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  {user.role === "admin" ? (
                    <span className="text-gray-400">{t("roleAdmin")}</span>
                  ) : (
                    <button
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      disabled={banning === user.id}
                      onClick={() => handleBan(user.id, user.email)}
                      type="button"
                    >
                      {banning === user.id
                        ? t("banInProgress")
                        : t("banAction")}
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
