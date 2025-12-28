"use client";

import { format } from "date-fns";
import { AlertCircle, Check, Dices, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import { useDebounce } from "use-debounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { generateRandomKey } from "@/lib/utils/random-key";
import type { CreateSpaceState } from "./actions";
import { checkSlugAvailability, createSpace } from "./actions";

export function CreateSpaceForm() {
  const router = useRouter();
  const t = useTranslations("CreateSpace");
  const tErrors = useTranslations("Errors");
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
        <Label className="mb-2" htmlFor="share_key">
          共有キー
        </Label>

        <div className="mb-2 flex items-center">
          <div className="relative flex-1">
            <Input
              className="rounded-r-none border-r-0 pr-10 font-mono"
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
              className="absolute top-1 right-1 z-10 flex h-7 w-7 items-center justify-center rounded-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
              disabled={isPending}
              onClick={handleGenerateRandomKey}
              title={t("generateRandomButton")}
              type="button"
            >
              <Dices className="h-4 w-4" />
            </button>
          </div>
          <span className="flex h-9 select-none items-center rounded-lg rounded-l-none border border-gray-300 border-l-0 bg-gray-50 px-3 font-mono text-gray-500 text-sm">
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
          <Label className="mb-2" htmlFor="max_participants">
            {t("maxParticipantsLabel")}
          </Label>
          <Input
            disabled={isPending}
            id="max_participants"
            max={1000}
            min={1}
            name="max_participants"
            onChange={(e) => {
              const value = e.target.valueAsNumber;
              setMaxParticipants(Number.isNaN(value) ? 50 : value);
            }}
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
            <Label className="mb-2" htmlFor="youtube_requirement">
              {t("youtubeRequirementLabel")}
            </Label>
            <Select
              disabled={isPending}
              name="youtube_requirement"
              onValueChange={(value) => {
                setYoutubeRequirement(value);
                if (value === "none") {
                  setYoutubeChannelId("");
                }
              }}
              value={youtubeRequirement}
            >
              <SelectTrigger id="youtube_requirement">
                <SelectValue placeholder={t("youtubeRequirementNone")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  {t("youtubeRequirementNone")}
                </SelectItem>
                <SelectItem value="subscriber">
                  {t("youtubeRequirementSubscriber")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {youtubeRequirement !== "none" && (
            <div>
              <Label className="mb-2" htmlFor="youtube_channel_id">
                {t("youtubeChannelIdLabel")}
              </Label>
              <Input
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
            <Label className="mb-2" htmlFor="twitch_requirement">
              {t("twitchRequirementLabel")}
            </Label>
            <Select
              disabled={isPending}
              name="twitch_requirement"
              onValueChange={(value) => {
                setTwitchRequirement(value);
                if (value === "none") {
                  setTwitchBroadcasterId("");
                }
              }}
              value={twitchRequirement}
            >
              <SelectTrigger id="twitch_requirement">
                <SelectValue placeholder={t("twitchRequirementNone")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  {t("twitchRequirementNone")}
                </SelectItem>
                <SelectItem value="follower">
                  {t("twitchRequirementFollower")}
                </SelectItem>
                <SelectItem value="subscriber">
                  {t("twitchRequirementSubscriber")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {twitchRequirement !== "none" && (
            <div>
              <Label className="mb-2" htmlFor="twitch_broadcaster_id">
                {t("twitchBroadcasterIdLabel")}
              </Label>
              <Input
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
        <Label className="mb-2" htmlFor="email_allowlist">
          {t("emailAllowlistLabel")}
        </Label>
        <Textarea
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
          <p className="text-red-800">
            {state.error === "maxSpacesReached" && state.errorData?.max
              ? tErrors("maxSpacesReached", { max: state.errorData.max })
              : state.error}
          </p>
          {state.suggestion && (
            <div className="mt-3">
              <p className="mb-2 text-red-700 text-sm">
                {t("suggestionPrefix")}
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
                  {t("useSuggestionButton")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <Button
        className="w-full"
        disabled={isPending || available === false || shareKey.length < 3}
        type="submit"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {isPending ? t("creatingButton") : t("createButton")}
      </Button>
    </form>
  );
}
