"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { closeSpace } from "../actions";

interface CloseSpaceButtonProps {
  spaceId: string;
}

export function CloseSpaceButton({ spaceId }: CloseSpaceButtonProps) {
  const t = useTranslations("AdminSpace");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleClose = () => {
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    setError(null);

    startTransition(async () => {
      const result = await closeSpace(spaceId);

      if (result.success) {
        setShowSuccess(true);
        setTimeout(() => {
          router.refresh();
        }, 1500);
      } else {
        setError(result.error || t("closeSpaceError"));
      }
    });
  };

  return (
    <div>
      <button
        className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isPending}
        onClick={handleClose}
        type="button"
      >
        {isPending ? t("closing") : t("closeSpaceButton")}
      </button>
      {error && <p className="mt-2 text-red-600 text-sm">{error}</p>}

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div
          aria-labelledby="close-space-dialog-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          role="dialog"
        >
          <div className="mx-4 max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3
              className="mb-4 font-semibold text-lg"
              id="close-space-dialog-title"
            >
              {t("closeSpaceButton")}
            </h3>
            <p className="mb-6 text-gray-700 text-sm">
              {t("closeSpaceConfirm")}
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                onClick={() => setShowConfirm(false)}
                type="button"
              >
                {t("cancel")}
              </button>
              <button
                className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                onClick={handleConfirm}
                type="button"
              >
                {t("closeSpaceButton")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Dialog */}
      {showSuccess && (
        <div
          aria-live="polite"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
        >
          <output className="mx-4 max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3
              className="mb-4 font-semibold text-green-600 text-lg"
              id="close-space-success-title"
            >
              {t("closeSpaceSuccess")}
            </h3>
          </output>
        </div>
      )}
    </div>
  );
}
