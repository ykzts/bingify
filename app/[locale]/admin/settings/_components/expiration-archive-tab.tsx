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

export function ExpirationArchiveTab() {
  const t = useTranslations("AdminSettings");
  const { form, isSubmitting } = useSettingsForm();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-gray-600 text-sm">
          {t("expirationArchiveDescription")}
        </p>
      </div>

      <FieldSet>
        <FieldGroup>
          <form.Field name="space_expiration_hours">
            {/* biome-ignore lint/suspicious/noExplicitAny: TanStack Form field type */}
            {(field: any) => (
              <Field>
                <FieldContent>
                  <FieldLabel>{t("spaceExpirationLabel")}</FieldLabel>
                  <Input
                    disabled={isSubmitting}
                    max={8760}
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
                  <FieldDescription>
                    {t("spaceExpirationHelp")}
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

          <form.Field name="archive_retention_days">
            {/* biome-ignore lint/suspicious/noExplicitAny: TanStack Form field type */}
            {(field: any) => (
              <Field>
                <FieldContent>
                  <FieldLabel>{t("archiveRetentionLabel")}</FieldLabel>
                  <Input
                    disabled={isSubmitting}
                    max={365}
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
                  <FieldDescription>
                    {t("archiveRetentionHelp")}
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

          <form.Field name="spaces_archive_retention_days">
            {/* biome-ignore lint/suspicious/noExplicitAny: TanStack Form field type */}
            {(field: any) => (
              <Field>
                <FieldContent>
                  <FieldLabel>{t("spacesArchiveRetentionLabel")}</FieldLabel>
                  <Input
                    disabled={isSubmitting}
                    max={3650}
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
                  <FieldDescription>
                    {t("spacesArchiveRetentionHelp")}
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
        </FieldGroup>
      </FieldSet>
    </div>
  );
}
