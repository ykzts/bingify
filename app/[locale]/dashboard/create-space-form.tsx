"use client";

import { format } from "date-fns";
import { AlertCircle, Check, Dices, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import { useDebounce } from "use-debounce";
import { generateRandomKey } from "@/lib/utils/random-key";
import type { CreateSpaceState } from "./actions";
import { checkSlugAvailability, createSpace } from "./actions";

export function CreateSpaceForm() {
  const router = useRouter();
  const t = useTranslations("CreateSpace");
  const [shareKey, setShareKey] = useState("");
  const [maxParticipants, setMaxParticipants] = useState(50);
  const [youtubeChannelId, setYoutubeChannelId] = useState("");
  const [youtubeRequirement, setYoutubeRequirement] = useState("none");
  const [twitchBroadcasterId, setTwitchBroadcasterId] = useState("");
  const [twitchRequirement, setTwitchRequirement] = useState("none");
  const [emailAllowlist, setEmailAllowlist] = useState("");
  const [debouncedShareKey] = useDebounce(shareKey, 500);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);

  const dateSuffix = format(new Date(), "yyyyMMdd");

  const [state, formAction, isPending] = useActionState<
    CreateSpaceState,
    FormData
  >(createSpace, {
    success: false,
  });

  const handleShareKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newShareKey = e.target.value.toLowerCase();
    setShareKey(newShareKey);

    // Reset validation state when shareKey changes and is too short
    if (!newShareKey || newShareKey.length < 3) {
      setAvailable(null);
    }
  };

  const handleGenerateRandomKey = () => {
    const randomKey = generateRandomKey();
    setShareKey(randomKey);
    setAvailable(null);
  };

  const handleAcceptSuggestion = () => {
    if (state.suggestion) {
      // Extract the shareKey part from suggestion
      // Format: "my-party-2-20251226" or "my-party-3-20251226"
      // Remove the last part (date suffix): "-20251226"
      const suggestionWithoutDate = state.suggestion.replace(
        `-${dateSuffix}`,
        ""
      );
      setShareKey(suggestionWithoutDate);
      setAvailable(null);
    }
  };

  useEffect(() => {
    if (!debouncedShareKey || debouncedShareKey.length < 3) {
      return;
    }

    const check = async () => {
      setChecking(true);
      try {
        const result = await checkSlugAvailability(debouncedShareKey);
        setAvailable(result.available);
      } finally {
        setChecking(false);
      }
    };

    check();
  }, [debouncedShareKey]);

  useEffect(() => {
    if (state.success && state.spaceId) {
      router.push(`/dashboard/spaces/${state.spaceId}`);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <label className="mb-2 block font-medium text-sm" htmlFor="share_key">
          共有キー
        </label>

        <div className="mb-2 flex items-center">
          <div className="relative flex-1">
            <input
              className="flex h-10 w-full rounded-lg rounded-r-none border border-gray-300 border-r-0 bg-background px-3 py-2 pr-10 font-mono text-sm ring-offset-background focus:z-10 focus:border-transparent focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isPending}
              id="share_key"
              maxLength={30}
              minLength={3}
              name="share_key"
              onChange={handleShareKeyChange}
              pattern="[a-z0-9-]+"
              placeholder="my-party"
              required
              type="text"
              value={shareKey}
            />
            <button
              aria-label={t("generateRandomButtonAriaLabel")}
              className="absolute top-1 right-1 z-10 flex h-8 w-8 items-center justify-center rounded-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
              disabled={isPending}
              onClick={handleGenerateRandomKey}
              title={t("generateRandomButton")}
              type="button"
            >
              <Dices className="h-4 w-4" />
            </button>
          </div>
          <span className="flex h-10 select-none items-center rounded-lg rounded-l-none border border-gray-300 border-l-0 bg-gray-50 px-3 font-mono text-gray-500 text-sm">
            -{dateSuffix}
          </span>
        </div>

        <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-amber-800 text-sm">
            ⚠️ この共有キーを知っているユーザーは誰でも参加できます
          </p>
        </div>

        <p className="mb-2 text-gray-500 text-sm">
          公開URL:{" "}
          <span className="font-mono">
            @{shareKey || "..."}-{dateSuffix}
          </span>
        </p>

        {/* Status indicator */}
        {shareKey.length >= 3 && (
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

      <div>
        <h3 className="mb-4 font-medium text-lg">
          {t("capacitySectionTitle")}
        </h3>
        <div>
          <label
            className="mb-2 block font-medium text-sm"
            htmlFor="max_participants"
          >
            {t("maxParticipantsLabel")}
          </label>
          <input
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-primary"
            disabled={isPending}
            id="max_participants"
            max={1000}
            min={1}
            name="max_participants"
            onChange={(e) => setMaxParticipants(Number(e.target.value))}
            required
            type="number"
            value={maxParticipants}
          />
          <p className="mt-2 text-gray-500 text-sm">
            {t("maxParticipantsHelp")}
          </p>
        </div>
      </div>

      <div>
        <h3 className="mb-4 font-medium text-lg">
          {t("permissionsSectionTitle")}
        </h3>

        <div className="space-y-4">
          <div>
            <label
              className="mb-2 block font-medium text-sm"
              htmlFor="youtube_requirement"
            >
              {t("youtubeRequirementLabel")}
            </label>
            <select
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-primary"
              disabled={isPending}
              id="youtube_requirement"
              name="youtube_requirement"
              onChange={(e) => setYoutubeRequirement(e.target.value)}
              value={youtubeRequirement}
            >
              <option value="none">{t("youtubeRequirementNone")}</option>
              <option value="subscriber">
                {t("youtubeRequirementSubscriber")}
              </option>
              <option value="member">{t("youtubeRequirementMember")}</option>
            </select>
          </div>

          {youtubeRequirement !== "none" && (
            <div>
              <label
                className="mb-2 block font-medium text-sm"
                htmlFor="youtube_channel_id"
              >
                {t("youtubeChannelIdLabel")}
              </label>
              <input
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-primary"
                disabled={isPending}
                id="youtube_channel_id"
                name="youtube_channel_id"
                onChange={(e) => setYoutubeChannelId(e.target.value)}
                placeholder="UCxxxxxxxxxxxxxxxxxxxxxx"
                required={youtubeRequirement !== "none"}
                type="text"
                value={youtubeChannelId}
              />
              <p className="mt-2 text-gray-500 text-sm">
                {t("youtubeChannelIdHelp")}
              </p>
            </div>
          )}

          <div>
            <label
              className="mb-2 block font-medium text-sm"
              htmlFor="twitch_requirement"
            >
              {t("twitchRequirementLabel")}
            </label>
            <select
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-primary"
              disabled={isPending}
              id="twitch_requirement"
              name="twitch_requirement"
              onChange={(e) => setTwitchRequirement(e.target.value)}
              value={twitchRequirement}
            >
              <option value="none">{t("twitchRequirementNone")}</option>
              <option value="follower">{t("twitchRequirementFollower")}</option>
              <option value="subscriber">
                {t("twitchRequirementSubscriber")}
              </option>
            </select>
          </div>

          {twitchRequirement !== "none" && (
            <div>
              <label
                className="mb-2 block font-medium text-sm"
                htmlFor="twitch_broadcaster_id"
              >
                {t("twitchBroadcasterIdLabel")}
              </label>
              <input
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-primary"
                disabled={isPending}
                id="twitch_broadcaster_id"
                name="twitch_broadcaster_id"
                onChange={(e) => setTwitchBroadcasterId(e.target.value)}
                placeholder="123456789"
                required={twitchRequirement !== "none"}
                type="text"
                value={twitchBroadcasterId}
              />
              <p className="mt-2 text-gray-500 text-sm">
                {t("twitchBroadcasterIdHelp")}
              </p>
            </div>
          )}
        </div>
      </div>

      <div>
        <label
          className="mb-2 block font-medium text-sm"
          htmlFor="email_allowlist"
        >
          {t("emailAllowlistLabel")}
        </label>
        <textarea
          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-primary"
          disabled={isPending}
          id="email_allowlist"
          name="email_allowlist"
          onChange={(e) => setEmailAllowlist(e.target.value)}
          placeholder="@example.com, user@test.org"
          rows={3}
          value={emailAllowlist}
        />
        <p className="mt-2 text-gray-500 text-sm">{t("emailAllowlistHelp")}</p>
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
        disabled={isPending || available === false || shareKey.length < 3}
        type="submit"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {isPending ? "作成中..." : "スペースを作成"}
      </button>
    </form>
  );
}
