"use client";

import { revalidateLogic } from "@tanstack/react-form";
import {
  mergeForm,
  useForm,
  useStore,
  useTransform,
} from "@tanstack/react-form-nextjs";
import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useEffectEvent, useState } from "react";
import { toast } from "sonner";
import { InlineFieldError } from "@/components/field-errors";
import { FormErrors } from "@/components/form-errors";
import { useConfirm } from "@/components/providers/confirm-provider";
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
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/utils/error-message";
import type { Tables } from "@/types/supabase";
import {
  createSpaceAnnouncementAction,
  deleteSpaceAnnouncementAction,
  updateSpaceAnnouncementAction,
} from "../_actions/space-announcements";
import {
  spaceAnnouncementFormOpts,
  spaceAnnouncementFormSchema,
} from "../_lib/form-options";

interface SpaceAnnouncementFormProps {
  announcement?: Tables<"announcements">;
  announcementId?: string;
  onSuccess?: () => void;
  spaceId: string;
}

export function SpaceAnnouncementForm({
  announcement,
  announcementId,
  onSuccess,
  spaceId,
}: SpaceAnnouncementFormProps) {
  const router = useRouter();
  const t = useTranslations("SpaceAnnouncement");
  const confirm = useConfirm();
  const [isDeleting, setIsDeleting] = useState(false);

  const isEditMode = !!announcement && !!announcementId;

  const action = isEditMode
    ? updateSpaceAnnouncementAction.bind(null, spaceId, announcementId)
    : createSpaceAnnouncementAction.bind(null, spaceId);

  const [state, formAction] = useActionState(action, undefined);

  const form = useForm({
    ...spaceAnnouncementFormOpts,
    defaultValues: announcement
      ? {
          content: announcement.content,
          ends_at: announcement.ends_at
            ? new Date(announcement.ends_at).toISOString().slice(0, 16)
            : "",
          pinned: false, // Will be set from space_announcements table if needed
          priority: announcement.priority,
          starts_at: announcement.starts_at
            ? new Date(announcement.starts_at).toISOString().slice(0, 16)
            : "",
          title: announcement.title,
        }
      : spaceAnnouncementFormOpts.defaultValues,
    // biome-ignore lint/style/noNonNullAssertion: TanStack Form pattern requires non-null assertion for mergeForm
    transform: useTransform((baseForm) => mergeForm(baseForm, state!), [state]),
    validationLogic: revalidateLogic({
      mode: "submit",
      modeAfterSubmission: "change",
    }),
    validators: {
      onDynamic: spaceAnnouncementFormSchema,
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

  const handleDelete = async () => {
    if (!announcementId) {
      return;
    }

    if (
      !(await confirm({
        description: t("announcementDeleteConfirm"),
        title: t("announcementDeleteTitle"),
        variant: "destructive",
      }))
    ) {
      return;
    }

    setIsDeleting(true);
    const result = await deleteSpaceAnnouncementAction(spaceId, announcementId);
    setIsDeleting(false);

    if (result.success) {
      toast.success(t("announcementDeleteSuccess"));
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else {
          router.refresh();
        }
      }, 1000);
    } else {
      toast.error(result.error || t("announcementDeleteError"));
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

            <form.Field name="pinned">
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
                        {t("announcementPinnedLabel")}
                      </FieldLabel>
                    </div>
                    <FieldDescription>
                      {t("announcementPinnedHelp")}
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

        <div className="flex justify-end gap-2 border-t pt-6">
          {isEditMode && (
            <Button
              disabled={isDeleting || isSubmitting}
              onClick={handleDelete}
              type="button"
              variant="destructive"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("deleting")}
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("announcementDeleteButton")}
                </>
              )}
            </Button>
          )}
          <Button disabled={!canSubmit || isSubmitting} type="submit">
            {isSubmitting && t("processing")}
            {!isSubmitting && isEditMode && t("announcementUpdateButton")}
            {!(isSubmitting || isEditMode) && t("announcementCreateButton")}
          </Button>
        </div>
      </form>
    </div>
  );
}
