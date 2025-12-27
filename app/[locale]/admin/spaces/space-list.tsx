"use client";

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
  const [spaces, setSpaces] = useState(initialSpaces);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (spaceId: string) => {
    if (
      // biome-ignore lint/suspicious/noAlert: Admin panel using simple confirmation dialog
      !confirm(
        "このスペースを削除しますか？この操作は元に戻せません。（アーカイブには保存されます）"
      )
    ) {
      return;
    }

    setDeleting(spaceId);
    const result = await forceDeleteSpace(spaceId);

    if (result.success) {
      setSpaces((prev) => prev.filter((space) => space.id !== spaceId));
      // biome-ignore lint/suspicious/noAlert: Admin panel using simple notification
      alert("スペースを削除しました");
    } else {
      // biome-ignore lint/suspicious/noAlert: Admin panel using simple error notification
      alert(`エラー: ${result.error}`);
    }

    setDeleting(null);
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-200 bg-white">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
              Share Key
            </th>
            <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
              ステータス
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
          {spaces.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                スペースがありません
              </td>
            </tr>
          ) : (
            spaces.map((space) => (
              <tr key={space.id}>
                <td className="whitespace-nowrap px-6 py-4">
                  <a
                    href={`/@${space.share_key}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
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
                    ? new Date(space.created_at).toLocaleDateString("ja-JP")
                    : "N/A"}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  <button
                    type="button"
                    onClick={() => handleDelete(space.id)}
                    disabled={deleting === space.id}
                    className="text-red-600 hover:text-red-900 disabled:opacity-50"
                  >
                    {deleting === space.id ? "削除中..." : "削除"}
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
