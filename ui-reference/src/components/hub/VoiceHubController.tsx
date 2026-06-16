import { useEffect, useRef, useState } from "react";
import type { DemoMode } from "../../types/demoTypes";

type RoutineMode = Exclude<DemoMode, "idle">;
type VoicePhase = "wake" | "prompting" | "command" | "executing" | "failed";

type ExecuteResponse = {
  success: boolean;
  mode: string;
  modeLabel: string;
  reply: string;
  audioBase64?: string;
  error?: string;
};

type VoiceHubControllerProps = {
  isRoutineRunning: boolean;
  onRunRoutine: (mode: RoutineMode) => void;
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

export function VoiceHubController({
  isRoutineRunning,
  onRunRoutine,
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

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    disposedRef.current = false;
    if (!isRoutineRunning) startWakeListening();

    return () => {
      disposedRef.current = true;
      clearTimers();
      stopRecognition();
      audioRef.current?.pause();
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
    onResponse("네 말씀하세요.");

    await speakKorean("네 말씀하세요.");
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
    setPhase("executing");
    setNotice("상태에 맞는 환경으로 바꾸고 있어요.");
    onThinking("상태에 맞는 케어 환경으로 바꿔볼게요.\n잠시만 기다려주세요.");

    try {
      const response = await fetch("/api/mother-together/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          source: "simulation_3d_voice",
          audience: "hub",
          careLogId: createCareLogId(),
          pregnancyStatus: getPregnancyStatusFromUrl(),
        }),
      });
      const data = (await response.json()) as ExecuteResponse;

      if (!response.ok || !data.success) {
        returnToWake(data.error ?? "지금은 케어 모드를 실행하기 어려워요.");
        return;
      }

      const routine = resolveRoutineMode(data.mode, text);
      if (routine) {
        onRunRoutine(routine);
      } else {
        onResponse(data.reply);
      }

      setNotice(`${data.modeLabel}로 바꿨어요. 이후 다시 '하이 엘지'라고 부르면 들을게요.`);
      playResponseAudio(data.audioBase64);
    } catch (error) {
      console.warn("[3d voice hub] care execution failed:", error);
      returnToWake("케어 실행 중 문제가 생겼어요. 잠시 후 다시 불러주세요.");
    }
  }

  function returnToWake(message: string) {
    clearTimers();
    stopRecognition();
    setPhase("wake");
    setNotice(message);
    window.setTimeout(() => {
      if (!disposedRef.current && !isRoutineRunning) startWakeListening();
    }, 900);
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

function speakKorean(text: string) {
  return new Promise<void>((resolve) => {
    if (!("speechSynthesis" in window)) {
      resolve();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ko-KR";
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    window.setTimeout(resolve, 1400);
  });
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

function createCareLogId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `simulation-3d-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
