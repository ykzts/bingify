"use client";

import { useStore } from "@tanstack/react-form";
import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { systemSettingsFormOpts } from "../_lib/form-options";

interface Props {
  form: ReturnType<
    typeof import("@tanstack/react-form-nextjs").useForm<
      typeof systemSettingsFormOpts
    >
  >;
  isSubmitting: boolean;
}

export function AuthProvidersTab({ form, isSubmitting }: Props) {
  const t = useTranslations("AdminSettings");

  // Get platform-level enabled states from nested form values
  const formValues = useStore(form.store, (state) => state.values);
  const youtubeEnabled =
    formValues.features?.gatekeeper?.youtube?.enabled ?? true;
  const twitchEnabled =
    formValues.features?.gatekeeper?.twitch?.enabled ?? true;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-gray-600 text-sm">{t("authProvidersDescription")}</p>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-base">{t("featureFlagsTitle")}</h4>
        <p className="text-gray-600 text-sm">{t("featureFlagsDescription")}</p>

        <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h5 className="font-medium text-sm">
            {t("gatekeeperFeaturesTitle")}
          </h5>

          {/* YouTube Platform */}
          <div className="space-y-2">
            <form.Field name="features.gatekeeper.youtube.enabled">
              {(field) => (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={field.state.value as boolean}
                    disabled={isSubmitting}
                    id="features.gatekeeper.youtube.enabled"
                    name={field.name}
                    onCheckedChange={(checked) =>
                      field.handleChange(checked === true)
                    }
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

            {/* YouTube Requirement Types */}
            {youtubeEnabled && (
              <div className="ml-6 space-y-2 border-gray-200 border-l-2 pl-4">
                <form.Field name="features.gatekeeper.youtube.member.enabled">
                  {(field) => (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={field.state.value as boolean}
                        disabled={isSubmitting}
                        id="features.gatekeeper.youtube.member.enabled"
                        name={field.name}
                        onCheckedChange={(checked) =>
                          field.handleChange(checked === true)
                        }
                      />
                      <Label
                        className="cursor-pointer font-normal text-sm"
                        htmlFor="features.gatekeeper.youtube.member.enabled"
                      >
                        {t("youtubeMemberLabel")}
                      </Label>
                    </div>
                  )}
                </form.Field>

                <form.Field name="features.gatekeeper.youtube.subscriber.enabled">
                  {(field) => (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={field.state.value as boolean}
                        disabled={isSubmitting}
                        id="features.gatekeeper.youtube.subscriber.enabled"
                        name={field.name}
                        onCheckedChange={(checked) =>
                          field.handleChange(checked === true)
                        }
                      />
                      <Label
                        className="cursor-pointer font-normal text-sm"
                        htmlFor="features.gatekeeper.youtube.subscriber.enabled"
                      >
                        {t("youtubeSubscriberLabel")}
                      </Label>
                    </div>
                  )}
                </form.Field>
              </div>
            )}
          </div>

          {/* Twitch Platform */}
          <div className="space-y-2">
            <form.Field name="features.gatekeeper.twitch.enabled">
              {(field) => (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={field.state.value as boolean}
                    disabled={isSubmitting}
                    id="features.gatekeeper.twitch.enabled"
                    name={field.name}
                    onCheckedChange={(checked) =>
                      field.handleChange(checked === true)
                    }
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

            {/* Twitch Requirement Types */}
            {twitchEnabled && (
              <div className="ml-6 space-y-2 border-gray-200 border-l-2 pl-4">
                <form.Field name="features.gatekeeper.twitch.follower.enabled">
                  {(field) => (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={field.state.value as boolean}
                        disabled={isSubmitting}
                        id="features.gatekeeper.twitch.follower.enabled"
                        name={field.name}
                        onCheckedChange={(checked) =>
                          field.handleChange(checked === true)
                        }
                      />
                      <Label
                        className="cursor-pointer font-normal text-sm"
                        htmlFor="features.gatekeeper.twitch.follower.enabled"
                      >
                        {t("twitchFollowerLabel")}
                      </Label>
                    </div>
                  )}
                </form.Field>

                <form.Field name="features.gatekeeper.twitch.subscriber.enabled">
                  {(field) => (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={field.state.value as boolean}
                        disabled={isSubmitting}
                        id="features.gatekeeper.twitch.subscriber.enabled"
                        name={field.name}
                        onCheckedChange={(checked) =>
                          field.handleChange(checked === true)
                        }
                      />
                      <Label
                        className="cursor-pointer font-normal text-sm"
                        htmlFor="features.gatekeeper.twitch.subscriber.enabled"
                      >
                        {t("twitchSubscriberLabel")}
                      </Label>
                    </div>
                  )}
                </form.Field>
              </div>
            )}
          </div>

          {/* Email */}
          <form.Field name="features.gatekeeper.email.enabled">
            {(field) => (
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={field.state.value as boolean}
                  disabled={isSubmitting}
                  id="features.gatekeeper.email.enabled"
                  name={field.name}
                  onCheckedChange={(checked) =>
                    field.handleChange(checked === true)
                  }
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
    </div>
  );
}
