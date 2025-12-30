import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { AdminManagement } from "./_components/admin-management";
import { SpaceSettingsForm } from "./_components/space-settings-form";

interface Props {
  params: Promise<{ id: string; locale: string }>;
}

export default async function SpaceSettingsPage({ params }: Props) {
  const { id, locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("SpaceSettings");
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  // Fetch space (RLS ensures only owner/admin can access)
  const { data: space, error } = await supabase
    .from("spaces")
    .select(
      "id, share_key, status, max_participants, gatekeeper_rules, title, description, settings, owner_id"
    )
    .eq("id", id)
    .single();

  if (error || !space) {
    notFound();
  }

  // Check if current user is owner
  const isOwner = space.owner_id === user.id;

  // Get current participant count
  // Note: Fetching actual data instead of using count to avoid RLS recursion issues
  // The RLS policy on participants table has recursive EXISTS checks that can cause issues with count queries
  const { data: participantsData, error: participantCountError } =
    await supabase.from("participants").select("id").eq("space_id", id);

  const participantCount = participantsData?.length ?? 0;

  if (participantCountError) {
    console.error(
      "Failed to fetch participant count for space",
      id,
      participantCountError
    );
  }

  // Get system settings
  const { data: systemSettings } = await supabase
    .from("system_settings")
    .select("max_participants_per_space")
    .eq("id", 1)
    .single();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="mb-8">
          <h1 className="mb-2 font-bold text-3xl">{t("heading")}</h1>
          <p className="text-gray-600">
            {space.share_key} -{" "}
            {space.status === "draft" ? t("statusDraft") : t("statusActive")}
          </p>
        </div>

        {participantCountError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-red-800">{t("errorFetchParticipantCount")}</p>
          </div>
        )}

        {/* Space Settings */}
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <SpaceSettingsForm
            currentParticipantCount={participantCount || 0}
            locale={locale}
            space={space}
            systemMaxParticipants={
              systemSettings?.max_participants_per_space || 1000
            }
          />
        </div>

        {/* Admin Management - Only visible to owner */}
        {isOwner && (
          <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
            <AdminManagement spaceId={id} />
          </div>
        )}
      </div>
    </div>
  );
}
