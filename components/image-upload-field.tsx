'use client'

import { useRef } from 'react'
import { ImagePlus, Loader2, AlertCircle } from 'lucide-react'
import { useImageUpload } from '@/lib/use-image-upload'

interface ImageUploadFieldProps {
  currentUrl: string
  onUpload: (url: string) => void
  // 카드 편집 모드처럼 이미 이미지가 있을 때 미리보기 표시 여부
  showPreview?: boolean
}

export function ImageUploadField({ currentUrl, onUpload, showPreview = true }: ImageUploadFieldProps) {
  const { upload, isUploading, uploadError } = useImageUpload()
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // 클라이언트 사이드 유효성 검사
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.')
      return
    }
    // 10MB 제한
    if (file.size > 10 * 1024 * 1024) {
      alert('10MB 이하 파일만 업로드 가능합니다.')
      return
    }

    try {
      const { publicUrl } = await upload(file)
      onUpload(publicUrl)
    } catch {
      // uploadError state가 이미 세팅되므로 별도 처리 불필요
    } finally {
      // 같은 파일 재선택 가능하도록 input 초기화
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-400">카드 이미지</label>

      {/* 미리보기 */}
      {showPreview && currentUrl && (
        <div className="relative mx-auto aspect-[3/4] w-24 overflow-hidden rounded-lg bg-zinc-800">
          <img
            src={currentUrl}
            alt="미리보기"
            className="h-full w-full object-contain"
            onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-card.svg' }}
          />
        </div>
      )}

      {/* 업로드 버튼 */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-600 bg-zinc-800/50 py-3 text-sm text-zinc-400 transition-colors hover:border-amber-500 hover:text-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            업로드 중...
          </>
        ) : (
          <>
            <ImagePlus className="h-4 w-4" />
            {currentUrl ? '이미지 교체' : '이미지 선택'}
          </>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* 업로드 오류 표시 */}
      {uploadError && (
        <div className="flex items-center gap-1.5 rounded-lg bg-red-900/40 px-3 py-2 text-xs text-red-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {uploadError}
        </div>
      )}

      {/* 업로드 완료 후 URL 표시 (읽기 전용) */}
      {currentUrl && (
        <p className="truncate text-[11px] text-zinc-600" title={currentUrl}>
          {currentUrl}
        </p>
      )}
    </div>
  )
}
