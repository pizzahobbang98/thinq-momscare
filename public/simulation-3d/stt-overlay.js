;(() => {
  const STATUS_TEXT = {
    idle: '마이크 대기 중 · "하이 엘지"라고 말해보세요.',
    recording: '듣고 있어요 · 편하게 말씀해주세요.',
    transcribing: '말씀을 확인하고 있어요.',
    interpreting: 'Mother Together가 상황을 이해하고 있어요.',
    running: '맞춤 케어를 실행하고 있어요.',
    completed: '케어 모드가 적용되었어요.',
    followup: '계속 듣고 있어요 · 바로 말씀해주세요.',
    error: '잠시 후 다시 말씀해주세요. 현재 화면은 시연 모드로 유지됩니다.',
  }

  const INITIAL_TRANSCRIPT = '아직 인식된 말이 없습니다.'
  const INITIAL_INTENT = '말씀을 들으면 상황을 이해해 맞춤 케어로 연결합니다.'
  const INITIAL_CARE_TEXT = 'Mother Together가 대기 중이에요. "하이 엘지"라고 말해보세요.'
  const BUBBLE_TYPING_MS_PER_CHAR = 32
  const READABLE_TEXT_HOLD_MS = 2000
  const WAKE_TEXT_HOLD_MS = 650
  const FOLLOW_UP_LISTENING_MS = 60000
  const COMMAND_RECORDING_MAX_MS = 14000
  const COMMAND_MIN_SPEECH_WINDOW_MS = 2200
  const COMMAND_QUIET_STOP_MS = 1800
  const CARE_TONE = {
    final: 'final',
    heard: 'heard',
    intent: 'intent',
  }

  const WAKE_WORDS = [
    '하이엘지',
    '하이엘쥐',
    '하이엘지야',
    '하이앨지',
    '하이lg야',
    '헤이엘지',
    '헤이엘쥐',
    '헤이lg야',
    '엘지야',
    '엘쥐야',
    '엘지',
    '엘쥐',
    '하이lg',
    '헤이lg',
    'hilg',
    'heylg',
    'hielji',
    'heyelji',
  ]

  const CARE_TEXT = {
    condition_balance: '네, 컨디션 밸런스 모드를 실행했어요. 맑은 공기와 부드러운 빛으로 아침 컨디션을 맞춰드릴게요.',
    sleep_rhythm: '네, 수면 리듬 모드를 실행했어요. 편안히 잠들 수 있게 공기와 분위기를 차분하게 맞출게요.',
    mind_refresh: '네, 마음 환기 모드를 실행했어요. 산뜻한 숲 분위기로 기분 전환을 도와드릴게요.',
    rest_prepare: '네, 휴식 준비 모드를 실행했어요. 편하게 쉴 수 있도록 조명과 공기를 안정적으로 맞출게요.',
    couple_dinner: '네, 둘의 저녁 모드를 실행했어요. 은은한 분위기로 함께 쉬기 좋은 저녁을 준비할게요.',
    nausea_food: '네, 입덧 케어를 실행했어요. 냄새 부담을 줄여드릴게요.',
    sleep_care: '네, 수면 케어를 실행했어요. 편안한 휴식을 도와드릴게요.',
    housework_care: '네, 가사 케어를 실행했어요. 움직임 부담을 줄여드릴게요.',
    destination_ocean: '네, 바다 휴양지 모드를 실행했어요. 시원한 분위기로 바꿔드릴게요.',
    destination_forest: '네, 숲 휴양지 모드를 실행했어요. 조용한 분위기로 바꿔드릴게요.',
    destination_city: '네, 도시 휴양지 모드를 실행했어요. 은은한 야경 분위기로 바꿔드릴게요.',
    air_on: '네, 공기청정기를 켰어요.',
    air_off: '네, 공기청정기를 껐어요.',
    reset: '네, 기본 대기 상태로 돌아갈게요.',
  }

  const INTENT_TEXT = {
    condition_balance: '임신 준비 상태의 아침 컨디션 밸런스 필요',
    sleep_rhythm: '임신 준비 상태의 수면 리듬 정리 필요',
    mind_refresh: '임신 준비 상태의 마음 환기와 기분 전환 필요',
    rest_prepare: '임신 준비 상태의 편안한 휴식 환경 필요',
    couple_dinner: '둘이 함께하는 저녁 준비 요청',
    nausea_food: '냄새 민감으로 인한 입덧 불편',
    sleep_care: '수면과 휴식이 필요한 상태',
    housework_care: '움직임 부담을 줄이는 가사 케어 필요',
    destination_ocean: '바다 분위기로 기분 전환을 원하는 상태',
    destination_forest: '숲처럼 조용한 휴식 환경이 필요한 상태',
    destination_city: '도시 야경과 은은한 분위기로 쉬고 싶은 상태',
    air_on: '공기청정기 전원 켜기 요청',
    air_off: '공기청정기 전원 끄기 요청',
    reset: '기본 대기 모드로 복귀 요청',
    greeting: '일상 인사에 대한 응답',
    current_time: '현재 시간 확인 요청',
    english_how_are_you: '영어 인사에 대한 간단한 응답',
    unsupported_language: '지원하지 않는 언어 입력',
  }

  const THINQ_COMMAND = {
    nausea_food: 'MODE_TURBO',
    sleep_care: 'MODE_SLEEP',
    housework_care: 'MODE_AUTO',
    destination_ocean: 'MODE_AUTO',
    destination_forest: 'MODE_AUTO',
    destination_city: 'MODE_AUTO',
    air_on: 'POWER_ON',
    air_off: 'POWER_OFF',
  }

  const ttsAudioCache = new Map()
  const ttsAudioRequests = new Map()

  const state = {
    transcript: INITIAL_TRANSCRIPT,
    interpretedIntent: INITIAL_INTENT,
    executedCareText: INITIAL_CARE_TEXT,
    sttStatus: 'idle',
    routineId: null,
    mediaStream: null,
    mediaRecorder: null,
    chunks: [],
    wakeRecognition: null,
    commandTimer: null,
    silenceTimer: null,
    wakeRestartTimer: null,
    commandRecognition: null,
    followupRecognition: null,
    followupTimer: null,
    followupUntil: 0,
    demoContext: null,
    commandHandled: false,
    isRecording: false,
  }

  const el = {}

  function init() {
    renderOverlay()
    updateOverlay()
    dispatchCareText(INITIAL_CARE_TEXT, CARE_TONE.final)
    window.setTimeout(() => dispatchCareText(INITIAL_CARE_TEXT, CARE_TONE.final), 400)
    window.setTimeout(() => dispatchCareText(INITIAL_CARE_TEXT, CARE_TONE.final), 1200)
    preloadCommonTts()
    void refreshDemoContext()
    window.setInterval(() => {
      void refreshDemoContext()
    }, 2500)
    startWakeListening()
    window.addEventListener('keydown', handleShortcut)
    window.__motherTogetherSttOverlay = {
      runDemoText(text) {
        setTranscript(text)
        interpretAndRun(text)
      },
      getState() {
        return { ...state }
      },
    }
  }

  function renderOverlay() {
    el.pill = document.createElement('div')
    el.pill.id = 'mother-together-stt-pill'
    document.body.appendChild(el.pill)
  }

  function updateOverlay() {
    el.pill.dataset.status = state.sttStatus
    el.pill.textContent = STATUS_TEXT[state.sttStatus] || STATUS_TEXT.idle
  }

  function setStatus(sttStatus) {
    state.sttStatus = sttStatus
    updateOverlay()
  }

  function setTranscript(transcript) {
    state.transcript = transcript || INITIAL_TRANSCRIPT
    updateOverlay()
  }

  function setIntent(interpretedIntent) {
    state.interpretedIntent = interpretedIntent || INITIAL_INTENT
    updateOverlay()
  }

  function setCareText(executedCareText) {
    state.executedCareText = executedCareText || INITIAL_CARE_TEXT
    dispatchCareText(state.executedCareText, CARE_TONE.final)
  }

  function getSpeechRecognition() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null
  }

  function startWakeListening() {
    stopFollowupListening()
    stopWakeListening()
    if (
      state.sttStatus !== 'idle' &&
      state.sttStatus !== 'completed' &&
      state.sttStatus !== 'followup' &&
      state.sttStatus !== 'error'
    ) return
    setStatus('idle')

    const SpeechRecognition = getSpeechRecognition()
    if (!SpeechRecognition) {
      setSoftError('마이크 권한이 필요해요. 브라우저 주소창에서 마이크 허용을 확인해주세요.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'ko-KR'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    state.wakeRecognition = recognition

    recognition.onresult = (event) => {
      const transcript = collectAnyTranscript(event) || collectTranscript(event)
      if (!isWakePhrase(transcript)) return
      stopWakeListening()
      setTranscript(transcript)
      setIntent('호출어를 확인했어요. 이어지는 말씀을 듣겠습니다.')
      void playWakeSequenceThenRecord(transcript)
    }

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setSoftError('마이크 권한이 필요해요. 브라우저 주소창에서 마이크 허용을 확인해주세요.')
        return
      }
      scheduleWakeListening()
    }

    recognition.onend = () => scheduleWakeListening()

    try {
      recognition.start()
    } catch {
      scheduleWakeListening()
    }
  }

  function stopWakeListening() {
    const recognition = state.wakeRecognition
    state.wakeRecognition = null
    if (!recognition) return
    recognition.onresult = null
    recognition.onerror = null
    recognition.onend = null
    try {
      recognition.abort()
    } catch {
      // Browser engines can throw when recognition is already inactive.
    }
  }

  function startFollowupListening(durationMs = FOLLOW_UP_LISTENING_MS) {
    stopWakeListening()
    stopFollowupListening()
    const SpeechRecognition = getSpeechRecognition()
    if (!SpeechRecognition) {
      scheduleWakeListening()
      return
    }

    state.followupUntil = Date.now() + durationMs
    state.commandHandled = false
    setStatus('followup')

    const recognition = new SpeechRecognition()
    recognition.lang = 'ko-KR'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    state.followupRecognition = recognition

    recognition.onresult = (event) => {
      if (state.commandHandled || state.isRecording) return
      const transcript = stripWakePhrase(collectTranscript(event))
      if (!transcript || transcript.length < 2) return
      state.commandHandled = true
      stopFollowupListening()
      setTranscript(transcript)
      interpretAndRun(transcript)
    }

    recognition.onerror = () => {
      returnToWakeListening(500)
    }

    recognition.onend = () => {
      if (Date.now() < state.followupUntil && !state.commandHandled && !state.isRecording) {
        window.setTimeout(() => {
          startFollowupListening(Math.max(0, state.followupUntil - Date.now()))
        }, 250)
        return
      }
      returnToWakeListening(350)
    }

    try {
      recognition.start()
    } catch {
      returnToWakeListening(350)
    }

    state.followupTimer = window.setTimeout(() => {
      returnToWakeListening(350)
    }, durationMs)
  }

  function stopFollowupListening() {
    if (state.followupTimer) window.clearTimeout(state.followupTimer)
    state.followupTimer = null
    const recognition = state.followupRecognition
    state.followupRecognition = null
    if (!recognition) return
    recognition.onresult = null
    recognition.onerror = null
    recognition.onend = null
    try {
      recognition.abort()
    } catch {
      // Some engines throw when aborting an inactive recognition session.
    }
  }

  function scheduleWakeListening(delay = 700) {
    if (state.wakeRestartTimer) window.clearTimeout(state.wakeRestartTimer)
    state.wakeRestartTimer = window.setTimeout(() => {
      state.wakeRestartTimer = null
      if (state.isRecording) {
        scheduleWakeListening(260)
        return
      }
      startWakeListening()
    }, delay)
  }

  function returnToWakeListening(delay = 350) {
    stopFollowupListening()
    if (!state.isRecording) setStatus('idle')
    scheduleWakeListening(delay)
  }

  function collectTranscript(event) {
    const parts = []
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index]
      if (result && result.isFinal) parts.push(result[0]?.transcript || '')
    }
    return parts.join(' ').trim()
  }

  function collectAnyTranscript(event) {
    const parts = []
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index]
      if (result) parts.push(result[0]?.transcript || '')
    }
    return parts.join(' ').trim()
  }

  function isWakePhrase(text) {
    const normalized = normalize(text)
    if ((normalized.includes('하이') || normalized.includes('헤이') || normalized.includes('hi') || normalized.includes('hey')) &&
      (normalized.includes('엘지') || normalized.includes('엘쥐') || normalized.includes('lg') || normalized.includes('elji'))) {
      return true
    }
    return WAKE_WORDS.some((word) => normalized.includes(word))
  }

  async function playWakeSequenceThenRecord(transcript) {
    setStatus('recording')
    dispatchCareText(transcript, CARE_TONE.heard)
    await waitForReadableCareText(transcript, WAKE_TEXT_HOLD_MS)
    dispatchCareText('호출어를 확인했어요. 이어서 말씀해주세요.', CARE_TONE.intent)
    await waitForReadableCareText('호출어를 확인했어요. 이어서 말씀해주세요.', WAKE_TEXT_HOLD_MS)
    dispatchCareText('네, 말씀하세요.', CARE_TONE.final)
    await playTts('네, 말씀하세요.', { maxWait: 3200, maxFetchWait: 18000 })
    startCommandRecording()
  }

  function preloadCommonTts() {
    ;[
      '네, 말씀하세요.',
      CARE_TEXT.condition_balance,
      CARE_TEXT.sleep_rhythm,
      CARE_TEXT.mind_refresh,
      CARE_TEXT.rest_prepare,
      CARE_TEXT.couple_dinner,
      CARE_TEXT.air_on,
      CARE_TEXT.air_off,
      CARE_TEXT.reset,
      CARE_TEXT.nausea_food,
      CARE_TEXT.sleep_care,
      CARE_TEXT.housework_care,
      CARE_TEXT.destination_ocean,
      CARE_TEXT.destination_forest,
      CARE_TEXT.destination_city,
      '안녕하세요. 좋은 하루 보내세요.',
      "I'm fine, thank you. And you?",
      '한국어로 말씀해 주세요. Mother Together가 한국어 명령을 기준으로 도와드릴게요.',
    ].forEach((text) => {
      void fetchTtsAudioUrl(text)
    })
  }

  function wait(ms, value) {
    return new Promise((resolve) => window.setTimeout(() => resolve(value), ms))
  }

  function waitForReadableCareText(text, holdMs = READABLE_TEXT_HOLD_MS) {
    const typingMs = String(text || '').length * BUBBLE_TYPING_MS_PER_CHAR
    return wait(typingMs + holdMs)
  }

  function fetchTtsAudioUrl(text) {
    if (ttsAudioCache.has(text)) return Promise.resolve(ttsAudioCache.get(text))
    if (ttsAudioRequests.has(text)) return ttsAudioRequests.get(text)

    const request = fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice: 'hub' }),
      cache: 'no-store',
    })
      .then((response) => {
        if (!response.ok) return null
        return response.blob()
      })
      .then((blob) => {
        if (!blob) return null
        const url = URL.createObjectURL(blob)
        ttsAudioCache.set(text, url)
        return url
      })
      .catch(() => null)
      .finally(() => {
        ttsAudioRequests.delete(text)
      })

    ttsAudioRequests.set(text, request)
    return request
  }

  async function playTts(text, options = {}) {
    const maxWait = options.maxWait ?? 5200
    const maxFetchWait = options.maxFetchWait ?? 6000
    try {
      const cachedUrl = ttsAudioCache.get(text)
      const url = cachedUrl || await Promise.race([fetchTtsAudioUrl(text), wait(maxFetchWait, null)])
      if (!url) {
        return
      }
      const audio = new Audio(url)
      audio.volume = 1.0
      audio.preload = 'auto'
      let played = false
      let failed = false
      await Promise.race([
        new Promise((resolve) => {
          audio.onplaying = () => {
            played = true
          }
          audio.onended = resolve
          audio.onerror = () => {
            failed = true
            resolve()
          }
          void audio.play()
            .then(() => {
              played = true
            })
            .catch(() => {
              failed = true
              resolve()
            })
        }),
        new Promise((resolve) => window.setTimeout(resolve, maxWait)),
      ])
    } catch {
      // ElevenLabs-only playback: do not fall back to browser voices.
    }
  }

  async function playBase64Audio(audioBase64, fallbackText, options = {}) {
    if (!audioBase64) {
      await playTts(fallbackText, options)
      return
    }

    const maxWait = options.maxWait ?? 4200
    try {
      const audio = new Audio(`data:audio/mpeg;base64,${audioBase64}`)
      audio.volume = 1.0
      audio.preload = 'auto'
      let played = false
      let failed = false
      await Promise.race([
        new Promise((resolve) => {
          audio.onplaying = () => {
            played = true
          }
          audio.onended = resolve
          audio.onerror = () => {
            failed = true
            resolve()
          }
          void audio.play()
            .then(() => {
              played = true
            })
            .catch(() => {
              failed = true
              resolve()
            })
        }),
        wait(maxWait),
      ])
      if (failed && !played) await playTts(fallbackText, options)
    } catch {
      await playTts(fallbackText, options)
    }
  }

  async function startCommandRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setSoftError('마이크 권한이 필요해요. 브라우저 주소창에서 마이크 허용을 확인해주세요.')
      return
    }

    try {
      state.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      state.chunks = []
      state.commandHandled = false
      state.isRecording = true
      setStatus('recording')

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : undefined
      state.mediaRecorder = mimeType
        ? new MediaRecorder(state.mediaStream, { mimeType })
        : new MediaRecorder(state.mediaStream)

      state.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) state.chunks.push(event.data)
      }
      state.mediaRecorder.onstop = () => {
        const blob = new Blob(state.chunks, { type: 'audio/webm' })
        stopMediaStream()
        stopCommandRecognition()
        state.isRecording = false
        if (state.commandHandled) return
        if (blob.size < 1200) {
          setSoftError('말씀이 짧게 인식되었어요. 한 번 더 말씀해주세요.')
          return
        }
        void transcribeAndRun(blob)
      }

      state.mediaRecorder.start()
      startFastCommandRecognition()
      startSilenceWatcher(state.mediaStream)
      state.commandTimer = window.setTimeout(stopCommandRecording, COMMAND_RECORDING_MAX_MS)
    } catch {
      state.isRecording = false
      stopMediaStream()
      stopCommandRecognition()
      setSoftError('마이크 권한이 필요해요. 브라우저 주소창에서 마이크 허용을 확인해주세요.')
    }
  }

  function startSilenceWatcher(stream) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!AudioContext) return
      const context = new AudioContext()
      const analyser = context.createAnalyser()
      const source = context.createMediaStreamSource(stream)
      const data = new Uint8Array(analyser.fftSize)
      const startedAt = Date.now()
      let quietSince = 0

      source.connect(analyser)

      const tick = () => {
        if (!state.isRecording || !state.mediaRecorder || state.mediaRecorder.state === 'inactive') {
          context.close().catch(() => undefined)
          return
        }
        analyser.getByteTimeDomainData(data)
        const volume = data.reduce((sum, value) => sum + Math.abs(value - 128), 0) / data.length
        const hasMinimumSpeechWindow = Date.now() - startedAt > COMMAND_MIN_SPEECH_WINDOW_MS
        if (volume < 2.4 && hasMinimumSpeechWindow) {
          quietSince = quietSince || Date.now()
          if (Date.now() - quietSince > COMMAND_QUIET_STOP_MS) {
            stopCommandRecording()
            context.close().catch(() => undefined)
            return
          }
        } else {
          quietSince = 0
        }
        state.silenceTimer = window.setTimeout(tick, 120)
      }

      tick()
    } catch {
      // Silence detection is an optimization. Max duration still keeps recording bounded.
    }
  }

  function stopCommandRecording() {
    if (state.commandTimer) window.clearTimeout(state.commandTimer)
    if (state.silenceTimer) window.clearTimeout(state.silenceTimer)
    state.commandTimer = null
    state.silenceTimer = null

    if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
      state.mediaRecorder.stop()
    }
  }

  function startFastCommandRecognition() {
    const SpeechRecognition = getSpeechRecognition()
    if (!SpeechRecognition) return

    try {
      const recognition = new SpeechRecognition()
      recognition.lang = 'ko-KR'
      recognition.continuous = true
      recognition.interimResults = true
      recognition.maxAlternatives = 1
      state.commandRecognition = recognition

      recognition.onresult = (event) => {
        if (state.commandHandled) return
        const transcript = stripWakePhrase(collectTranscript(event))
        if (!transcript) return
        const intent = resolveIntent(transcript)
        if (!isFastExecutableIntent(intent)) return
        state.commandHandled = true
        setTranscript(transcript)
        setIntent(intent.intentText)
        state.routineId = intent.routineId
        stopCommandRecording()
        stopCommandRecognition()
        setStatus('running')
        executeIntent(intent, transcript)
      }

      recognition.onerror = () => {
        stopCommandRecognition()
      }

      recognition.onend = () => {
        if (!state.commandHandled) state.commandRecognition = null
      }

      recognition.start()
    } catch {
      state.commandRecognition = null
    }
  }

  function isFastExecutableIntent(intent) {
    return Boolean(intent && intent.type && intent.type !== 'unknown' && intent.type !== 'unsupported_language')
  }

  function stopCommandRecognition() {
    const recognition = state.commandRecognition
    state.commandRecognition = null
    if (!recognition) return
    recognition.onresult = null
    recognition.onerror = null
    recognition.onend = null
    try {
      recognition.abort()
    } catch {
      // Some engines throw when aborting an inactive recognition session.
    }
  }

  function stopMediaStream() {
    state.mediaStream?.getTracks().forEach((track) => track.stop())
    state.mediaStream = null
    state.mediaRecorder = null
  }

  async function transcribeAndRun(blob) {
    setStatus('transcribing')
    try {
      const formData = new FormData()
      formData.append('audio', blob, 'mother-together-command.webm')
      const response = await fetch('/api/stt', {
        method: 'POST',
        body: formData,
        cache: 'no-store',
      })
      const data = await response.json()
      if (!response.ok || !data.success || !data.transcript?.trim()) {
        setSoftError(data.message || '말씀이 짧게 인식되었어요. 한 번 더 말씀해주세요.')
        return
      }

      const transcript = stripWakePhrase(data.transcript.trim())
      setTranscript(transcript)
      interpretAndRun(transcript)
    } catch {
      setSoftError('주변 소음으로 일부 내용이 정확하지 않을 수 있어요. 다시 한 번 말씀해주세요.')
    }
  }

  function interpretAndRun(transcript) {
    setStatus('interpreting')
    if (isMorningBriefingPrompt(transcript)) {
      void executeMorningBriefing(transcript)
      return
    }
    const intent = resolveIntent(transcript)
    setIntent(intent.intentText)
    state.routineId = intent.routineId
    setStatus('running')
    executeIntent(intent, transcript)
  }

  function executeIntent(intent, transcript) {
    if (intent.type === 'reset') {
      window.dispatchEvent(new CustomEvent('voice-agent-reset'))
    } else if (intent.routineId) {
      window.dispatchEvent(new CustomEvent('voice-agent-routine', {
        detail: { mode: intent.routineId, source: 'mother-together-stt-overlay', timestamp: Date.now() },
      }))
    }

    if (intent.thinqCommand) {
      void fetch('/api/thinq/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: intent.thinqCommand,
          routineId: intent.routineId,
          hubMode: intent.hubMode,
        }),
        cache: 'no-store',
      }).catch(() => undefined)
    }

    void patchDemoState(intent, transcript)
    void showCareSequenceAndRestart(intent, transcript)
  }

  async function showCareSequenceAndRestart(intent, transcript) {
    const finalSpeechReady = fetchTtsAudioUrl(intent.careText)
    dispatchCareText(transcript, CARE_TONE.heard)
    await waitForReadableCareText(transcript)
    dispatchCareText(intent.intentText, CARE_TONE.intent)
    await waitForReadableCareText(intent.intentText)
    setCareText(intent.careText)
    await wait(120)
    await finalSpeechReady.catch(() => null)
    await playTts(intent.careText, { maxWait: 5200, maxFetchWait: 18000 })
    if (intent.type === 'reset') window.dispatchEvent(new CustomEvent('voice-agent-reset'))
    setStatus('completed')
    startFollowupListening()
  }

  async function executeMorningBriefing(transcript) {
    setStatus('interpreting')
    const context = readLocalDemoContext()
    const intentText = buildMorningIntentText(context)
    setIntent(intentText)
    setStatus('running')
    const briefingVariant = getNextMorningBriefingVariant(context)
    const briefingRequest = fetch('/api/briefing/morning', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'simulation_3d_stt_overlay',
        triggerText: transcript,
        pregnancyStatus: context.pregnancyStatus,
        pregnancyWeek: context.pregnancyWeek,
        role: context.role,
        briefingVariant,
      }),
      cache: 'no-store',
    }).then(async (response) => {
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'morning briefing failed')
      }
      return data
    })

    dispatchCareText(transcript, CARE_TONE.heard)
    await waitForReadableCareText(transcript)
    dispatchCareText(intentText, CARE_TONE.intent)
    await waitForReadableCareText(intentText)

    try {
      const data = await briefingRequest
      const spokenBriefing = context.role === 'husband' ? data.husbandBriefing : data.wifeBriefing
      setCareText(spokenBriefing)
      await wait(120)
      await playBase64Audio(data.audioBase64, spokenBriefing, { maxWait: 9000, maxFetchWait: 18000 })
      setStatus('completed')
      startFollowupListening()
    } catch {
      const fallback = buildMorningFallbackText(context)
      setCareText(fallback)
      await wait(120)
      await playTts(fallback, { maxWait: 9000, maxFetchWait: 18000 })
      setStatus('completed')
      startFollowupListening()
    }
  }

  async function patchDemoState(intent, transcript) {
    try {
      await fetch('/api/demo-state', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentRoutine: intent.hubMode || null,
          simulationRoutine: intent.routineId || null,
          latestHubInput: transcript,
          latestCareModeLabel: intent.label,
          careState: 'completed',
        }),
      })
    } catch {
      // Shared demo state is best-effort and must not block the 3D demo.
    }
  }

  function dispatchCareText(text, tone = CARE_TONE.final) {
    document.body.dataset.motherTogetherCareTone = tone
    window.dispatchEvent(new CustomEvent('voice-agent-response', {
      detail: { message: text },
    }))
  }

  function resolveIntent(text) {
    const normalized = normalize(text)
    const context = getCurrentDemoContext()

    if (/(기본|초기|처음|대기).*(모드|상태|화면)?/.test(normalized)) {
      return makeIntent('reset')
    }
    if (/(공기청정기|공청기|공기정화기|청정기).*(꺼|오프|off)|(?:꺼|오프|off).*(공기청정기|공청기|공기정화기|청정기)/.test(normalized)) {
      return makeIntent('air_off')
    }
    if (/(공기청정기|공청기|공기정화기|청정기).*(켜|온|on)|(?:켜|온|on).*(공기청정기|공청기|공기정화기|청정기)/.test(normalized)) {
      return makeIntent('air_on')
    }
    const dailyIntent = resolveDailyChatIntent(text)
    if (dailyIntent) return dailyIntent
    if (context.pregnancyStatus === 'preparing') {
      if (/(둘의저녁|우리둘|우리두사람|저녁준비|저녁을준비|함께먹|식사준비|데이트|둘이먹)/.test(normalized)) {
        return makeIntent('couple_dinner')
      }
      if (/(아침컨디션|컨디션|생활리듬|건강|가볍|밸런스)/.test(normalized)) {
        return makeIntent('condition_balance')
      }
      if (/(잠을잘자|수면리듬|잠이잘|잘자게|수면|취침)/.test(normalized)) {
        return makeIntent('sleep_rhythm')
      }
      if (/(마음환기|기분을바꾸|기분바꾸|기분전환|답답|상쾌|환기)/.test(normalized)) {
        return makeIntent('mind_refresh')
      }
      if (/(휴식준비|편하게쉬|쉬고싶|편히쉬|휴식|긴장|지쳤)/.test(normalized)) {
        return makeIntent('rest_prepare')
      }
      return makeStateRestrictedIntent(context)
    }
    if (/(입덧|냄새|음식냄새|조리냄새|울렁|역해|속이안|속안|메스꺼|못먹)/.test(normalized)) {
      return makeIntent('nausea_food')
    }
    if (/(잠|수면|못자|뒤척|숙면|피곤|졸려|휴식)/.test(normalized)) {
      return makeIntent('sleep_care')
    }
    if (/(가사|움직이기힘|몸이무거|청소|빨래|집안일|힘들)/.test(normalized)) {
      return makeIntent('housework_care')
    }
    if (/(바다|오션|해변)/.test(normalized)) {
      return makeIntent('destination_ocean')
    }
    if (/(숲|숲속|자연|조용히)/.test(normalized)) {
      return makeIntent('destination_forest')
    }
    if (/(도시|야경|호텔|시티)/.test(normalized)) {
      return makeIntent('destination_city')
    }
    if (/(여행|휴양지|쉬고싶|답답)/.test(normalized)) {
      return makeIntent('destination_forest')
    }

    return {
      type: 'unknown',
      label: '맞춤 케어 확인',
      intentText: '말씀을 조금 더 구체적으로 이해해 맞춤 케어를 찾는 중',
      careText: '말씀을 조금 더 구체적으로 해주시면 Mother Together가 맞춤 케어로 연결할게요.',
      routineId: null,
      hubMode: null,
      thinqCommand: null,
    }
  }

  function isMorningBriefingPrompt(text) {
    return /(좋은아침|굿모닝|아침브리핑|오늘브리핑|아침인사)/.test(normalize(text))
  }

  function resolveDailyChatIntent(text) {
    const normalized = normalize(text)
    const trimmed = String(text || '').trim()
    const lower = trimmed.toLowerCase()

    if (isAllowedEnglishDailyPhrase(lower)) {
      return makeAdHocIntent({
        type: 'english_how_are_you',
        label: '영어 인사',
        intentText: INTENT_TEXT.english_how_are_you,
        careText: "I'm fine, thank you. And you?",
      })
    }

    if (containsUnsupportedNonKorean(trimmed)) {
      return makeAdHocIntent({
        type: 'unsupported_language',
        label: '한국어 안내',
        intentText: INTENT_TEXT.unsupported_language,
        careText: '한국어로 말씀해 주세요. Mother Together가 한국어 명령을 기준으로 도와드릴게요.',
      })
    }

    if (/^(안녕|안녕하세요|하이|반가워|헬로)$/.test(normalized)) {
      return makeAdHocIntent({
        type: 'greeting',
        label: '인사',
        intentText: INTENT_TEXT.greeting,
        careText: '안녕하세요. 좋은 하루 보내세요.',
      })
    }

    if (/(지금몇시|몇시야|몇시에요|현재시간|시간알려)/.test(normalized)) {
      return makeAdHocIntent({
        type: 'current_time',
        label: '현재 시간',
        intentText: INTENT_TEXT.current_time,
        careText: buildCurrentTimeText(),
      })
    }

    return null
  }

  function makeAdHocIntent({ type, label, intentText, careText }) {
    return {
      type,
      label,
      intentText,
      careText,
      routineId: null,
      hubMode: null,
      thinqCommand: null,
    }
  }

  function makeStateRestrictedIntent(context) {
    if (context.pregnancyStatus === 'preparing') {
      return makeAdHocIntent({
        type: 'state_restricted',
        label: '임신 준비중 모드 안내',
        intentText: '임신 준비중에서 실행 가능한 케어 범위 확인',
        careText: '임신 준비중에서는 컨디션, 수면 리듬, 마음 환기, 휴식 준비, 둘의 저녁 중에서 도와드릴게요.',
      })
    }

    return makeAdHocIntent({
      type: 'state_restricted',
      label: '임신중 모드 안내',
      intentText: '임신중에서 실행 가능한 케어 범위 확인',
      careText: '임신중에는 입덧, 수면, 가사 케어, 바다, 숲, 도시 모드 중에서 도와드릴게요.',
    })
  }

  function buildCurrentTimeText() {
    const parts = new Intl.DateTimeFormat('ko-KR', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).formatToParts(new Date())
    const dayPeriod = parts.find((part) => part.type === 'dayPeriod')?.value || ''
    const hour = parts.find((part) => part.type === 'hour')?.value || ''
    const minute = parts.find((part) => part.type === 'minute')?.value || '0'
    return `지금은 ${dayPeriod} ${Number(hour)}시 ${Number(minute)}분입니다.`
  }

  function containsUnsupportedNonKorean(text) {
    if (!text || /[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(text)) return false
    return /[a-zA-ZÀ-ÿ\u0400-\u04FF\u3040-\u30FF\u4E00-\u9FFF]/.test(text)
  }

  function isAllowedEnglishDailyPhrase(text) {
    return /^(hi|hello|how\s+are\s+you|how're\s+you)[\s?.!]*$/i.test(text)
  }

  async function readDemoContext() {
    const local = readLocalDemoContext()
    try {
      const response = await fetch('/api/demo-state', { cache: 'no-store' })
      const data = await response.json()
      return normalizeDemoContext(data.state, local)
    } catch {
      return local
    }
  }

  async function refreshDemoContext() {
    state.demoContext = await readDemoContext()
    return state.demoContext
  }

  function getCurrentDemoContext() {
    return state.demoContext || readLocalDemoContext()
  }

  function readLocalDemoContext() {
    const params = new URLSearchParams(window.location.search)
    const onboarding = readJson('thinq-mom-onboarding-profile') || {}
    const wifeProfile = readJson('thinq-mom-wife-profile') || {}
    return normalizeDemoContext({
      pregnancyStatus: normalizePregnancyStatusValue(
        params.get('status') ||
        params.get('pregnancyStatus') ||
        wifeProfile.pregnancyStatus ||
        onboarding.status,
      ),
      pregnancyWeek:
        parseWeek(params.get('weeks')) ||
        parseWeek(params.get('pregnancyWeek')) ||
        parseWeek(wifeProfile.pregnancyWeek) ||
        parseWeek(onboarding.weeks),
      role: normalizeRoleValue(
        params.get('role') ||
        onboarding.role ||
        window.localStorage.getItem('thinq-mom-role'),
      ),
    })
  }

  function normalizeDemoContext(value, fallback) {
    const pregnancyStatus = value?.pregnancyStatus === 'preparing'
      ? 'preparing'
      : value?.pregnancyStatus === 'pregnant'
        ? 'pregnant'
        : fallback?.pregnancyStatus || getPregnancyStatusFromUrl()
    const pregnancyWeek = parseWeek(value?.pregnancyWeek) || fallback?.pregnancyWeek
    const role = value?.role === 'husband'
      ? 'husband'
      : value?.role === 'wife'
        ? 'wife'
        : fallback?.role || 'wife'

    return { pregnancyStatus, pregnancyWeek, role }
  }

  function getPregnancyStatusFromUrl() {
    const value = new URLSearchParams(window.location.search).get('pregnancyStatus')
    return value === 'preparing' ? 'preparing' : 'pregnant'
  }

  function normalizePregnancyStatusValue(value) {
    return value === 'preparing' || value === 'pregnant' ? value : undefined
  }

  function normalizeRoleValue(value) {
    return value === 'wife' || value === 'husband' ? value : undefined
  }

  function parseWeek(value) {
    const numberValue = typeof value === 'number' ? value : value ? Number(value) : NaN
    return Number.isInteger(numberValue) && numberValue >= 1 && numberValue <= 42
      ? numberValue
      : undefined
  }

  function readJson(key) {
    try {
      const raw = window.localStorage.getItem(key)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }

  function getNextMorningBriefingVariant(context) {
    const key = [
      'thinq-mom-3d-morning-briefing-count',
      context.pregnancyStatus,
      context.role,
      context.pregnancyWeek || 'none',
    ].join(':')

    try {
      const current = Number(window.localStorage.getItem(key) || '0')
      const next = Number.isFinite(current) ? current + 1 : 1
      window.localStorage.setItem(key, String(next))
      return current
    } catch {
      return Date.now()
    }
  }

  function buildMorningIntentText(context) {
    const statusText = context.pregnancyStatus === 'preparing'
      ? '임신 준비 상태'
      : `임신 ${context.pregnancyWeek || 12}주차 상태`
    const roleText = context.role === 'husband' ? '남편 역할' : '아내 역할'
    return `${statusText}와 ${roleText}에 맞춘 굿모닝 브리핑`
  }

  function buildMorningFallbackText(context) {
    if (context.pregnancyStatus === 'preparing') {
      return context.role === 'husband'
        ? '좋은 아침이에요. 오늘은 서로의 컨디션을 묻고, 함께 쉬는 시간을 먼저 챙겨보세요.'
        : '좋은 아침이에요. 오늘은 조급해하지 말고, 편안한 생활 리듬부터 챙겨볼게요.'
    }
    const week = context.pregnancyWeek || 12
    return context.role === 'husband'
      ? `좋은 아침이에요. 임신 ${week}주차인 아내가 천천히 시작할 수 있도록 먼저 컨디션을 물어봐 주세요.`
      : `좋은 아침이에요. 임신 ${week}주차인 오늘은 몸의 신호를 먼저 살피고 천천히 시작해볼게요.`
  }

  function makeIntent(key) {
    const routineHubMode = {
      condition_balance: 'HOUSEWORK_MODE',
      sleep_rhythm: 'SLEEP_MODE',
      mind_refresh: 'TRAVEL_MODE',
      rest_prepare: 'SLEEP_MODE',
      couple_dinner: 'TRAVEL_MODE',
      nausea_food: 'NAUSEA_MODE',
      sleep_care: 'SLEEP_MODE',
      housework_care: 'HOUSEWORK_MODE',
      destination_ocean: 'TRAVEL_MODE',
      destination_forest: 'TRAVEL_MODE',
      destination_city: 'TRAVEL_MODE',
    }
    const routineMode = {
      condition_balance: 'housework_care',
      sleep_rhythm: 'sleep_care',
      mind_refresh: 'destination_forest',
      rest_prepare: 'sleep_care',
      couple_dinner: 'destination_city',
    }
    const thinqCommand = {
      condition_balance: 'MODE_AUTO',
      sleep_rhythm: 'MODE_SLEEP',
      mind_refresh: 'MODE_AUTO',
      rest_prepare: 'MODE_SLEEP',
      couple_dinner: 'MODE_AUTO',
    }
    const label = {
      condition_balance: '컨디션 밸런스',
      sleep_rhythm: '수면 리듬',
      mind_refresh: '마음 환기',
      rest_prepare: '휴식 준비',
      couple_dinner: '둘의 저녁',
      nausea_food: '입덧 케어',
      sleep_care: '수면 케어',
      housework_care: '가사 케어',
      destination_ocean: '바다 휴양지',
      destination_forest: '숲 휴양지',
      destination_city: '도시 휴양지',
      air_on: '공기청정기 켜기',
      air_off: '공기청정기 끄기',
      reset: '기본 모드',
    }[key]

    return {
      type: key,
      label,
      intentText: INTENT_TEXT[key],
      careText: CARE_TEXT[key],
      routineId: routineMode[key] || (key.startsWith('destination_') || key.endsWith('_care') || key === 'nausea_food' ? key : null),
      hubMode: routineHubMode[key] || (key === 'air_on' ? 'AIR_ON' : key === 'air_off' ? 'AIR_OFF' : null),
      thinqCommand: thinqCommand[key] || THINQ_COMMAND[key] || null,
    }
  }

  function handleShortcut(event) {
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return
    const target = event.target
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
    const shortcut = {
      1: ['nausea_food', '오늘 냄새가 너무 힘들어'],
      2: ['sleep_care', '요즘 잠을 잘 못 자겠어'],
      3: ['housework_care', '오늘 움직이기 너무 힘들어'],
      4: ['destination_ocean', '바다처럼 쉬고 싶어'],
      5: ['destination_forest', '숲속처럼 조용히 쉬고 싶어'],
      6: ['destination_city', '도시 야경처럼 쉬고 싶어'],
      0: ['air_off', '공기청정기 꺼줘'],
    }[event.key]
    if (!shortcut) return
    const [key, transcript] = shortcut
    setTranscript(transcript)
    const intent = makeIntent(key)
    setIntent(intent.intentText)
    setStatus('running')
    executeIntent(intent, transcript)
  }

  function normalize(text) {
    return String(text || '').toLowerCase().replace(/\s+/g, '')
  }

  function stripWakePhrase(text) {
    let cleaned = text
    for (const word of ['하이 엘지', '하이 LG', 'Hi LG', '헤이 엘지', '엘지야']) {
      cleaned = cleaned.replace(new RegExp(escapeRegExp(word), 'gi'), ' ')
    }
    return cleaned.replace(/\s+/g, ' ').trim() || text
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  function setSoftError(message) {
    setStatus('error')
    setIntent(message)
    scheduleWakeListening(1200)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true })
  } else {
    init()
  }
})()
