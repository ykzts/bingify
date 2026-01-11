// Component uses TanStack Form's render props which have complex types
// biome-ignore lint: Complex TanStack Form types
// @ts-nocheck
"use client";

import { useTranslations } from "next-intl";
import { InlineFieldError } from "@/components/field-errors";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getErrorMessage } from "@/lib/utils/error-message";

interface Props {
  // biome-ignore lint/suspicious/noExplicitAny: TanStack Form types are complex and internal
  form: any;
  isSubmitting: boolean;
}

export function GeneralSettingsTab({ form, isSubmitting }: Props) {
  const t = useTranslations("AdminSettings");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-gray-600 text-sm">{t("generalDescription")}</p>
      </div>

      <FieldSet>
        <FieldLegend>{t("userSettingsTitle")}</FieldLegend>
        <FieldGroup>
          <form.Field name="default_user_role">
            {(field) => (
              <Field>
                <FieldContent>
                  <FieldLabel>{t("defaultUserRoleLabel")}</FieldLabel>
                  <Select
                    disabled={isSubmitting}
                    name={field.name}
                    onValueChange={(value) =>
                      field.handleChange(value as "organizer" | "user")
                    }
                    value={field.state.value as string}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="organizer">
                        {t("roleOrganizer")}
                      </SelectItem>
                      <SelectItem value="user">{t("roleUser")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    {t("defaultUserRoleHelp")}
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
