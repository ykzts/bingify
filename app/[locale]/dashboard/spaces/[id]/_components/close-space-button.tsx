"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
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
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

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

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking the backdrop itself, not the dialog content
    if (event.target === event.currentTarget) {
      setShowConfirm(false);
    }
  };

  // Focus management for confirmation modal
  useEffect(() => {
    if (showConfirm && cancelButtonRef.current) {
      cancelButtonRef.current.focus();
    }
  }, [showConfirm]);

  // Escape key handler for confirmation modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (showConfirm) {
          setShowConfirm(false);
        } else if (showSuccess) {
          setShowSuccess(false);
        }
      }
    };

    if (showConfirm || showSuccess) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [showConfirm, showSuccess]);

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
        // biome-ignore lint/a11y/noNoninteractiveElementInteractions: Dialog backdrop needs click handler to close on outside click
        <div
          aria-labelledby="close-space-dialog-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={handleBackdropClick}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setShowConfirm(false);
            }
          }}
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
                ref={cancelButtonRef}
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
          aria-labelledby="close-space-success-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          role="dialog"
        >
          <div className="mx-auto max-w-md rounded-lg bg-white p-6 shadow-xl">
            <output
              aria-live="polite"
              className="block"
              id="close-space-success-title"
            >
              <h3 className="mb-4 font-semibold text-green-600 text-lg">
                {t("closeSpaceSuccess")}
              </h3>
            </output>
          </div>
        </div>
      )}
    </div>
  );
}
