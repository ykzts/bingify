'use client'

import { format } from 'date-fns'
import { AlertCircle, Check, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useState } from 'react'
import { useDebounce } from 'use-debounce'
import type { CreateSpaceState } from './actions'
import { checkSlugAvailability, createSpace } from './actions'

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
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-8 font-bold text-3xl">新しいスペースを作成</h1>

      <form action={formAction} className="space-y-6">
        <div>
          <label htmlFor="slug" className="mb-2 block font-medium text-sm">
            スペースURL
          </label>

          <div className="mb-2 flex items-center gap-2">
            <input
              type="text"
              id="slug"
              name="slug"
              value={slug}
              onChange={handleSlugChange}
              placeholder="my-party"
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-primary"
              required
              minLength={3}
              maxLength={30}
              pattern="[a-z0-9-]+"
              disabled={isPending}
            />
            <span className="font-mono text-gray-500">-{dateSuffix}</span>
          </div>

          <p className="mb-2 text-gray-500 text-sm">
            公開URL:{' '}
            <span className="font-mono">
              @{slug || '...'}-{dateSuffix}
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
                  <span className="text-green-600 text-sm">このスラグは使用可能です</span>
                </>
              )}

              {!checking && available === false && (
                <>
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="text-amber-600 text-sm">このスラグは既に使用されています</span>
                </>
              )}
            </div>
          )}
        </div>

        {state.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            {state.error}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || available === false || slug.length < 3}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isPending ? '作成中...' : 'スペースを作成'}
        </button>
      </form>
    </div>
  )
}
