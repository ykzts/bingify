import { z } from 'zod'

export const spaceSchema = z.object({
  slug: z
    .string()
    .min(3, '3文字以上入力してください')
    .max(30, '30文字以内で入力してください')
    .regex(/^[a-z0-9-]+$/, '小文字の英数字とハイフンのみ使用できます'),
})

export type SpaceFormData = z.infer<typeof spaceSchema>
