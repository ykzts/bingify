"use client";

import { useTranslations } from "next-intl";
import { InlineFieldError } from "@/components/field-errors";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/utils/error-message";
import { useSettingsForm } from "./settings-form-context";

export function ResourceLimitsTab() {
  const t = useTranslations("AdminSettings");
  const { form, isSubmitting } = useSettingsForm();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-gray-600 text-sm">
          {t("resourceLimitsDescription")}
        </p>
      </div>

      <FieldSet>
        <FieldGroup>
          <form.Field name="max_participants_per_space">
            {/* biome-ignore lint/suspicious/noExplicitAny: TanStack Form field type */}
            {(field: any) => (
              <Field>
                <FieldContent>
                  <FieldLabel>{t("maxParticipantsLabel")}</FieldLabel>
                  <Input
                    disabled={isSubmitting}
                    max={10_000}
                    min={1}
                    name={field.name}
                    onChange={(e) => {
                      const parsed = Number.parseInt(e.target.value, 10);
                      field.handleChange(Number.isNaN(parsed) ? 0 : parsed);
                    }}
                    required
                    type="number"
                    value={field.state.value as number}
                  />
                  <FieldDescription>
                    {t("maxParticipantsHelp")}
                  </FieldDescription>
                  {field.state.meta.errors.length > 0 && (
                    <InlineFieldError>
                      {getErrorMessage(field.state.meta.errors[0])}
                    </InlineFieldError>
                  )}
                </FieldContent>
              </Field>
            )}
          </form.Field>

          <form.Field name="max_spaces_per_user">
            {/* biome-ignore lint/suspicious/noExplicitAny: TanStack Form field type */}
            {(field: any) => (
              <Field>
                <FieldContent>
                  <FieldLabel>{t("maxSpacesPerUserLabel")}</FieldLabel>
                  <Input
                    disabled={isSubmitting}
                    max={100}
                    min={1}
                    name={field.name}
                    onChange={(e) => {
                      const parsed = Number.parseInt(e.target.value, 10);
                      field.handleChange(Number.isNaN(parsed) ? 0 : parsed);
                    }}
                    required
                    type="number"
                    value={field.state.value as number}
                  />
                  <FieldDescription>
                    {t("maxSpacesPerUserHelp")}
                  </FieldDescription>
                  {field.state.meta.errors.length > 0 && (
                    <InlineFieldError>
                      {getErrorMessage(field.state.meta.errors[0])}
                    </InlineFieldError>
                  )}
                </FieldContent>
              </Field>
            )}
          </form.Field>

          <form.Field name="max_total_spaces">
            {/* biome-ignore lint/suspicious/noExplicitAny: TanStack Form field type */}
            {(field: any) => (
              <Field>
                <FieldContent>
                  <FieldLabel>{t("maxTotalSpacesLabel")}</FieldLabel>
                  <Input
                    disabled={isSubmitting}
                    max={100_000}
                    min={0}
                    name={field.name}
                    onChange={(e) => {
                      const parsed = Number.parseInt(e.target.value, 10);
                      field.handleChange(Number.isNaN(parsed) ? 0 : parsed);
                    }}
                    required
                    type="number"
                    value={field.state.value as number}
                  />
                  <FieldDescription>{t("maxTotalSpacesHelp")}</FieldDescription>
                  {field.state.meta.errors.length > 0 && (
                    <InlineFieldError>
                      {getErrorMessage(field.state.meta.errors[0])}
                    </InlineFieldError>
                  )}
                </FieldContent>
              </Field>
            )}
          </form.Field>
        </FieldGroup>
      </FieldSet>
    </div>
  );
}
