'use client'

import { useState, useCallback } from 'react'
import { supabase } from './supabase'

export type UploadResult = {
  publicUrl: string
  path: string
}

interface UseImageUploadOptions {
  bucket?: string
  prefix?: string
}

export function useImageUpload({ bucket = 'card-images', prefix = 'cards' }: UseImageUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const upload = useCallback(async (file: File): Promise<UploadResult> => {
    setIsUploading(true)
    setUploadError(null)

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        contentType: file.type,
        upsert: true,  // 같은 경로 덮어쓰기 허용 (재업로드 시)
      })

    if (error) {
      setIsUploading(false)
      setUploadError(error.message)
      throw new Error(error.message)
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path)

    setIsUploading(false)
    return { publicUrl: data.publicUrl, path }
  }, [])

  return { upload, isUploading, uploadError }
}
