"use client";

import {
  initialFormState,
  mergeForm,
  useForm,
  useStore,
  useTransform,
} from "@tanstack/react-form-nextjs";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";
import { updateSystemSettingsAction } from "@/app/[locale]/admin/settings/actions";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SystemSettings } from "@/lib/schemas/system-settings";
import { systemSettingsFormOpts } from "../form-options";

interface Props {
  initialSettings?: SystemSettings;
}

export function SystemSettingsForm({ initialSettings }: Props) {
  const router = useRouter();
  const t = useTranslations("AdminSettings");

  // Use TanStack Form with Next.js server actions
  const [state, action] = useActionState(
    updateSystemSettingsAction,
    initialFormState
  );

  const form = useForm({
    ...systemSettingsFormOpts,
    defaultValues: initialSettings
      ? {
          default_user_role: initialSettings.default_user_role,
          features: initialSettings.features,
          max_participants_per_space:
            initialSettings.max_participants_per_space,
          max_spaces_per_user: initialSettings.max_spaces_per_user,
          max_total_spaces: initialSettings.max_total_spaces,
          space_expiration_hours: initialSettings.space_expiration_hours,
        }
      : systemSettingsFormOpts.defaultValues,
    // biome-ignore lint/style/noNonNullAssertion: TanStack Form pattern requires non-null assertion for mergeForm
    transform: useTransform((baseForm) => mergeForm(baseForm, state!), [state]),
  });

  const formErrors = useStore(form.store, (formState) => formState.errors);
  const isSubmitting = useStore(
    form.store,
    (formState) => formState.isSubmitting
  );

  useEffect(() => {
    // Check for successful update
    const meta = (state as Record<string, unknown>)?.meta as
      | { success?: boolean }
      | undefined;
    if (meta?.success) {
      // Show success message briefly, then refresh
      const timer = setTimeout(() => {
        router.refresh();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state, router]);

  return (
    <form action={action} className="space-y-6">
      {/* Form-level errors */}
      {formErrors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          {formErrors.map((error) => (
            <p className="text-red-800 text-sm" key={String(error)}>
              {t(String(error), { default: t("errorGeneric") })}
            </p>
          ))}
        </div>
      )}

      {/* Resource Limits Section */}
      <FieldSet>
        <FieldLegend>リソース制限</FieldLegend>
        <FieldGroup>
          {/* Max Participants per Space */}
          <form.Field
            name="max_participants_per_space"
            validators={{
              onChange: ({ value }) => {
                if (value < 1 || value > 10_000) {
                  return "1から10000の範囲で入力してください";
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <Field>
                <FieldContent>
                  <FieldLabel>{t("maxParticipantsLabel")}</FieldLabel>
                  <Input
                    disabled={isSubmitting}
                    max={10_000}
                    min={1}
                    name={field.name}
                    onChange={(e) =>
                      field.handleChange(Number.parseInt(e.target.value, 10))
                    }
                    required
                    type="number"
                    value={field.state.value as number}
                  />
                  <FieldDescription>
                    {t("maxParticipantsHelp")}
                  </FieldDescription>
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-red-600 text-sm">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </FieldContent>
              </Field>
            )}
          </form.Field>

          {/* Max Spaces per User */}
          <form.Field
            name="max_spaces_per_user"
            validators={{
              onChange: ({ value }) => {
                if (value < 1 || value > 100) {
                  return "1から100の範囲で入力してください";
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <Field>
                <FieldContent>
                  <FieldLabel>{t("maxSpacesPerUserLabel")}</FieldLabel>
                  <Input
                    disabled={isSubmitting}
                    max={100}
                    min={1}
                    name={field.name}
                    onChange={(e) =>
                      field.handleChange(Number.parseInt(e.target.value, 10))
                    }
                    required
                    type="number"
                    value={field.state.value as number}
                  />
                  <FieldDescription>
                    {t("maxSpacesPerUserHelp")}
                  </FieldDescription>
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-red-600 text-sm">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </FieldContent>
              </Field>
            )}
          </form.Field>

          {/* Max Total Spaces */}
          <form.Field
            name="max_total_spaces"
            validators={{
              onChange: ({ value }) => {
                if (value < 0 || value > 100_000) {
                  return "0から100000の範囲で入力してください";
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <Field>
                <FieldContent>
                  <FieldLabel>{t("maxTotalSpacesLabel")}</FieldLabel>
                  <Input
                    disabled={isSubmitting}
                    max={100_000}
                    min={0}
                    name={field.name}
                    onChange={(e) =>
                      field.handleChange(Number.parseInt(e.target.value, 10))
                    }
                    required
                    type="number"
                    value={field.state.value as number}
                  />
                  <FieldDescription>{t("maxTotalSpacesHelp")}</FieldDescription>
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-red-600 text-sm">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </FieldContent>
              </Field>
            )}
          </form.Field>

          {/* Space Expiration Hours */}
          <form.Field
            name="space_expiration_hours"
            validators={{
              onChange: ({ value }) => {
                if (value < 0 || value > 8760) {
                  return "0から8760の範囲で入力してください";
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <Field>
                <FieldContent>
                  <FieldLabel>{t("spaceExpirationLabel")}</FieldLabel>
                  <Input
                    disabled={isSubmitting}
                    max={8760}
                    min={0}
                    name={field.name}
                    onChange={(e) =>
                      field.handleChange(Number.parseInt(e.target.value, 10))
                    }
                    required
                    type="number"
                    value={field.state.value as number}
                  />
                  <FieldDescription>
                    {t("spaceExpirationHelp")}
                  </FieldDescription>
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-red-600 text-sm">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </FieldContent>
              </Field>
            )}
          </form.Field>
        </FieldGroup>
      </FieldSet>

      {/* User Settings Section */}
      <FieldSet className="border-t pt-6">
        <FieldLegend>{t("userSettingsTitle")}</FieldLegend>
        <FieldGroup>
          {/* Default User Role */}
          <form.Field name="default_user_role">
            {(field) => (
              <Field>
                <FieldContent>
                  <FieldLabel>{t("defaultUserRoleLabel")}</FieldLabel>
                  <select
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isSubmitting}
                    name={field.name}
                    onChange={(e) =>
                      field.handleChange(e.target.value as "organizer" | "user")
                    }
                    required
                    value={field.state.value as string}
                  >
                    <option value="organizer">{t("roleOrganizer")}</option>
                    <option value="user">{t("roleUser")}</option>
                  </select>
                  <FieldDescription>
                    {t("defaultUserRoleHelp")}
                  </FieldDescription>
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-red-600 text-sm">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </FieldContent>
              </Field>
            )}
          </form.Field>
        </FieldGroup>
      </FieldSet>

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
          <form.Field name="features.gatekeeper.youtube.enabled">
            {(field) => (
              <div className="flex items-center space-x-2">
                <input
                  checked={field.state.value as boolean}
                  className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  disabled={isSubmitting}
                  id="features.gatekeeper.youtube.enabled"
                  name={field.name}
                  onChange={(e) => field.handleChange(e.target.checked)}
                  type="checkbox"
                />
                <Label
                  className="cursor-pointer font-normal"
                  htmlFor="features.gatekeeper.youtube.enabled"
                >
                  {t("gatekeeperYoutubeLabel")}
                </Label>
              </div>
            )}
          </form.Field>

          {/* Twitch Gatekeeper */}
          <form.Field name="features.gatekeeper.twitch.enabled">
            {(field) => (
              <div className="flex items-center space-x-2">
                <input
                  checked={field.state.value as boolean}
                  className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  disabled={isSubmitting}
                  id="features.gatekeeper.twitch.enabled"
                  name={field.name}
                  onChange={(e) => field.handleChange(e.target.checked)}
                  type="checkbox"
                />
                <Label
                  className="cursor-pointer font-normal"
                  htmlFor="features.gatekeeper.twitch.enabled"
                >
                  {t("gatekeeperTwitchLabel")}
                </Label>
              </div>
            )}
          </form.Field>

          {/* Email Gatekeeper */}
          <form.Field name="features.gatekeeper.email.enabled">
            {(field) => (
              <div className="flex items-center space-x-2">
                <input
                  checked={field.state.value as boolean}
                  className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  disabled={isSubmitting}
                  id="features.gatekeeper.email.enabled"
                  name={field.name}
                  onChange={(e) => field.handleChange(e.target.checked)}
                  type="checkbox"
                />
                <Label
                  className="cursor-pointer font-normal"
                  htmlFor="features.gatekeeper.email.enabled"
                >
                  {t("gatekeeperEmailLabel")}
                </Label>
              </div>
            )}
          </form.Field>
        </div>
      </div>

      {/* Success Message */}
      {(state as Record<string, unknown>)?.meta &&
        ((state as Record<string, unknown>).meta as { success?: boolean })
          ?.success && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3">
            <p className="text-green-800 text-sm">{t("updateSuccess")}</p>
          </div>
        )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? t("saving") : t("saveButton")}
        </Button>
      </div>
    </form>
  );
}
