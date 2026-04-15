/**
 * 이미지-카드 코드 재매핑 스크립트
 * 실행: pnpm dlx tsx _scripts/remap-images.ts
 *
 * 문제: 기존 migrate.ts가 mock-cards 배열 순서로 이미지를 매핑했으나
 *       실제 스프레드시트는 카드 코드 오름차순(KR002→KR010→KR014...)으로 정렬.
 * 해결: mockCards를 코드순 정렬 → 이미지 파일(행 번호순)과 1:1 재매핑
 *       → Supabase Storage 재업로드 + DB image_url 업데이트
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { mockCards } from '../lib/mock-cards'

// ─── 환경변수 ──────────────────────────────────────────────────────────────

function loadEnv(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) throw new Error(`파일 없음: ${filePath}`)
  return Object.fromEntries(
    readFileSync(filePath, 'utf-8')
      .split('\n')
      .filter(l => l.includes('=') && !l.startsWith('#') && l.trim())
      .map(l => {
        const [key, ...rest] = l.split('=')
        return [key.trim(), rest.join('=').trim()]
      })
  )
}

const env = loadEnv(join(process.cwd(), '.env.local'))
const supabase = createClient(
  env['NEXT_PUBLIC_SUPABASE_URL'],
  env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
)

const BUCKET    = 'card-images'
const IMAGE_DIR = join(process.cwd(), 'card_images')
const DELAY_MS  = 350

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// ─── 이미지 파일 행 번호 오름차순 정렬 ────────────────────────────────────

function getSortedImageFiles(): string[] {
  return readdirSync(IMAGE_DIR)
    .filter(f => /^sheet1_A\d+_image\d+\.png$/.test(f))
    .sort((a, b) => {
      const row = (name: string) => parseInt(name.match(/sheet1_A(\d+)_/)?.[1] ?? '0', 10)
      return row(a) - row(b)
    })
}

// ─── 카드 코드 오름차순 정렬 (스프레드시트와 동일한 순서) ─────────────────
// BLZD-KR002 < KR010 < KR014 < KR015 < KR015B < KR016 ...
// 코드가 3자리 zero-pad이므로 단순 localeCompare로 정확히 정렬됨

function getSortedCards() {
  return [...mockCards].sort((a, b) => a.code.localeCompare(b.code))
}

// ─── 메인 ──────────────────────────────────────────────────────────────────

async function remap() {
  console.log('╔══════════════════════════════════════╗')
  console.log('║   이미지-카드 코드 재매핑 스크립트   ║')
  console.log('╚══════════════════════════════════════╝\n')

  const imageFiles  = getSortedImageFiles()
  const sortedCards = getSortedCards()

  console.log('코드순 정렬 결과:')
  sortedCards.forEach((c, i) => {
    const file = imageFiles[i] ?? '(없음)'
    console.log(`  A${i + 2}: ${c.code.padEnd(14)} ← ${file}`)
  })
  console.log()

  let success = 0, failed = 0

  for (let i = 0; i < sortedCards.length; i++) {
    const card    = sortedCards[i]
    const imgFile = imageFiles[i]
    const prefix  = `  [${String(i + 1).padStart(2)}/${sortedCards.length}] ${card.code}`

    if (!imgFile) {
      console.warn(`${prefix} ⚠  이미지 파일 없음, 건너뜀`)
      failed++
      continue
    }

    const localPath = join(IMAGE_DIR, imgFile)
    const destPath  = `cards/${card.code}.png`

    try {
      // Storage 재업로드 (upsert: true → 기존 잘못된 파일 덮어쓰기)
      const buffer = readFileSync(localPath)
      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(destPath, buffer, { contentType: 'image/png', upsert: true })

      if (uploadErr) throw new Error(uploadErr.message)

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(destPath)
      const publicUrl = data.publicUrl

      // DB image_url 업데이트
      const { error: dbErr } = await supabase
        .from('cards')
        .update({ image_url: publicUrl })
        .eq('code', card.code)

      if (dbErr) throw new Error(`DB 오류: ${dbErr.message}`)

      console.log(`${prefix} ✓  ${imgFile}`)
      success++
    } catch (e) {
      console.error(`${prefix} ✗  ${(e as Error).message}`)
      failed++
    }

    if (i < sortedCards.length - 1) await sleep(DELAY_MS)
  }

  console.log('\n╔══════════════════════════════════════╗')
  console.log(`║  완료  성공 ${String(success).padStart(2)}개 / 실패 ${String(failed).padStart(2)}개         ║`)
  console.log('╚══════════════════════════════════════╝')
  if (failed > 0) process.exit(1)
}

remap().catch(e => {
  console.error('❌ 오류:', e)
  process.exit(1)
})
