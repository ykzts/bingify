/**
 * TanStack Form の revalidateLogic を再エクスポート
 *
 * TanStack Form は Zod v4+ の Standard Schema 実装をネイティブサポートしているため、
 * Zod スキーマを直接 validators に渡すことができます。
 *
 * 例:
 * ```tsx
 * const form = useForm({
 *   validationLogic: revalidateLogic({
 *     mode: 'submit',
 *     modeAfterSubmission: 'change'
 *   }),
 *   validators: {
 *     onDynamic: zodSchema, // Zod スキーマを直接渡す
 *   },
 * });
 * ```
 */
// biome-ignore lint/performance/noBarrelFile: revalidateLogic は遅延検証パターンで使用されるため、一箇所から提供する
export { revalidateLogic } from "@tanstack/react-form";
