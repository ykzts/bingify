"use client";

import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { FormErrors } from "@/components/form-errors";
import { SectionHeader } from "@/components/section-header";
import { Button } from "@/components/ui/button";

interface ProfileSettingsFormCardProps {
  action: (payload: FormData) => void;
  aboveFields?: ReactNode;
  canSubmit: boolean;
  children: ReactNode;
  description: string;
  formErrors: Parameters<typeof FormErrors>[0]["errors"];
  icon: LucideIcon;
  idleLabel: string;
  isSubmitting: boolean;
  onSubmit: () => void;
  submittingLabel: string;
  title: string;
}

export function ProfileSettingsFormCard({
  action,
  aboveFields,
  canSubmit,
  children,
  description,
  formErrors,
  icon: Icon,
  idleLabel,
  isSubmitting,
  onSubmit,
  submittingLabel,
  title,
}: ProfileSettingsFormCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <SectionHeader description={description} icon={Icon}>
        {title}
      </SectionHeader>

      <form
        action={action}
        className="space-y-4"
        noValidate
        onSubmit={onSubmit}
      >
        <FormErrors errors={formErrors} variant="with-icon" />
        {aboveFields}
        {children}

        <Button disabled={!canSubmit || isSubmitting} type="submit">
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {submittingLabel}
            </>
          ) : (
            idleLabel
          )}
        </Button>
      </form>
    </div>
  );
}
