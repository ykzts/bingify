import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { checkSpaceMembership } from "../actions";
import { SpaceJoin } from "./space-join";

interface Props {
  params: Promise<{ id: string; locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: space, error } = await supabase
      .from("spaces")
      .select("share_key")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching space for metadata:", error);
      return {
        title: "Bingify - Space",
      };
    }

    if (space) {
      return {
        description: `Join the bingo space @${space.share_key} on Bingify`,
        openGraph: {
          description: `Join the bingo space @${space.share_key} on Bingify`,
          title: `Bingify - @${space.share_key}`,
        },
        title: `Bingify - @${space.share_key}`,
        twitter: {
          card: "summary_large_image",
          description: `Join the bingo space @${space.share_key} on Bingify`,
          title: `Bingify - @${space.share_key}`,
        },
      };
    }

    return {
      title: "Bingify - Space",
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: "Bingify - Space",
    };
  }
}

export default async function UserSpacePage({ params }: Props) {
  const { id, locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("UserSpace");
  const supabase = await createClient();

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Redirect to login with redirectTo parameter
    redirect(`/${locale}/login?redirectTo=/spaces/${id}`);
  }

  // Check if space exists
  const { data: space, error: spaceError } = await supabase
    .from("spaces")
    .select("id, share_key, status")
    .eq("id", id)
    .single();

  if (spaceError || !space) {
    redirect(`/${locale}?error=space_not_found`);
  }

  if (space.status !== "active") {
    redirect(`/${locale}?error=space_inactive`);
  }

  // Check membership
  const membership = await checkSpaceMembership(id);

  if (!membership.isMember) {
    // Show join confirmation page
    return <SpaceJoin locale={locale} spaceId={id} />;
  }

  // User is a member, show the space content
  return (
    <div className="min-h-screen p-8">
      <h1 className="mb-4 font-bold text-3xl">{t("heading")}</h1>
      <p>
        {t("spaceId")}: {id}
      </p>
      <p className="mt-2 text-gray-600">Share key: @{space.share_key}</p>
    </div>
  );
}
