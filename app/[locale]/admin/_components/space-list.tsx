"use client";

import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/providers/confirm-provider";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { formatDate } from "@/lib/utils/date-format";
import type { Tables } from "@/types/supabase";
import { forceDeleteSpace } from "../_actions/admin-operations";

interface SpaceListProps {
  currentPage: number;
  hasMore?: boolean;
  initialSpaces: Tables<"spaces">[];
}

export function SpaceList({
  currentPage,
  hasMore,
  initialSpaces,
}: SpaceListProps) {
  const t = useTranslations("Admin");
  const locale = useLocale();
  const confirm = useConfirm();
  const pathname = usePathname();
  const [spaces, setSpaces] = useState(initialSpaces);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (spaceId: string) => {
    if (
      !(await confirm({
        description: t("deleteConfirm"),
        title: t("deleteAction"),
        variant: "destructive",
      }))
    ) {
      return;
    }

    setDeleting(spaceId);
    const result = await forceDeleteSpace(spaceId);

    if (result.success) {
      setSpaces((prev) => prev.filter((space) => space.id !== spaceId));
      toast.success(t("deleteSuccess"));
    } else {
      toast.error(t(result.error || "errorGeneric"));
    }

    setDeleting(null);
  };

  const hasPrevious = currentPage > 1;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th
                className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider dark:text-gray-400"
                scope="col"
              >
                {t("shareKey")}
              </th>
              <th
                className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider dark:text-gray-400"
                scope="col"
              >
                {t("status")}
              </th>
              <th
                className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider dark:text-gray-400"
                scope="col"
              >
                {t("createDate")}
              </th>
              <th
                className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider dark:text-gray-400"
                scope="col"
              >
                {t("deleteAction")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
            {spaces.length === 0 ? (
              <tr>
                <td className="px-6 py-4 text-center text-gray-500 dark:text-gray-400" colSpan={4}>
                  {t("noSpaces")}
                </td>
              </tr>
            ) : (
              spaces.map((space) => (
                <tr key={space.id}>
                  <td className="whitespace-nowrap px-6 py-4">
                    <a
                      className="text-blue-600 hover:underline dark:text-blue-400"
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
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {space.status || "unknown"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-500 text-sm dark:text-gray-400">
                    {space.created_at
                      ? formatDate(space.created_at, locale)
                      : "N/A"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <Button
                      disabled={deleting === space.id}
                      onClick={() => handleDelete(space.id)}
                      size="sm"
                      type="button"
                      variant="destructive"
                    >
                      {deleting === space.id
                        ? t("deleteInProgress")
                        : t("deleteAction")}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {(hasPrevious || hasMore) && (
        <div className="mt-4">
          <Pagination>
            <PaginationContent>
              {hasPrevious && (
                <PaginationItem>
                  <PaginationPrevious
                    href={`${pathname}?page=${currentPage - 1}`}
                  >
                    {t("paginationPrevious")}
                  </PaginationPrevious>
                </PaginationItem>
              )}
              <PaginationItem>
                <span className="px-4 text-sm">
                  {t("currentPage", {
                    current: currentPage,
                  })}
                </span>
              </PaginationItem>
              {hasMore && (
                <PaginationItem>
                  <PaginationNext href={`${pathname}?page=${currentPage + 1}`}>
                    {t("paginationNext")}
                  </PaginationNext>
                </PaginationItem>
              )}
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
