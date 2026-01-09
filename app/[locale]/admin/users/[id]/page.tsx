import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/utils/uuid";
import { AvatarManagement } from "../_components/avatar-management";

export const dynamic = "force-dynamic";

/**
 * ユーザー詳細ページ
 */
export default async function AdminUserDetailPage({
  params,
}: PageProps<"/[locale]/admin/users/[id]">) {
  const { id, locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Admin");

  // UUID検証
  if (!isValidUUID(id)) {
    notFound();
  }

  // 管理者権限を確認
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (currentProfile?.role !== "admin") {
    notFound();
  }

  // ユーザー情報を取得
  const adminClient = createAdminClient();
  const { data: profile, error } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !profile) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div>
        <Link href={`/${locale}/admin/users`}>
          <Button size="sm" variant="ghost">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("backToUserList")}
          </Button>
        </Link>
        <h2 className="mt-4 font-bold text-2xl">{t("userDetailTitle")}</h2>
      </div>

      {/* ユーザー基本情報 */}
      <div className="rounded-lg border bg-white p-6">
        <h3 className="mb-4 font-semibold text-lg">{t("basicInfo")}</h3>
        <dl className="space-y-3">
          <div>
            <dt className="font-medium text-gray-700 text-sm">{t("email")}</dt>
            <dd className="mt-1 text-gray-900">{profile.email || "N/A"}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-700 text-sm">
              {t("fullName")}
            </dt>
            <dd className="mt-1 text-gray-900">{profile.full_name || "N/A"}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-700 text-sm">{t("role")}</dt>
            <dd className="mt-1 text-gray-900">{profile.role}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-700 text-sm">
              {t("createDate")}
            </dt>
            <dd className="mt-1 text-gray-900">
              {profile.created_at
                ? new Date(profile.created_at).toLocaleString()
                : "N/A"}
            </dd>
          </div>
        </dl>
      </div>

      {/* アバター管理 */}
      <AvatarManagement userId={id} userProfile={profile} />
    </div>
  );
}
