"use client";

import { User as UserIcon } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/providers/confirm-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link, usePathname } from "@/i18n/navigation";
import { formatDate } from "@/lib/utils/date-format";
import type { Tables } from "@/types/supabase";
import { banUser, updateUserRole } from "../_actions/admin-operations";

type User = Tables<"profiles">;

interface UserListProps {
  currentPage: number;
  currentUserId?: string;
  hasMore?: boolean;
  initialUsers: User[];
}

export function UserList({
  currentPage,
  currentUserId,
  hasMore,
  initialUsers,
}: UserListProps) {
  const t = useTranslations("Admin");
  const locale = useLocale();
  const confirm = useConfirm();
  const pathname = usePathname();
  const [users, setUsers] = useState(initialUsers);
  const [banning, setBanning] = useState<string | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

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

  const handleRoleChange = async (
    userId: string,
    newRole: "admin" | "organizer" | "user"
  ) => {
    setUpdatingRole(userId);
    const result = await updateUserRole(userId, newRole);

    if (result.success) {
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, role: newRole } : user
        )
      );
      toast.success(t("roleUpdateSuccess"));
    } else {
      toast.error(t(result.error || "errorGeneric"));
    }

    setUpdatingRole(null);
  };

  const hasPrevious = currentPage > 1;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200 bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th
                className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider"
                scope="col"
              >
                {t("avatar")}
              </th>
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
                {t("actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {users.length === 0 ? (
              <tr>
                <td className="px-6 py-4 text-center text-gray-500" colSpan={6}>
                  {t("noUsers")}
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td className="whitespace-nowrap px-6 py-4">
                    <Link
                      className="block transition-opacity hover:opacity-80"
                      href={`${pathname}/${user.id}`}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          asChild
                          src={user.avatar_url || "/default-avatar.png"}
                        >
                          <Image
                            alt={user.full_name || user.email || "User"}
                            height={40}
                            src={user.avatar_url || "/default-avatar.png"}
                            width={40}
                          />
                        </AvatarImage>
                        <AvatarFallback>
                          <UserIcon aria-hidden="true" className="size-4" />
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <Link
                      className="text-primary hover:underline"
                      href={`${pathname}/${user.id}`}
                    >
                      {user.email || t("notAvailable")}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    {user.full_name || t("notAvailable")}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <Select
                      disabled={
                        updatingRole === user.id || user.id === currentUserId
                      }
                      onValueChange={(value) =>
                        handleRoleChange(
                          user.id,
                          value as "admin" | "organizer" | "user"
                        )
                      }
                      value={user.role}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">{t("roleAdmin")}</SelectItem>
                        <SelectItem value="organizer">
                          {t("roleOrganizer")}
                        </SelectItem>
                        <SelectItem value="user">{t("roleUser")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-500 text-sm">
                    {user.created_at
                      ? formatDate(user.created_at, locale)
                      : t("notAvailable")}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <Button
                      disabled={banning === user.id || user.role === "admin"}
                      onClick={() => handleBan(user.id, user.email)}
                      size="sm"
                      type="button"
                      variant="destructive"
                    >
                      {banning === user.id
                        ? t("banInProgress")
                        : t("banAction")}
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
