import { useEffect, useRef, useState } from "react";
import type { DemoMode } from "../../types/demoTypes";
import { koText } from "../../data/koText";

type RoutineMode = Exclude<DemoMode, "idle">;
type VoicePhase = "wake" | "prompting" | "command" | "executing" | "failed";

type ExecuteResponse = {
  success: boolean;
  redirect?: boolean;
  type?: "MORNING_BRIEFING";
  mode: string;
  modeLabel: string;
  reply: string;
  audioBase64?: string;
  error?: string;
};

type MorningBriefingResponse = {
  success: boolean;
  wifeBriefing: string;
  husbandBriefing: string;
  audioBase64?: string;
  recommendedModes?: string[];
  error?: string;
};

type DemoContext = {
  pregnancyStatus: "preparing" | "pregnant";
  pregnancyWeek?: number;
  role: "wife" | "husband";
};

type ImmediateCareIntent = {
  hubMode: "NAUSEA_MODE" | "SLEEP_MODE" | "HOUSEWORK_MODE" | "TRAVEL_MODE" | "AIR_ON" | "AIR_OFF";
  routine: RoutineMode | null;
  thinqCommand: "MODE_TURBO" | "MODE_SLEEP" | "MODE_AUTO" | "POWER_ON" | "POWER_OFF";
  modeLabel: string;
  speech: string;
};

type VoiceHubControllerProps = {
  isRoutineRunning: boolean;
  onRunRoutine: (mode: RoutineMode) => void;
  onReset: () => void;
  onThinking: (message: string) => void;
  onResponse: (message: string) => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const WAKE_WORDS = [
  "하이 엘지",
  "하이엘지",
  "헤이 엘지",
  "헤이엘지",
  "엘지야",
  "하이 lg",
  "헤이 lg",
  "hi lg",
  "hey lg",
];

const WAKE_REPLY = "네 말씀하세요.";
const DEFAULT_MODE_REPLY =
  "기본 대기 상태로 돌아갈게요.\n허브 파동과 가전 제어는 끄고, 밝고 편안한 공간만 유지할게요.";

export function VoiceHubController({
  isRoutineRunning,
  onRunRoutine,
  onReset,
  onThinking,
  onResponse,
}: VoiceHubControllerProps) {
  const [phase, setPhase] = useState<VoicePhase>("wake");
  const [notice, setNotice] = useState("마이크 대기 중 · '하이 엘지'라고 말해보세요.");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const restartTimerRef = useRef<number | null>(null);
  const commandTimerRef = useRef<number | null>(null);
  const disposedRef = useRef(false);
  const phaseRef = useRef<VoicePhase>("wake");
  const commandHandledRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wakeAudioUrlRef = useRef<string | null>(null);
  const ttsAudioCacheRef = useRef<Map<string, string>>(new Map());
  const ttsAudioRequestRef = useRef<Map<string, Promise<string>>>(new Map());
  const contextRef = useRef<DemoContext>(readLocalDemoContext());

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    disposedRef.current = false;
    void refreshDemoContext();
    void preloadWakeAudio();
    void preloadInstantResponseAudio();
    if (!isRoutineRunning) startWakeListening();
    const contextTimer = window.setInterval(() => {
      void refreshDemoContext();
    }, 2000);

    return () => {
      disposedRef.current = true;
      window.clearInterval(contextTimer);
      clearTimers();
      stopRecognition();
      audioRef.current?.pause();
      if (wakeAudioUrlRef.current) URL.revokeObjectURL(wakeAudioUrlRef.current);
      ttsAudioCacheRef.current.forEach((url) => URL.revokeObjectURL(url));
      ttsAudioCacheRef.current.clear();
    };
    // The callbacks are stable enough for the lifetime of this controller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isRoutineRunning) {
      clearTimers();
      stopRecognition();
      setNotice("케어 모드 실행 중이에요.");
      return;
    }

    if (!disposedRef.current && phaseRef.current !== "command" && phaseRef.current !== "prompting") {
      startWakeListening();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRoutineRunning]);

  function startWakeListening() {
    if (disposedRef.current || isRoutineRunning) return;
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setPhase("failed");
      setNotice("이 브라우저는 자동 음성 대기를 지원하지 않아요. Chrome에서 접속해주세요.");
      return;
    }

    clearTimers();
    stopRecognition();
    setPhase("wake");
    setNotice("마이크 대기 중 · '하이 엘지'라고 말해보세요.");

    const recognition = new SpeechRecognition();
    recognition.lang = "ko-KR";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      const transcript = collectFinalTranscript(event);
      if (!transcript || !hasWakeWord(transcript)) return;
      stopRecognition();
      void handleWakeWord();
    };

    recognition.onerror = (event) => {
      if (disposedRef.current) return;
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setPhase("failed");
        setNotice("마이크 권한을 허용해야 '하이 엘지'를 들을 수 있어요.");
        return;
      }
      scheduleWakeRestart();
    };

    recognition.onend = () => {
      if (disposedRef.current || phaseRef.current !== "wake" || isRoutineRunning) return;
      scheduleWakeRestart();
    };

    try {
      recognition.start();
    } catch (error) {
      console.warn("[3d voice hub] wake recognition start failed:", error);
      scheduleWakeRestart();
    }
  }

  async function handleWakeWord() {
    setPhase("prompting");
    setNotice("'네 말씀하세요' 응답 후 상태를 들을게요.");
    onResponse(WAKE_REPLY);

    await playWakePrompt();
    startCommandListening();
  }

  function startCommandListening() {
    if (disposedRef.current || isRoutineRunning) return;
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setPhase("failed");
      setNotice("상태 음성 인식을 시작할 수 없어요.");
      return;
    }

    clearTimers();
    stopRecognition();
    commandHandledRef.current = false;
    setPhase("command");
    setNotice("상태를 말씀해주세요. 예: '오늘 입덧이 심해요'.");

    const recognition = new SpeechRecognition();
    recognition.lang = "ko-KR";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      const transcript = stripWakeWord(collectFinalTranscript(event));
      if (!transcript) return;
      commandHandledRef.current = true;
      stopRecognition();
      void executeCare(transcript);
    };

    recognition.onerror = () => {
      if (disposedRef.current || commandHandledRef.current) return;
      returnToWake("상태를 듣지 못했어요. 다시 '하이 엘지'라고 불러주세요.");
    };

    recognition.onend = () => {
      if (disposedRef.current || commandHandledRef.current) return;
      returnToWake("상태를 듣지 못했어요. 다시 '하이 엘지'라고 불러주세요.");
    };

    try {
      recognition.start();
      commandTimerRef.current = window.setTimeout(() => {
        if (!commandHandledRef.current) {
          stopRecognition();
          returnToWake("상태 말씀이 없어서 기본 대기로 돌아갈게요.");
        }
      }, 9000);
    } catch (error) {
      console.warn("[3d voice hub] command recognition start failed:", error);
      returnToWake("상태 음성 인식을 시작하지 못했어요. 다시 불러주세요.");
    }
  }

  async function executeCare(text: string) {
    clearTimers();
    const context = contextRef.current;
    void refreshDemoContext();

    if (isMorningBriefingPrompt(text)) {
      await executeMorningBriefing(text, await refreshDemoContext());
      return;
    }

    if (isDefaultModePrompt(text)) {
      executeDefaultMode();
      return;
    }

    const immediateIntent = resolveImmediateCareIntent(text, context);
    if (immediateIntent) {
      // Make the room and the real appliance react before slower server work finishes.
      if (immediateIntent.routine) onRunRoutine(immediateIntent.routine);
      else onResponse(immediateIntent.speech);
      dispatchThinQImmediately(immediateIntent);
      playInstantSpeech(immediateIntent.speech);
      setPhase("executing");
      setNotice(`${immediateIntent.modeLabel}로 바로 바꾸고 있어요.`);
      if (!immediateIntent.routine) scheduleWakeListening(900);
    } else {
      setPhase("executing");
      setNotice("상태에 맞는 환경으로 바꾸고 있어요.");
      onThinking("상태에 맞는 케어 환경으로 바꿔볼게요.\n잠시만 기다려주세요.");
    }

    try {
      const response = await fetch("/api/mother-together/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          source: "simulation_3d_voice",
          audience: "hub",
          careLogId: createCareLogId(),
          pregnancyStatus: context.pregnancyStatus,
          pregnancyWeek: context.pregnancyWeek,
        }),
      });
      const data = (await response.json()) as ExecuteResponse;

      if (!response.ok || !data.success) {
        returnToWake(data.error ?? "지금은 케어 모드를 실행하기 어려워요.");
        return;
      }

      if (data.redirect && data.type === "MORNING_BRIEFING") {
        await executeMorningBriefing(text, context);
        return;
      }

      const routine = resolveRoutineMode(data.mode, text);
      if (routine && !immediateIntent) {
        onRunRoutine(routine);
      } else if (!immediateIntent) {
        onResponse(data.reply);
      }

      setNotice(`${data.modeLabel}로 바꿨어요. 이후 다시 '하이 엘지'라고 부르면 들을게요.`);
      if (!immediateIntent) playResponseAudio(data.audioBase64);
      if (!routine || !immediateIntent?.routine) scheduleWakeListening(900);
    } catch (error) {
      console.warn("[3d voice hub] care execution failed:", error);
      returnToWake("케어 실행 중 문제가 생겼어요. 잠시 후 다시 불러주세요.");
    }
  }

  async function executeMorningBriefing(text: string, context: DemoContext) {
    clearTimers();
    setPhase("executing");
    setNotice(`${context.role === "husband" ? "남편" : "엄마"} 화면 기준으로 굿모닝 브리핑을 준비하고 있어요.`);
    onThinking("좋은 아침이에요.\n선택한 상태와 역할에 맞춰 오늘의 행동 제안을 준비하고 있어요.");

    try {
      const briefingVariant = getNextMorningBriefingVariant(context);
      const response = await fetch("/api/briefing/morning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "simulation_3d_voice",
          triggerText: text,
          pregnancyStatus: context.pregnancyStatus,
          pregnancyWeek: context.pregnancyWeek,
          role: context.role,
          briefingVariant,
        }),
      });
      const data = (await response.json()) as MorningBriefingResponse;

      if (!response.ok || !data.success) {
        returnToWake(data.error ?? "굿모닝 브리핑을 만들지 못했어요.");
        return;
      }

      const spokenBriefing = context.role === "husband" ? data.husbandBriefing : data.wifeBriefing;
      onResponse(spokenBriefing);
      setNotice("굿모닝 브리핑을 들려드렸어요. 이후 다시 '하이 엘지'라고 부르면 들을게요.");
      playResponseAudio(data.audioBase64);
      window.setTimeout(() => {
        if (!disposedRef.current && !isRoutineRunning) startWakeListening();
      }, 1200);
    } catch (error) {
      console.warn("[3d voice hub] morning briefing failed:", error);
      returnToWake("굿모닝 브리핑 중 문제가 생겼어요. 잠시 후 다시 불러주세요.");
    }
  }

  function executeDefaultMode() {
    clearTimers();
    stopRecognition();
    onReset();
    onResponse(DEFAULT_MODE_REPLY);
    playInstantSpeech(DEFAULT_MODE_REPLY);
    setPhase("wake");
    setNotice("기본 모드로 돌아왔어요. 다시 '하이 엘지'라고 부르면 들을게요.");
    window.setTimeout(() => {
      if (!disposedRef.current && !isRoutineRunning) startWakeListening();
    }, 900);
  }

  function returnToWake(message: string) {
    clearTimers();
    stopRecognition();
    setPhase("wake");
    setNotice(message);
    scheduleWakeListening(900);
  }

  function scheduleWakeListening(delayMs: number) {
    window.setTimeout(() => {
      if (!disposedRef.current && !isRoutineRunning) startWakeListening();
    }, delayMs);
  }

  function scheduleWakeRestart() {
    if (restartTimerRef.current !== null || disposedRef.current || isRoutineRunning) return;
    restartTimerRef.current = window.setTimeout(() => {
      restartTimerRef.current = null;
      if (!disposedRef.current && phaseRef.current === "wake") startWakeListening();
    }, 500);
  }

  function playResponseAudio(audioBase64: string | undefined) {
    if (!audioBase64) return;
    audioRef.current?.pause();
    const audio = new Audio(`data:audio/mpeg;base64,${audioBase64}`);
    audioRef.current = audio;
    void audio.play().catch((error) => {
      console.warn("[3d voice hub] response audio playback failed:", error);
    });
  }

  async function preloadWakeAudio() {
    try {
      const audioUrl = await fetchTtsAudioUrl("네 말씀하세요.");
      if (wakeAudioUrlRef.current) URL.revokeObjectURL(wakeAudioUrlRef.current);
      wakeAudioUrlRef.current = audioUrl;
    } catch (error) {
      console.warn("[3d voice hub] wake TTS preload failed:", error);
    }
  }

  async function preloadInstantResponseAudio() {
    const texts = [
      DEFAULT_MODE_REPLY,
      koText.routines.nausea_food.speech,
      koText.routines.sleep_care.speech,
      koText.routines.housework_care.speech,
      koText.routines.destination_forest.speech,
      koText.routines.destination_ocean.speech,
      koText.routines.destination_city.speech,
      "공기청정기를 켜드릴게요.",
      "공기청정기를 꺼드릴게요.",
      "공기청정기를 자동 모드로 바꾸고, 맑은 공기와 부드러운 아침빛으로 컨디션을 맞췄어요.",
      "공기청정기를 수면 모드로 바꾸고, 잔잔한 음악과 따뜻한 조명으로 맞췄어요.",
      "공기청정기를 자동 모드로 바꾸고, 숲길 화면과 산뜻한 자연풍을 준비했어요.",
    ];

    await Promise.allSettled(texts.map((text) => getCachedTtsAudioUrl(text)));
  }

  function playInstantSpeech(text: string) {
    void getCachedTtsAudioUrl(text)
      .then((audioUrl) => {
        audioRef.current?.pause();
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        void audio.play().catch((error) => {
          console.warn("[3d voice hub] instant TTS playback failed:", error);
        });
      })
      .catch((error) => {
        console.warn("[3d voice hub] instant TTS unavailable:", error);
      });
  }

  async function playWakePrompt() {
    try {
      const audioUrl = wakeAudioUrlRef.current ?? await getCachedTtsAudioUrl(WAKE_REPLY);
      const audio = new Audio(audioUrl);
      audioRef.current?.pause();
      audioRef.current = audio;
      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        void audio.play().catch(() => resolve());
        window.setTimeout(resolve, 1600);
      });
    } catch (error) {
      console.warn("[3d voice hub] wake TTS playback failed:", error);
    }
  }

  async function fetchTtsAudioUrl(text: string) {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice: "hub" }),
      cache: "no-store",
    });

    if (!response.ok) throw new Error("TTS 생성 실패");
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  async function getCachedTtsAudioUrl(text: string) {
    const cached = ttsAudioCacheRef.current.get(text);
    if (cached) return cached;

    const pending = ttsAudioRequestRef.current.get(text);
    if (pending) return pending;

    const request = fetchTtsAudioUrl(text).then((url) => {
      ttsAudioCacheRef.current.set(text, url);
      ttsAudioRequestRef.current.delete(text);
      return url;
    }).catch((error) => {
      ttsAudioRequestRef.current.delete(text);
      throw error;
    });

    ttsAudioRequestRef.current.set(text, request);
    return request;
  }

  async function refreshDemoContext(): Promise<DemoContext> {
    const local = readLocalDemoContext();
    contextRef.current = local;

    try {
      const response = await fetch("/api/demo-state", { cache: "no-store" });
      if (!response.ok) return contextRef.current;
      const data = (await response.json()) as {
        state?: Partial<DemoContext>;
      };
      contextRef.current = normalizeDemoContext(data.state, local);
    } catch (error) {
      console.warn("[3d voice hub] demo context refresh failed:", error);
    }

    return contextRef.current;
  }

  function dispatchThinQImmediately(intent: ImmediateCareIntent) {
    void fetch("/api/thinq/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        command: intent.thinqCommand,
        hubMode: intent.hubMode,
        routineId: intent.routine,
      }),
      cache: "no-store",
    }).catch((error) => {
      console.warn("[3d voice hub] immediate ThinQ dispatch failed:", error);
    });
  }

  function stopRecognition() {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (!recognition) return;
    recognition.onresult = null;
    recognition.onend = null;
    recognition.onerror = null;
    try {
      recognition.abort();
    } catch {
      // Some engines throw when aborting an inactive recognition session.
    }
  }

  function clearTimers() {
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (commandTimerRef.current !== null) {
      window.clearTimeout(commandTimerRef.current);
      commandTimerRef.current = null;
    }
  }

  return (
    <div className={`voice-hub-controller phase-${phase}`}>
      <p>{notice}</p>
    </div>
  );
}

function getSpeechRecognition() {
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

function collectFinalTranscript(event: SpeechRecognitionEventLike) {
  const parts: string[] = [];
  for (let index = event.resultIndex; index < event.results.length; index += 1) {
    const result = event.results[index];
    if (result?.isFinal) parts.push(result[0]?.transcript ?? "");
  }
  return parts.join(" ").trim();
}

function hasWakeWord(text: string) {
  const normalized = normalizeSpeechText(text);
  return WAKE_WORDS.some((word) => normalized.includes(normalizeSpeechText(word)));
}

function stripWakeWord(text: string) {
  let cleaned = text.trim();
  for (const word of WAKE_WORDS) {
    cleaned = cleaned.replace(new RegExp(escapeRegExp(word), "gi"), " ");
  }
  return cleaned.replace(/[,.，。]/g, " ").replace(/\s+/g, " ").trim() || text.trim();
}

function normalizeSpeechText(text: string) {
  return text.toLowerCase().replace(/\s+/g, "");
}

function resolveRoutineMode(mode: string, transcript: string): RoutineMode | null {
  switch (mode) {
    case "NAUSEA_MODE":
      return "nausea_food";
    case "SLEEP_MODE":
      return "sleep_care";
    case "HOUSEWORK_MODE":
      return "housework_care";
    case "TRAVEL_MODE":
      return resolveTravelRoutine(transcript);
    default:
      return null;
  }
}

function resolveImmediateCareIntent(text: string, context: DemoContext): ImmediateCareIntent | null {
  const normalized = normalizeSpeechText(text);

  if (/(공기청정기|공청기|공기정화기|청정기).*(켜|온|on)|(?:켜|온|on).*(공기청정기|공청기|공기정화기|청정기)/.test(normalized)) {
    return {
      hubMode: "AIR_ON",
      routine: null,
      thinqCommand: "POWER_ON",
      modeLabel: "공기청정기 켜기",
      speech: "공기청정기를 켜드릴게요.",
    };
  }

  if (/(공기청정기|공청기|공기정화기|청정기).*(꺼|오프|off)|(?:꺼|오프|off).*(공기청정기|공청기|공기정화기|청정기)/.test(normalized)) {
    return {
      hubMode: "AIR_OFF",
      routine: null,
      thinqCommand: "POWER_OFF",
      modeLabel: "공기청정기 끄기",
      speech: "공기청정기를 꺼드릴게요.",
    };
  }

  if (context.pregnancyStatus === "preparing") {
    if (/(컨디션|아침|일어났|생활리듬|건강|가볍|밸런스)/.test(normalized)) {
      return {
        hubMode: "HOUSEWORK_MODE",
        routine: "housework_care",
        thinqCommand: "MODE_AUTO",
        modeLabel: "컨디션 밸런스",
        speech: "공기청정기를 자동 모드로 바꾸고, 맑은 공기와 부드러운 아침빛으로 컨디션을 맞췄어요.",
      };
    }

    if (/(잠|수면|취침|피곤|쉬고싶|휴식|긴장|지쳤|힘들)/.test(normalized)) {
      return {
        hubMode: "SLEEP_MODE",
        routine: "sleep_care",
        thinqCommand: "MODE_SLEEP",
        modeLabel: "휴식 준비",
        speech: "공기청정기를 수면 모드로 바꾸고, 잔잔한 음악과 따뜻한 조명으로 맞췄어요.",
      };
    }

    if (/(스트레스|답답|환기|산책|숲|기분전환|상쾌|여행|휴양)/.test(normalized)) {
      return {
        hubMode: "TRAVEL_MODE",
        routine: "destination_forest",
        thinqCommand: "MODE_AUTO",
        modeLabel: "마음 환기",
        speech: "공기청정기를 자동 모드로 바꾸고, 숲길 화면과 산뜻한 자연풍을 준비했어요.",
      };
    }
  }

  if (/(입덧|울렁|메스꺼|냄새|속이안|속안|못먹|음식|먹기힘)/.test(normalized)) {
    return {
      hubMode: "NAUSEA_MODE",
      routine: "nausea_food",
      thinqCommand: "MODE_TURBO",
      modeLabel: "입덧모드",
      speech: koText.routines.nausea_food.speech,
    };
  }

  if (/(잠|수면|잠이안|못자|피곤|졸려|밤|자극)/.test(normalized)) {
    return {
      hubMode: "SLEEP_MODE",
      routine: "sleep_care",
      thinqCommand: "MODE_SLEEP",
      modeLabel: "수면모드",
      speech: koText.routines.sleep_care.speech,
    };
  }

  if (/(가사|집안일|빨래|세탁|청소|몸이무거|움직이기힘|힘들)/.test(normalized)) {
    return {
      hubMode: "HOUSEWORK_MODE",
      routine: "housework_care",
      thinqCommand: "MODE_AUTO",
      modeLabel: "가사케어 모드",
      speech: koText.routines.housework_care.speech,
    };
  }

  if (/(여행|휴양|답답|어디론가|바다|오션|숲|도시|시티|쉬고싶)/.test(normalized)) {
    return {
      hubMode: "TRAVEL_MODE",
      routine: resolveTravelRoutine(text),
      thinqCommand: "MODE_AUTO",
      modeLabel: "휴양지모드",
      speech: koText.routines[resolveTravelRoutine(text)].speech,
    };
  }

  return null;
}

function isMorningBriefingPrompt(text: string) {
  return /좋은\s*아침(?:이야|이에요|입니다)?/.test(text);
}

function isDefaultModePrompt(text: string) {
  return /(기본|초기|처음|대기)\s*(모드|상태|화면)?/.test(text);
}

function resolveTravelRoutine(text: string): RoutineMode {
  const normalized = normalizeSpeechText(text);
  if (normalized.includes("바다") || normalized.includes("오션") || normalized.includes("ocean")) {
    return "destination_ocean";
  }
  if (normalized.includes("도시") || normalized.includes("시티") || normalized.includes("city")) {
    return "destination_city";
  }
  return "destination_forest";
}

function getPregnancyStatusFromUrl(): "preparing" | "pregnant" {
  const value = new URLSearchParams(window.location.search).get("pregnancyStatus");
  return value === "preparing" ? "preparing" : "pregnant";
}

function readLocalDemoContext(): DemoContext {
  const params = new URLSearchParams(window.location.search);
  const onboarding = readJson("thinq-mom-onboarding-profile") as {
    status?: string;
    weeks?: string;
    role?: string;
  } | null;
  const wifeProfile = readJson("thinq-mom-wife-profile") as {
    pregnancyStatus?: string | null;
    pregnancyWeek?: number | null;
  } | null;

  return normalizeDemoContext({
    pregnancyStatus: normalizePregnancyStatusValue(
      params.get("status") ??
      params.get("pregnancyStatus") ??
      wifeProfile?.pregnancyStatus ??
      onboarding?.status,
    ),
    pregnancyWeek:
      parseWeek(params.get("weeks")) ??
      parseWeek(params.get("pregnancyWeek")) ??
      wifeProfile?.pregnancyWeek ??
      parseWeek(onboarding?.weeks),
    role: normalizeRoleValue(
      params.get("role") ??
      onboarding?.role ??
      window.localStorage.getItem("thinq-mom-role"),
    ),
  });
}

function normalizeDemoContext(value: Partial<DemoContext> | null | undefined, fallback?: DemoContext): DemoContext {
  const pregnancyStatus = value?.pregnancyStatus === "preparing" ? "preparing" : value?.pregnancyStatus === "pregnant"
    ? "pregnant"
    : fallback?.pregnancyStatus ?? getPregnancyStatusFromUrl();
  const pregnancyWeek =
    value?.pregnancyWeek && value.pregnancyWeek >= 1 && value.pregnancyWeek <= 42
      ? Math.round(value.pregnancyWeek)
      : fallback?.pregnancyWeek;
  const role = value?.role === "husband" ? "husband" : value?.role === "wife" ? "wife" : fallback?.role ?? "wife";

  return { pregnancyStatus, pregnancyWeek, role };
}

function readJson(key: string) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function parseWeek(value: string | number | null | undefined) {
  const numberValue = typeof value === "number" ? value : value ? Number(value) : NaN;
  return Number.isInteger(numberValue) && numberValue >= 1 && numberValue <= 42 ? numberValue : undefined;
}

function getNextMorningBriefingVariant(context: DemoContext) {
  const key = [
    "thinq-mom-3d-morning-briefing-count",
    context.pregnancyStatus,
    context.role,
    context.pregnancyWeek ?? "none",
  ].join(":");

  try {
    const current = Number(window.localStorage.getItem(key) ?? "0");
    const next = Number.isFinite(current) ? current + 1 : 1;
    window.localStorage.setItem(key, String(next));
    return current;
  } catch {
    return Date.now();
  }
}

function normalizePregnancyStatusValue(value: unknown): DemoContext["pregnancyStatus"] | undefined {
  if (value === "preparing" || value === "pregnant") return value;
  return undefined;
}

function normalizeRoleValue(value: unknown): DemoContext["role"] | undefined {
  if (value === "wife" || value === "husband") return value;
  return undefined;
}

function createCareLogId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `simulation-3d-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
