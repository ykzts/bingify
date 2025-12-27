"use client";

import { format } from "date-fns";
import { AlertCircle, Check, Dices, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { useDebounce } from "use-debounce";
import { generateRandomKey } from "@/lib/utils/random-key";
import type { CreateSpaceState } from "./actions";
import { checkSlugAvailability, createSpace } from "./actions";

export function CreateSpaceForm() {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [debouncedSlug] = useDebounce(slug, 500);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);

  const dateSuffix = format(new Date(), "yyyyMMdd");

  const [state, formAction, isPending] = useActionState<
    CreateSpaceState,
    FormData
  >(createSpace, {
    success: false,
  });

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSlug = e.target.value.toLowerCase();
    setSlug(newSlug);

    // Reset validation state when slug changes and is too short
    if (!newSlug || newSlug.length < 3) {
      setAvailable(null);
    }
  };

  const handleGenerateRandomKey = () => {
    const randomKey = generateRandomKey();
    setSlug(randomKey);
    setAvailable(null);
  };

  const handleAcceptSuggestion = () => {
    if (state.suggestion) {
      // Extract the slug part from suggestion
      // Format: "slug-2-20251226" or "my-party-3-20251226"
      // Remove the last part (date suffix): "-20251226"
      const suggestionWithoutDate = state.suggestion.replace(
        `-${dateSuffix}`,
        ""
      );
      setSlug(suggestionWithoutDate);
      setAvailable(null);
    }
  };

  useEffect(() => {
    if (!debouncedSlug || debouncedSlug.length < 3) {
      return;
    }

    const check = async () => {
      setChecking(true);
      try {
        const result = await checkSlugAvailability(debouncedSlug);
        setAvailable(result.available);
      } finally {
        setChecking(false);
      }
    };

    check();
  }, [debouncedSlug]);

  useEffect(() => {
    if (state.success && state.spaceId) {
      router.push(`/dashboard/spaces/${state.spaceId}`);
    }
  }, [state, router]);

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-8 font-bold text-3xl">新しいスペースを作成</h1>

      <form action={formAction} className="space-y-6">
        <div>
          <label className="mb-2 block font-medium text-sm" htmlFor="slug">
            共有キー
          </label>

          <div className="mb-2 flex items-center gap-2">
            <input
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-primary"
              disabled={isPending}
              id="slug"
              maxLength={30}
              minLength={3}
              name="slug"
              onChange={handleSlugChange}
              pattern="[a-z0-9-]+"
              placeholder="my-party"
              required
              type="text"
              value={slug}
            />
            <button
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-sm text-white transition hover:bg-blue-700"
              disabled={isPending}
              onClick={handleGenerateRandomKey}
              type="button"
            >
              <Dices className="h-4 w-4" />
              ランダム生成
            </button>
            <span className="font-mono text-gray-500">-{dateSuffix}</span>
          </div>

          <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-amber-800 text-sm">
              ⚠️ この共有キーを知っているユーザーは誰でも参加できます
            </p>
          </div>

          <p className="mb-2 text-gray-500 text-sm">
            公開URL:{" "}
            <span className="font-mono">
              @{slug || "..."}-{dateSuffix}
            </span>
          </p>

          {/* Status indicator */}
          {slug.length >= 3 && (
            <div className="mt-2 flex items-center gap-2">
              {checking && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  <span className="text-gray-500 text-sm">確認中...</span>
                </>
              )}

              {!checking && available === true && (
                <>
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-green-600 text-sm">
                    この共有キーは使用可能です
                  </span>
                </>
              )}

              {!checking && available === false && (
                <>
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="text-amber-600 text-sm">
                    この共有キーは既に使用されています
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {state.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-red-800">{state.error}</p>
            {state.suggestion && (
              <div className="mt-3">
                <p className="mb-2 text-red-700 text-sm">
                  代わりにこちらを使用できます:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-white px-3 py-2 font-mono text-sm">
                    {state.suggestion}
                  </code>
                  <button
                    className="rounded-lg bg-red-600 px-4 py-2 font-medium text-sm text-white transition hover:bg-red-700"
                    onClick={handleAcceptSuggestion}
                    type="button"
                  >
                    使用する
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <button
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isPending || available === false || slug.length < 3}
          type="submit"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isPending ? "作成中..." : "スペースを作成"}
        </button>
      </form>
    </div>
  );
}
