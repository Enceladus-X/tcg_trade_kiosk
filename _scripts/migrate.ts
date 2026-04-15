/**
 * Supabase 일괄 마이그레이션 스크립트
 * 실행: npx tsx _scripts/migrate.ts
 *
 * 전제 조건:
 *  1. Supabase 대시보드에서 SQL 스키마(_scripts/supabase_schema.sql) 실행 완료
 *  2. card-images 버킷 생성 + Storage 정책 설정 완료
 *  3. .env.local에 Supabase URL/Key 입력 완료
 *  4. card_images/ 폴더가 프로젝트 루트에 존재
 *
 * 주의: 빈 테이블에 한 번만 실행할 것.
 *       중복 실행 시 cards/tabs가 이중 삽입됨.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { mockCards } from '../lib/mock-cards'

// ─── .env.local 파싱 ───────────────────────────────────────────────────────

function loadEnv(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) {
    throw new Error(`파일 없음: ${filePath}`)
  }
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

const env  = loadEnv(join(process.cwd(), '.env.local'))
const URL  = env['NEXT_PUBLIC_SUPABASE_URL']
const KEY  = env['NEXT_PUBLIC_SUPABASE_ANON_KEY']

if (!URL || !KEY) {
  console.error('❌  .env.local에서 Supabase 자격증명을 찾을 수 없습니다.')
  process.exit(1)
}

const supabase  = createClient(URL, KEY)
const BUCKET    = 'card-images'
const IMAGE_DIR = join(process.cwd(), 'card_images')
const DELAY_MS  = 350   // Supabase Storage Rate Limit 방지 (초당 ~3건)
const PARALLEL  = 1     // 순차 처리 (병렬 증가 시 Rate Limit 위험)

// ─── 유틸 ──────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// sheet1_AX_imageY.png 파일들을 행 번호 X 기준으로 오름차순 정렬
// → mockCards 배열 순서(A2=0번, A3=1번, ..., A25=23번)와 1:1 대응
function getSortedImageFiles(): string[] {
  if (!existsSync(IMAGE_DIR)) {
    throw new Error(`이미지 폴더 없음: ${IMAGE_DIR}`)
  }
  return readdirSync(IMAGE_DIR)
    .filter(f => /^sheet1_A\d+_image\d+\.png$/.test(f))
    .sort((a, b) => {
      const rowOf = (name: string) => parseInt(name.match(/sheet1_A(\d+)_/)?.[1] ?? '0', 10)
      return rowOf(a) - rowOf(b)
    })
}

async function uploadImage(localPath: string, destPath: string): Promise<string> {
  if (!existsSync(localPath)) {
    throw new Error(`로컬 파일 없음: ${localPath}`)
  }
  const buffer = readFileSync(localPath)

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(destPath, buffer, { contentType: 'image/png', upsert: true })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(destPath)
  return data.publicUrl
}

// ─── 메인 ──────────────────────────────────────────────────────────────────

async function migrate() {
  console.log('╔══════════════════════════════════════╗')
  console.log('║   Supabase 마이그레이션 스크립트     ║')
  console.log('╚══════════════════════════════════════╝\n')

  const imageFiles = getSortedImageFiles()
  console.log(`📁 이미지 파일 감지: ${imageFiles.length}개`)
  console.log(`🃏 카드 데이터:      ${mockCards.length}개\n`)

  if (imageFiles.length !== mockCards.length) {
    console.warn(`⚠️  이미지(${imageFiles.length})와 카드(${mockCards.length}) 수가 다릅니다.`)
    console.warn('   부족한 카드는 placeholder로 대체됩니다.\n')
  }

  // ── Step 1: 탭 삽입 ────────────────────────────────────────────────────

  const categories = [...new Set(mockCards.map(c => c.category))]
  console.log(`[1/2] 탭 삽입 (${categories.length}개)`)

  for (let i = 0; i < categories.length; i++) {
    const { error } = await supabase
      .from('tabs')
      .insert({ name: categories[i], sort_order: i })

    if (error) {
      console.error(`  ✗ "${categories[i]}": ${error.message}`)
    } else {
      console.log(`  ✓ "${categories[i]}"`)
    }
  }

  // ── Step 2: 이미지 업로드 + 카드 DB 삽입 ───────────────────────────────

  console.log(`\n[2/2] 카드 마이그레이션 (${mockCards.length}개, 딜레이: ${DELAY_MS}ms)`)

  let successCount = 0
  let failCount    = 0

  for (let i = 0; i < mockCards.length; i++) {
    const card      = mockCards[i]
    const imgFile   = imageFiles[i]          // 행 순서 기준 1:1 매핑
    const prefix    = `  [${String(i + 1).padStart(2)}/${mockCards.length}] ${card.code}`

    let imageUrl = '/placeholder-card.svg'

    // 이미지 업로드
    if (!imgFile) {
      console.warn(`${prefix} ⚠  매핑 이미지 없음 → placeholder`)
    } else {
      const localPath = join(IMAGE_DIR, imgFile)
      const destPath  = `cards/${card.code}.png`
      try {
        imageUrl = await uploadImage(localPath, destPath)
        console.log(`${prefix} ✓  ${imgFile}`)
      } catch (e) {
        console.error(`${prefix} ✗  이미지 업로드 실패: ${(e as Error).message}`)
        // 이미지 실패해도 카드 DB 삽입은 계속 진행 (placeholder URL 사용)
      }
    }

    // DB 삽입
    const { error: dbErr } = await supabase.from('cards').insert({
      name:             card.name,
      code:             card.code,
      category:         card.category,
      image_url:        imageUrl,
      is_stopped:       card.isStopped,
      prices:           card.prices,
      enabled_rarities: card.enabledRarities,
    })

    if (dbErr) {
      console.error(`${prefix}    DB 삽입 실패: ${dbErr.message}`)
      failCount++
    } else {
      successCount++
    }

    // Rate Limit 방지 딜레이 (마지막 항목은 불필요)
    if (i < mockCards.length - 1) await sleep(DELAY_MS)
  }

  // ── 결과 요약 ───────────────────────────────────────────────────────────

  console.log('\n╔══════════════════════════════════════╗')
  console.log(`║  완료  성공 ${String(successCount).padStart(2)}개 / 실패 ${String(failCount).padStart(2)}개         ║`)
  console.log('╚══════════════════════════════════════╝')

  if (failCount > 0) {
    console.log('\n실패한 항목은 Supabase 대시보드에서 수동으로 확인하세요.')
    process.exit(1)
  }
}

migrate().catch(e => {
  console.error('\n❌ 예상치 못한 오류:', e)
  process.exit(1)
})
