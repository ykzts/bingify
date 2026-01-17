"use client";

import { revalidateLogic } from "@tanstack/react-form";
import {
  mergeForm,
  useForm,
  useStore,
  useTransform,
} from "@tanstack/react-form-nextjs";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useEffectEvent, useState } from "react";
import { toast } from "sonner";
import { InlineFieldError } from "@/components/field-errors";
import { FormErrors } from "@/components/form-errors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/utils/error-message";
import type { Tables } from "@/types/supabase";
import {
  createAnnouncementAction,
  updateAnnouncementAction,
} from "../_actions/announcements";
import {
  type AnnouncementFormValues,
  announcementFormOpts,
  announcementFormSchema,
} from "../_lib/form-options";

interface AnnouncementFormProps {
  announcement?: Tables<"announcements">;
  onSuccess?: () => void;
}

export function AnnouncementForm({
  announcement,
  onSuccess,
}: AnnouncementFormProps) {
  const router = useRouter();
  const t = useTranslations("Admin");
  const [showPreview, setShowPreview] = useState(false);

  const isEditMode = !!announcement;

  const action = isEditMode
    ? updateAnnouncementAction.bind(null, announcement.id)
    : createAnnouncementAction;

  const [state, formAction] = useActionState(action, undefined);

  const form = useForm({
    ...announcementFormOpts,
    defaultValues: announcement
      ? {
          content: announcement.content,
          dismissible: announcement.dismissible,
          ends_at: announcement.ends_at
            ? new Date(announcement.ends_at).toISOString().slice(0, 16)
            : "",
          locale: announcement.locale || "ja",
          parent_id: announcement.parent_id || null,
          priority: announcement.priority,
          published: announcement.published,
          starts_at: announcement.starts_at
            ? new Date(announcement.starts_at).toISOString().slice(0, 16)
            : "",
          title: announcement.title,
        }
      : announcementFormOpts.defaultValues,
    // biome-ignore lint/style/noNonNullAssertion: TanStack Form pattern requires non-null assertion for mergeForm
    transform: useTransform((baseForm) => mergeForm(baseForm, state!), [state]),
    validationLogic: revalidateLogic({
      mode: "submit",
      modeAfterSubmission: "change",
    }),
    validators: {
      onDynamic: announcementFormSchema,
    },
  });

  const formErrors = useStore(form.store, (formState) => formState.errors);
  const isSubmitting = useStore(
    form.store,
    (formState) => formState.isSubmitting
  );
  const canSubmit = useStore(form.store, (formState) => formState.canSubmit);

  const handleSuccess = useEffectEvent(() => {
    toast.success(
      isEditMode
        ? t("announcementUpdateSuccess")
        : t("announcementCreateSuccess")
    );
    setTimeout(() => {
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    }, 1000);
  });

  useEffect(() => {
    const meta = (state as Record<string, unknown>)?.meta as
      | { success?: boolean }
      | undefined;
    if (meta?.success) {
      handleSuccess();
    }
  }, [state]);

  const titleValue = useStore(form.store, (formState) => {
    const values = formState.values as AnnouncementFormValues;
    return values.title || "";
  });

  const contentValue = useStore(form.store, (formState) => {
    const values = formState.values as AnnouncementFormValues;
    return values.content || "";
  });

  const priorityValue = useStore(form.store, (formState) => {
    const values = formState.values as AnnouncementFormValues;
    return values.priority || "info";
  });

  const getPriorityBadgeVariant = (
    priority: string
  ): "default" | "destructive" | "secondary" => {
    switch (priority) {
      case "error":
        return "destructive";
      case "warning":
        return "secondary";
      default:
        return "default";
    }
  };

  return (
    <div>
      <DialogHeader>
        <DialogTitle>
          {isEditMode
            ? t("announcementEditTitle")
            : t("announcementCreateTitle")}
        </DialogTitle>
      </DialogHeader>

      <div className="mt-4 flex gap-2">
        <Button
          onClick={() => setShowPreview(false)}
          size="sm"
          variant={showPreview ? "outline" : "default"}
        >
          {t("announcementFormTab")}
        </Button>
        <Button
          onClick={() => setShowPreview(true)}
          size="sm"
          variant={showPreview ? "default" : "outline"}
        >
          {t("announcementPreviewTab")}
        </Button>
      </div>

      {showPreview ? (
        <div className="mt-6 rounded-lg border p-6">
          <div className="mb-4 flex items-center gap-2">
            <Badge variant={getPriorityBadgeVariant(priorityValue as string)}>
              {t(
                `announcementPriority${(priorityValue as string).charAt(0).toUpperCase()}${(priorityValue as string).slice(1)}`
              )}
            </Badge>
            <h3 className="font-semibold text-lg">
              {titleValue || t("announcementPreviewNoTitle")}
            </h3>
          </div>
          <div className="whitespace-pre-wrap text-gray-700">
            {contentValue || t("announcementPreviewNoContent")}
          </div>
        </div>
      ) : (
        <form
          action={formAction}
          className="mt-6 space-y-6"
          noValidate
          onSubmit={() => form.handleSubmit()}
        >
          <FormErrors errors={formErrors} variant="with-icon" />

          <FieldSet>
            <FieldGroup>
              <form.Field name="title">
                {/* biome-ignore lint/suspicious/noExplicitAny: TanStack Form field type */}
                {(field: any) => (
                  <Field>
                    <FieldContent>
                      <FieldLabel>{t("announcementTitleLabel")}</FieldLabel>
                      <Input
                        disabled={isSubmitting}
                        maxLength={200}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder={t("announcementTitlePlaceholder")}
                        type="text"
                        value={field.state.value}
                      />
                      <FieldDescription>
                        {t("announcementTitleHelp")}
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

              <form.Field name="content">
                {/* biome-ignore lint/suspicious/noExplicitAny: TanStack Form field type */}
                {(field: any) => (
                  <Field>
                    <FieldContent>
                      <FieldLabel>{t("announcementContentLabel")}</FieldLabel>
                      <Textarea
                        className="min-h-[150px]"
                        disabled={isSubmitting}
                        maxLength={5000}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder={t("announcementContentPlaceholder")}
                        value={field.state.value}
                      />
                      <FieldDescription>
                        {t("announcementContentHelp")}
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

              <form.Field name="locale">
                {/* biome-ignore lint/suspicious/noExplicitAny: TanStack Form field type */}
                {(field: any) => (
                  <Field>
                    <FieldContent>
                      <FieldLabel>{t("announcementLocaleLabel")}</FieldLabel>
                      <Select
                        disabled={isSubmitting}
                        name={field.name}
                        onValueChange={(value) => field.handleChange(value)}
                        value={field.state.value as string}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ja">
                            {t("announcementLocaleJa")}
                          </SelectItem>
                          <SelectItem value="en">
                            {t("announcementLocaleEn")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FieldDescription>
                        {t("announcementLocaleHelp")}
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

              <form.Field name="priority">
                {/* biome-ignore lint/suspicious/noExplicitAny: TanStack Form field type */}
                {(field: any) => (
                  <Field>
                    <FieldContent>
                      <FieldLabel>{t("announcementPriorityLabel")}</FieldLabel>
                      <Select
                        disabled={isSubmitting}
                        name={field.name}
                        onValueChange={(value) => field.handleChange(value)}
                        value={field.state.value as string}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="info">
                            {t("announcementPriorityInfo")}
                          </SelectItem>
                          <SelectItem value="warning">
                            {t("announcementPriorityWarning")}
                          </SelectItem>
                          <SelectItem value="error">
                            {t("announcementPriorityError")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FieldDescription>
                        {t("announcementPriorityHelp")}
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

              <form.Field name="starts_at">
                {/* biome-ignore lint/suspicious/noExplicitAny: TanStack Form field type */}
                {(field: any) => (
                  <Field>
                    <FieldContent>
                      <FieldLabel>{t("announcementStartsAtLabel")}</FieldLabel>
                      <Input
                        disabled={isSubmitting}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        type="datetime-local"
                        value={field.state.value}
                      />
                      <FieldDescription>
                        {t("announcementStartsAtHelp")}
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

              <form.Field name="ends_at">
                {/* biome-ignore lint/suspicious/noExplicitAny: TanStack Form field type */}
                {(field: any) => (
                  <Field>
                    <FieldContent>
                      <FieldLabel>{t("announcementEndsAtLabel")}</FieldLabel>
                      <Input
                        disabled={isSubmitting}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        type="datetime-local"
                        value={field.state.value}
                      />
                      <FieldDescription>
                        {t("announcementEndsAtHelp")}
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

              <form.Field name="dismissible">
                {/* biome-ignore lint/suspicious/noExplicitAny: TanStack Form field type */}
                {(field: any) => (
                  <Field>
                    <FieldContent>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={field.state.value}
                          disabled={isSubmitting}
                          id={field.name}
                          name={field.name}
                          onCheckedChange={(checked) =>
                            field.handleChange(checked === true)
                          }
                        />
                        <FieldLabel htmlFor={field.name}>
                          {t("announcementDismissibleLabel")}
                        </FieldLabel>
                      </div>
                      <FieldDescription>
                        {t("announcementDismissibleHelp")}
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

              <form.Field name="published">
                {/* biome-ignore lint/suspicious/noExplicitAny: TanStack Form field type */}
                {(field: any) => (
                  <Field>
                    <FieldContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <FieldLabel htmlFor={field.name}>
                            {t("announcementPublishedLabel")}
                          </FieldLabel>
                          <FieldDescription>
                            {t("announcementPublishedHelp")}
                          </FieldDescription>
                        </div>
                        <Switch
                          checked={field.state.value}
                          disabled={isSubmitting}
                          id={field.name}
                          name={field.name}
                          onCheckedChange={(checked) =>
                            field.handleChange(checked)
                          }
                        />
                      </div>
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

          <div className="flex justify-end gap-2 border-t pt-6">
            <Button disabled={!canSubmit || isSubmitting} type="submit">
              {isSubmitting && t("processing")}
              {!isSubmitting && isEditMode && t("announcementUpdateButton")}
              {!(isSubmitting || isEditMode) && t("announcementCreateButton")}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
