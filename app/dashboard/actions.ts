'use server'

import { randomUUID } from 'node:crypto'
import { format } from 'date-fns'
import { spaceSchema } from '@/lib/schemas/space'
import { createClient } from '@/lib/supabase/server'

export interface CreateSpaceState {
  success: boolean
  error?: string
  spaceId?: string
  shareKey?: string
}

export async function checkSlugAvailability(slug: string) {
  try {
    const dateSuffix = format(new Date(), 'yyyyMMdd')
    const fullSlug = `${slug}-${dateSuffix}`

    const supabase = await createClient()
    const { data } = await supabase.from('spaces').select('id').eq('share_key', fullSlug).single()

    return { available: !data }
  } catch (error) {
    console.error('Slug check error:', error)
    return { available: false }
  }
}

export async function createSpace(
  _prevState: CreateSpaceState,
  formData: FormData
): Promise<CreateSpaceState> {
  try {
    const slug = formData.get('slug') as string

    // Validate input with Zod
    const validation = spaceSchema.safeParse({ slug })
    if (!validation.success) {
      return {
        error: validation.error.issues[0].message,
        success: false,
      }
    }

    // Generate full slug with date suffix
    const dateSuffix = format(new Date(), 'yyyyMMdd')
    const fullSlug = `${slug}-${dateSuffix}`

    // Check availability
    const supabase = await createClient()
    const { data: existing } = await supabase
      .from('spaces')
      .select('id')
      .eq('share_key', fullSlug)
      .single()

    if (existing) {
      return {
        error: 'このスラグは既に使用されています',
        success: false,
      }
    }

    // Create space in database
    const uuid = randomUUID()

    const { error } = await supabase
      .from('spaces')
      .insert({
        id: uuid,
        settings: {},
        share_key: fullSlug,
        status: 'active',
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return {
        error: 'スペースの作成に失敗しました',
        success: false,
      }
    }

    return {
      shareKey: fullSlug,
      spaceId: uuid,
      success: true,
    }
  } catch (error) {
    console.error('Error creating space:', error)
    return {
      error: '予期しないエラーが発生しました',
      success: false,
    }
  }
}
