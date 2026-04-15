import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[supabase] 환경변수가 설정되지 않았습니다.\n' +
    '프로젝트 루트의 .env.local 파일에 다음 항목을 추가하십시오:\n' +
    '  NEXT_PUBLIC_SUPABASE_URL=...\n' +
    '  NEXT_PUBLIC_SUPABASE_ANON_KEY=...'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
