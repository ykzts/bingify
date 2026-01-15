"use client";

import { Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "@/i18n/navigation";
import { formatDateShort } from "@/lib/utils/date-format";
import { getSpaceStatusTranslationKey } from "@/lib/utils/space-status";
import type { UserSpace } from "../_actions/space-management";
import { SpaceActionsDropdown } from "./space-actions-dropdown";
import { StatusBadge } from "./status-badge";

interface SpaceTabsProps {
  hostedSpaces: UserSpace[];
  hostedTabLabel?: string;
  locale: string;
  participatedSpaces: UserSpace[];
  participatedTabLabel?: string;
}

function SpaceTable({
  locale,
  spaces,
}: {
  locale: string;
  spaces: UserSpace[];
}) {
  const t = useTranslations("Dashboard");

  return (
    <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-gray-50 text-gray-500">
          <tr>
            <th className="px-4 py-3 font-medium">{t("historySpaceName")}</th>
            <th className="px-4 py-3 font-medium">{t("historyStatus")}</th>
            <th className="px-4 py-3 font-medium">{t("historyDate")}</th>
            <th className="px-4 py-3 text-right font-medium">
              {t("spaceActions")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {spaces.map((space) => (
            <tr className="transition-colors hover:bg-gray-50" key={space.id}>
              <td className="px-4 py-3 font-medium text-gray-900">
                <Link
                  className="flex flex-col gap-1 transition-colors hover:text-purple-600"
                  href={`/dashboard/spaces/${space.id}`}
                >
                  <div className="flex items-center gap-2">
                    {space.title || space.share_key}
                    {space.is_owner === false && (
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-800 text-xs">
                        {t("adminBadge")}
                      </span>
                    )}
                  </div>
                  {space.status === "active" &&
                    space.participant_count !== undefined && (
                      <p className="flex items-center gap-1 text-gray-500 text-xs">
                        <Users className="h-3 w-3" />
                        {t("activeSpaceParticipants", {
                          count: space.participant_count || 0,
                        })}
                      </p>
                    )}
                </Link>
              </td>
              <td className="px-4 py-3">
                <StatusBadge
                  label={t(
                    getSpaceStatusTranslationKey(
                      space.status as "active" | "draft" | "closed" | null
                    )
                  )}
                  status={space.status || "closed"}
                />
              </td>
              <td className="px-4 py-3 text-gray-500">
                {formatDateShort(space.created_at || 0, locale)}
              </td>
              <td className="px-4 py-3 text-right">
                <SpaceActionsDropdown space={space} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SpaceTabs({
  hostedSpaces,
  hostedTabLabel,
  locale,
  participatedSpaces,
  participatedTabLabel,
}: SpaceTabsProps) {
  const t = useTranslations("Dashboard");

  return (
    <Tabs defaultValue="hosted">
      <TabsList>
        <TabsTrigger value="hosted">
          {hostedTabLabel || t("hostedSpacesTab")}
        </TabsTrigger>
        <TabsTrigger value="participated">
          {participatedTabLabel || t("participatedSpacesTab")}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="hosted">
        {hostedSpaces.length === 0 ? (
          <div className="overflow-hidden rounded-lg border bg-white p-8 text-center shadow-sm">
            <p className="text-gray-500 text-sm">{t("hostedSpacesEmpty")}</p>
          </div>
        ) : (
          <SpaceTable locale={locale} spaces={hostedSpaces} />
        )}
      </TabsContent>

      <TabsContent value="participated">
        {participatedSpaces.length === 0 ? (
          <div className="overflow-hidden rounded-lg border bg-white p-8 text-center shadow-sm">
            <p className="text-gray-500 text-sm">
              {t("participatedSpacesEmpty")}
            </p>
          </div>
        ) : (
          <SpaceTable locale={locale} spaces={participatedSpaces} />
        )}
      </TabsContent>
    </Tabs>
  );
}
