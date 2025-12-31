"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";
import {
  type UpdateSystemSettingsState,
  updateSystemSettings,
} from "@/app/[locale]/admin/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SystemSettings } from "@/lib/schemas/system-settings";

interface Props {
  initialSettings?: SystemSettings;
}

const initialState: UpdateSystemSettingsState = {
  success: false,
};

export function SystemSettingsForm({ initialSettings }: Props) {
  const router = useRouter();
  const t = useTranslations("AdminSettings");
  const [state, formAction, isPending] = useActionState(
    updateSystemSettings,
    initialState
  );

  useEffect(() => {
    if (state.success) {
      // Show success message briefly, then refresh
      const timer = setTimeout(() => {
        router.refresh();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state.success, router]);

  return (
    <form action={formAction} className="space-y-6">
      {/* Resource Limits Section */}
      <div className="space-y-4">
        {/* Max Participants per Space */}
        <div className="space-y-2">
          <Label htmlFor="max_participants_per_space">
            {t("maxParticipantsLabel")}
          </Label>
          <Input
            defaultValue={initialSettings?.max_participants_per_space ?? 50}
            disabled={isPending}
            id="max_participants_per_space"
            max={10_000}
            min={1}
            name="max_participants_per_space"
            required
            type="number"
          />
          <p className="text-gray-600 text-sm">{t("maxParticipantsHelp")}</p>
        </div>

        {/* Max Spaces per User */}
        <div className="space-y-2">
          <Label htmlFor="max_spaces_per_user">
            {t("maxSpacesPerUserLabel")}
          </Label>
          <Input
            defaultValue={initialSettings?.max_spaces_per_user ?? 5}
            disabled={isPending}
            id="max_spaces_per_user"
            max={100}
            min={1}
            name="max_spaces_per_user"
            required
            type="number"
          />
          <p className="text-gray-600 text-sm">{t("maxSpacesPerUserHelp")}</p>
        </div>

        {/* Space Expiration Hours */}
        <div className="space-y-2">
          <Label htmlFor="space_expiration_hours">
            {t("spaceExpirationLabel")}
          </Label>
          <Input
            defaultValue={initialSettings?.space_expiration_hours ?? 48}
            disabled={isPending}
            id="space_expiration_hours"
            max={8760}
            min={0}
            name="space_expiration_hours"
            required
            type="number"
          />
          <p className="text-gray-600 text-sm">{t("spaceExpirationHelp")}</p>
        </div>
      </div>

      {/* Feature Flags Section */}
      <div className="space-y-4 border-t pt-6">
        <h4 className="font-semibold text-base">{t("featureFlagsTitle")}</h4>
        <p className="text-gray-600 text-sm">{t("featureFlagsDescription")}</p>

        {/* Gatekeeper Features */}
        <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h5 className="font-medium text-sm">
            {t("gatekeeperFeaturesTitle")}
          </h5>

          {/* YouTube Gatekeeper */}
          <div className="flex items-center space-x-2">
            <input
              className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              defaultChecked={
                initialSettings?.features?.gatekeeper?.youtube?.enabled ?? true
              }
              disabled={isPending}
              id="features.gatekeeper.youtube.enabled"
              name="features.gatekeeper.youtube.enabled"
              type="checkbox"
              value="true"
            />
            <Label
              className="cursor-pointer font-normal"
              htmlFor="features.gatekeeper.youtube.enabled"
            >
              {t("gatekeeperYoutubeLabel")}
            </Label>
          </div>

          {/* Twitch Gatekeeper */}
          <div className="flex items-center space-x-2">
            <input
              className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              defaultChecked={
                initialSettings?.features?.gatekeeper?.twitch?.enabled ?? true
              }
              disabled={isPending}
              id="features.gatekeeper.twitch.enabled"
              name="features.gatekeeper.twitch.enabled"
              type="checkbox"
              value="true"
            />
            <Label
              className="cursor-pointer font-normal"
              htmlFor="features.gatekeeper.twitch.enabled"
            >
              {t("gatekeeperTwitchLabel")}
            </Label>
          </div>

          {/* Email Gatekeeper */}
          <div className="flex items-center space-x-2">
            <input
              className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              defaultChecked={
                initialSettings?.features?.gatekeeper?.email?.enabled ?? true
              }
              disabled={isPending}
              id="features.gatekeeper.email.enabled"
              name="features.gatekeeper.email.enabled"
              type="checkbox"
              value="true"
            />
            <Label
              className="cursor-pointer font-normal"
              htmlFor="features.gatekeeper.email.enabled"
            >
              {t("gatekeeperEmailLabel")}
            </Label>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-red-800 text-sm">
            {t(state.error, { default: t("errorGeneric") })}
          </p>
        </div>
      )}

      {/* Success Message */}
      {state.success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="text-green-800 text-sm">{t("updateSuccess")}</p>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button disabled={isPending} type="submit">
          {isPending ? t("saving") : t("saveButton")}
        </Button>
      </div>
    </form>
  );
}
