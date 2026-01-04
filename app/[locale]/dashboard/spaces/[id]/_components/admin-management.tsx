"use client";

import {
  initialFormState,
  mergeForm,
  useForm,
  useStore,
  useTransform,
} from "@tanstack/react-form-nextjs";
import { Loader2, Trash2, UserPlus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { FieldErrors } from "@/components/field-errors";
import { FormErrors } from "@/components/form-errors";
import { useConfirm } from "@/components/providers/confirm-provider";
import { SectionHeader } from "@/components/section-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/field";
import { Input } from "@/components/ui/input";
import type { SpaceAdmin } from "@/lib/types/space";
import {
  inviteAdminFormOpts,
  inviteAdminFormSchema,
} from "../_lib/form-options";
import { inviteAdminAction } from "../_lib/invite-admin-actions";
import {
  type GetSpaceAdminsResult,
  getSpaceAdmins,
  removeAdmin,
} from "../_lib/settings-actions";

interface Props {
  spaceId: string;
}

export function AdminManagement({ spaceId }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const [admins, setAdmins] = useState<SpaceAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  // Use TanStack Form with Next.js server actions
  const [state, action] = useActionState(
    inviteAdminAction.bind(null, spaceId),
    initialFormState
  );

  const form = useForm({
    ...inviteAdminFormOpts,
    validators: {
      onChange: inviteAdminFormSchema,
    },
    // biome-ignore lint/style/noNonNullAssertion: TanStack Form pattern requires non-null assertion for mergeForm
    transform: useTransform((baseForm) => mergeForm(baseForm, state!), [state]),
  });

  const formErrors = useStore(form.store, (formState) => formState.errors);
  const isSubmitting = useStore(
    form.store,
    (formState) => formState.isSubmitting
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: spaceId is stable and doesn't need to be in deps
  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    setLoading(true);
    const result: GetSpaceAdminsResult = await getSpaceAdmins(spaceId);
    if (result.error) {
      setError(result.error);
    } else {
      setAdmins(result.admins);
      setError(null);
    }
    setLoading(false);
  };

  // Reload admins when invite succeeds
  // biome-ignore lint/correctness/useExhaustiveDependencies: Only trigger on state.meta.success change
  useEffect(() => {
    const meta = (state as Record<string, unknown>)?.meta as
      | { success?: boolean }
      | undefined;
    if (meta?.success) {
      toast.success("管理者を追加しました");
      loadAdmins();
      router.refresh();
    }
  }, [(state as Record<string, unknown>)?.meta]);

  const handleRemoveAdmin = async (adminUserId: string) => {
    if (
      !(await confirm({
        description: "この管理者を削除してもよろしいですか?",
        title: "管理者削除",
        variant: "destructive",
      }))
    ) {
      return;
    }

    setRemovingUserId(adminUserId);
    setRemoveError(null);
    const result = await removeAdmin(spaceId, adminUserId);
    setRemovingUserId(null);

    if (result.success) {
      loadAdmins();
      router.refresh();
    } else if (result.error) {
      setRemoveError(result.error);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        description="スペースを共同で管理できるユーザーを招待します。管理者はスペースの設定を編集できますが、スペースの削除や他の管理者の追加・削除はできません。"
        icon={Users}
      >
        管理者設定
      </SectionHeader>

      {/* Invite Admin Form */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h3 className="mb-3 font-semibold text-sm">管理者を招待</h3>
        <FormErrors
          className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3"
          errors={formErrors}
        />
        <form action={action} className="space-y-3">
          <form.Field name="email">
            {(field) => (
              <Field>
                <FieldLabel>メールアドレス</FieldLabel>
                <Input
                  disabled={isSubmitting}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="user@example.com"
                  required
                  type="email"
                  value={field.state.value as string}
                />
                <FieldErrors
                  className="mt-2"
                  errors={field.state.meta.errors}
                />
              </Field>
            )}
          </form.Field>
          <Button
            className="w-full"
            disabled={isSubmitting}
            size="sm"
            type="submit"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                招待中...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                招待
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Admin List */}
      <div>
        <h3 className="mb-3 font-semibold text-sm">現在の管理者</h3>
        {removeError && <FieldErrors className="mb-3" errors={[removeError]} />}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        )}
        {!loading && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}
        {!(loading || error) && admins.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
            <p className="text-gray-500 text-sm">
              まだ管理者は招待されていません
            </p>
          </div>
        )}
        {!(loading || error) && admins.length > 0 && (
          <div className="space-y-2">
            {admins.map((admin) => (
              <div
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4"
                key={admin.user_id}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    {admin.avatar_url && (
                      <AvatarImage
                        alt={admin.full_name || "Admin"}
                        src={admin.avatar_url}
                      />
                    )}
                    <AvatarFallback>
                      {admin.full_name?.charAt(0).toUpperCase() ||
                        admin.email?.charAt(0).toUpperCase() ||
                        "A"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">
                      {admin.full_name || "名前未設定"}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {admin.email || "メールアドレス不明"}
                    </p>
                  </div>
                </div>
                <Button
                  disabled={removingUserId === admin.user_id}
                  onClick={() => handleRemoveAdmin(admin.user_id)}
                  size="sm"
                  variant="outline"
                >
                  {removingUserId === admin.user_id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      削除
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
