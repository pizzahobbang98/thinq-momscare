import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { NextResponse } from 'next/server'

const MAX_FILE_SIZE = 10 * 1024 * 1024

type UltrasoundResult = {
  crl: string | null
  bpd: string | null
  fl: string | null
  estimated_size_cm: number
  estimated_weeks: number
  fruit_emoji: string
  fruit_name: string
  description: string
  size_basis: string
}

const ANALYSIS_PROMPT = `이 초음파 사진을 분석해서 아래 JSON만 반환하세요.
{
  crl: string (CRL 수치, 없으면 null),
  bpd: string (BPD 수치, 없으면 null),
  fl: string (FL 수치, 없으면 null),
  estimated_size_cm: number (추정 크기 cm),
  estimated_weeks: number (추정 임신 주차),
  fruit_emoji: string (크기 비슷한 과일/채소 이모지),
  fruit_name: string (과일/채소 이름 한국어),
  description: string (태아 상태 설명 2문장, 따뜻한 말투),
  size_basis: string (크기 측정 기준 설명,
    예: "CRL(머리부터 엉덩이까지) 기준",
    예: "BPD(머리 너비) 기준",
    예: "전체적인 태아 크기 기준",
    CRL/BPD/FL 중 어떤 수치를 기반으로 크기를 추정했는지 한국어로 설명)
}
초음파 수치가 보이면 그 값 기반으로,
안 보이면 전체적인 크기로 추정.

estimated_weeks 판단 기준:
초음파 사진에 표시된 주차나 날짜 정보가 있으면
그것을 기준으로 estimated_weeks를 정하고,
없으면 태아 크기로 추정하세요.

반드시 JSON만 반환.`

function parseUltrasoundResult(content: string): UltrasoundResult | null {
  try {
    const parsed = JSON.parse(content) as Partial<UltrasoundResult>
    const estimated_size_cm = Number(parsed.estimated_size_cm)
    const estimated_weeks = Number(parsed.estimated_weeks)

    if (
      !Number.isFinite(estimated_size_cm) ||
      !Number.isFinite(estimated_weeks) ||
      !parsed.fruit_emoji ||
      !parsed.fruit_name ||
      !parsed.description
    ) {
      return null
    }

    return {
      crl: parsed.crl ?? null,
      bpd: parsed.bpd ?? null,
      fl: parsed.fl ?? null,
      estimated_size_cm,
      estimated_weeks,
      fruit_emoji: parsed.fruit_emoji,
      fruit_name: parsed.fruit_name,
      description: parsed.description,
      size_basis: parsed.size_basis?.trim() || '전체적인 태아 크기 기준',
    }
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const demoWifeId = process.env.NEXT_PUBLIC_DEMO_WIFE_ID

    if (!apiKey || !supabaseUrl || !supabaseKey || !demoWifeId) {
      console.error('필수 환경 변수가 설정되지 않았습니다.')
      return NextResponse.json({ error: '분석 실패' }, { status: 500 })
    }

    const formData = await request.formData()
    const image = formData.get('image')
    const weeksRaw = formData.get('weeks')
    const parsedWeeks = weeksRaw ? Number(weeksRaw) : null
    const referenceWeeks =
      parsedWeeks !== null &&
      Number.isInteger(parsedWeeks) &&
      parsedWeeks >= 1 &&
      parsedWeeks <= 42
        ? parsedWeeks
        : null

    if (!(image instanceof File)) {
      return NextResponse.json({ error: '이미지가 없습니다.' }, { status: 400 })
    }

    if (!image.type.startsWith('image/')) {
      return NextResponse.json({ error: '이미지 파일만 업로드할 수 있습니다.' }, { status: 400 })
    }

    if (image.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: '파일 크기는 10MB 이하여야 합니다.' }, { status: 400 })
    }

    const buffer = Buffer.from(await image.arrayBuffer())
    const base64 = buffer.toString('base64')
    const mimeType = image.type || 'image/jpeg'

    const supabase = createClient(supabaseUrl, supabaseKey)
    const fileName = `${demoWifeId}/${Date.now()}.jpg`

    const { error: uploadError } = await supabase.storage
      .from('ultrasound-images')
      .upload(fileName, buffer, {
        contentType: mimeType,
        upsert: false,
      })

    if (uploadError) {
      console.error('초음파 이미지 업로드 실패:', uploadError)
      return NextResponse.json({ error: '이미지 저장 실패' }, { status: 500 })
    }

    const openai = new OpenAI({ apiKey })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
            {
              type: 'text',
              text: `${ANALYSIS_PROMPT}${
                referenceWeeks
                  ? `\n\n참고: 현재 임신 주차는 약 ${referenceWeeks}주차입니다. 사진에 주차 정보가 없을 때만 참고하세요.`
                  : ''
              }`,
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json({ error: '분석 실패' }, { status: 500 })
    }

    const result = parseUltrasoundResult(content)
    if (!result) {
      await supabase.storage.from('ultrasound-images').remove([fileName])
      return NextResponse.json({ error: '분석 실패' }, { status: 500 })
    }

    const estimatedWeeks = Math.max(
      1,
      Math.min(42, Math.round(result.estimated_weeks)),
    )

    const { error: insertError } = await supabase.from('ultrasound_records').insert({
      user_id: demoWifeId,
      image_path: fileName,
      weeks: estimatedWeeks,
      fruit_emoji: result.fruit_emoji,
      fruit_name: result.fruit_name,
      size_cm: result.estimated_size_cm,
      size_basis: result.size_basis,
      description: result.description,
    })

    if (insertError) {
      console.error('초음파 기록 저장 실패:', insertError)
      await supabase.storage.from('ultrasound-images').remove([fileName])
      return NextResponse.json({ error: '기록 저장 실패' }, { status: 500 })
    }

    return NextResponse.json({ result })
  } catch (error) {
    console.error('초음파 분석 API 처리 실패:', error)
    return NextResponse.json({ error: '분석 실패' }, { status: 500 })
  }
}
