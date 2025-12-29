import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { SpaceSettingsForm } from "./_components/space-settings-form";

interface Props {
  params: Promise<{ id: string; locale: string }>;
}

export default async function SpaceSettingsPage({ params }: Props) {
  const { id, locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("SpaceSettings");
  const supabase = await createClient();

  // Fetch space (RLS ensures only owner can access)
  const { data: space, error } = await supabase
    .from("spaces")
    .select(
      "id, share_key, status, max_participants, gatekeeper_rules, title, description, settings"
    )
    .eq("id", id)
    .single();

  if (error || !space) {
    notFound();
  }

  // Get current participant count
  // Note: Using regular SELECT instead of HEAD to ensure RLS policy works correctly
  // The RLS policy allows space owners to read participants
  const { count: participantCount, error: participantCountError } =
    await supabase
      .from("participants")
      .select("id", { count: "exact" })
      .eq("space_id", id);

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
      <div className="mx-auto max-w-4xl">
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
      </div>
    </div>
  );
}
