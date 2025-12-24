'use client'

import { useState, useEffect, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useDebounce } from 'use-debounce'
import { createSpace, checkSlugAvailability } from './actions'
import { format } from 'date-fns'
import { Loader2, Check, AlertCircle } from 'lucide-react'
import type { CreateSpaceState } from './actions'

export function CreateSpaceForm() {
  const router = useRouter()
  const [slug, setSlug] = useState('')
  const [debouncedSlug] = useDebounce(slug, 500)
  const [checking, setChecking] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)

  const dateSuffix = format(new Date(), 'yyyyMMdd')

  const [state, formAction, isPending] = useActionState<CreateSpaceState, FormData>(createSpace, {
    success: false,
  })

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSlug = e.target.value.toLowerCase()
    setSlug(newSlug)

    // Reset validation state when slug changes and is too short
    if (!newSlug || newSlug.length < 3) {
      setAvailable(null)
    }
  }

  useEffect(() => {
    if (!debouncedSlug || debouncedSlug.length < 3) {
      return
    }

    const check = async () => {
      setChecking(true)
      try {
        const result = await checkSlugAvailability(debouncedSlug)
        setAvailable(result.available)
      } finally {
        setChecking(false)
      }
    }

    check()
  }, [debouncedSlug])

  useEffect(() => {
    if (state.success && state.spaceId) {
      router.push(`/dashboard/spaces/${state.spaceId}`)
    }
  }, [state, router])

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">新しいスペースを作成</h1>

      <form action={formAction} className="space-y-6">
        <div>
          <label htmlFor="slug" className="block text-sm font-medium mb-2">
            スペースURL
          </label>

          <div className="flex items-center gap-2 mb-2">
            <input
              type="text"
              id="slug"
              name="slug"
              value={slug}
              onChange={handleSlugChange}
              placeholder="my-party"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
              minLength={3}
              maxLength={30}
              pattern="[a-z0-9-]+"
              disabled={isPending}
            />
            <span className="text-gray-500 font-mono">-{dateSuffix}</span>
          </div>

          <p className="text-sm text-gray-500 mb-2">
            公開URL:{' '}
            <span className="font-mono">
              @{slug || '...'}-{dateSuffix}
            </span>
          </p>

          {/* Status indicator */}
          {slug.length >= 3 && (
            <div className="flex items-center gap-2 mt-2">
              {checking && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  <span className="text-sm text-gray-500">確認中...</span>
                </>
              )}

              {!checking && available === true && (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600">このスラグは使用可能です</span>
                </>
              )}

              {!checking && available === false && (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span className="text-sm text-amber-600">このスラグは既に使用されています</span>
                </>
              )}
            </div>
          )}
        </div>

        {state.error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {state.error}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || available === false || slug.length < 3}
          className="w-full px-6 py-3 bg-primary text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {isPending ? '作成中...' : 'スペースを作成'}
        </button>
      </form>
    </div>
  )
}
