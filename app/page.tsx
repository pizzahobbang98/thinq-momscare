'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Page() {
  useEffect(() => {
    supabase
      .from('users')
      .select('*')
      .then(({ data, error }) => {
        console.log('연결 확인:', data)
        if (error) console.error('에러:', error)
      })
  }, [])

  return <div>Supabase 연결 테스트 중...</div>
}