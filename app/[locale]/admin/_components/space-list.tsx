"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { forceDeleteSpace } from "../actions";

interface Space {
  created_at: string | null;
  id: string;
  settings: Record<string, unknown> | null;
  share_key: string;
  status: string | null;
  updated_at: string | null;
}

interface SpaceListProps {
  initialSpaces: Space[];
}

export function SpaceList({ initialSpaces }: SpaceListProps) {
  const t = useTranslations("Admin");
  const [spaces, setSpaces] = useState(initialSpaces);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (spaceId: string) => {
    if (
      // biome-ignore lint/suspicious/noAlert: Admin panel using simple confirmation dialog
      !confirm(t("deleteConfirm"))
    ) {
      return;
    }

    setDeleting(spaceId);
    const result = await forceDeleteSpace(spaceId);

    if (result.success) {
      setSpaces((prev) => prev.filter((space) => space.id !== spaceId));
      // biome-ignore lint/suspicious/noAlert: Admin panel using simple notification
      alert(t("deleteSuccess"));
    } else {
      // biome-ignore lint/suspicious/noAlert: Admin panel using simple error notification
      alert(t(result.error || "errorGeneric"));
    }

    setDeleting(null);
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
              {t("shareKey")}
            </th>
            <th
              className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider"
              scope="col"
            >
              {t("status")}
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
              {t("deleteAction")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {spaces.length === 0 ? (
            <tr>
              <td className="px-6 py-4 text-center text-gray-500" colSpan={4}>
                {t("noSpaces")}
              </td>
            </tr>
          ) : (
            spaces.map((space) => (
              <tr key={space.id}>
                <td className="whitespace-nowrap px-6 py-4">
                  <a
                    className="text-blue-600 hover:underline"
                    href={`/@${space.share_key}`}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {space.share_key}
                  </a>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span
                    className={`inline-flex rounded-full px-2 font-semibold text-xs leading-5 ${
                      space.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {space.status || "unknown"}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-gray-500 text-sm">
                  {space.created_at
                    ? new Date(space.created_at).toLocaleDateString()
                    : "N/A"}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  <button
                    className="text-red-600 hover:text-red-900 disabled:opacity-50"
                    disabled={deleting === space.id}
                    onClick={() => handleDelete(space.id)}
                    type="button"
                  >
                    {deleting === space.id
                      ? t("deleteInProgress")
                      : t("deleteAction")}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
