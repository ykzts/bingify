"use client";

import { AlertCircle, CheckCircle, Loader2, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import { type UpdateUsernameState, updateUsername } from "../actions";

interface UsernameFormProps {
  currentUsername?: string | null;
}

export function UsernameForm({ currentUsername }: UsernameFormProps) {
  const t = useTranslations("UsernameSettings");
  const router = useRouter();
  const [username, setUsername] = useState(currentUsername || "");

  const [state, formAction, isPending] = useActionState<
    UpdateUsernameState,
    FormData
  >(updateUsername, {
    success: false,
  });

  useEffect(() => {
    setUsername(currentUsername || "");
  }, [currentUsername]);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <User className="h-5 w-5 text-gray-600" />
        <h2 className="font-semibold text-lg">{t("title")}</h2>
      </div>

      <p className="mb-6 text-gray-600 text-sm">{t("description")}</p>

      <form action={formAction} className="space-y-4">
        <div>
          <label className="mb-2 block font-medium text-sm" htmlFor="username">
            {t("usernameLabel")}
          </label>
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            id="username"
            maxLength={50}
            name="username"
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t("usernamePlaceholder")}
            required
            type="text"
            value={username}
          />
          <p className="mt-1 text-gray-500 text-xs">{t("usernameHelp")}</p>
        </div>

        {(state.error || state.errorKey) && (
          <div
            aria-live="polite"
            className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-red-800 text-sm"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>
              {state.errorKey
                ? t(state.errorKey, { defaultValue: t("errorGeneric") })
                : state.error}
            </span>
          </div>
        )}

        {state.success && (
          <div
            aria-live="polite"
            className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-green-800 text-sm"
          >
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            <span>{t("updateSuccess")}</span>
          </div>
        )}

        <button
          className="flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 font-medium text-sm text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isPending}
          type="submit"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("saving")}
            </>
          ) : (
            t("saveButton")
          )}
        </button>
      </form>
    </div>
  );
}
