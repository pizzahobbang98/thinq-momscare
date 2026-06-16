import { useEffect, useRef, useState } from "react";
import type { DemoMode } from "../../types/demoTypes";

type RoutineMode = Exclude<DemoMode, "idle">;
type VoicePhase = "idle" | "recording" | "analyzing" | "executing" | "failed";

type VoiceApiResponse = {
  success?: boolean;
  transcript?: string;
  message?: string;
  error?: string;
};

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
  onListening: (message: string) => void;
  onThinking: (message: string) => void;
  onResponse: (message: string) => void;
};

const WAKE_WORDS = ["하이 씽큐", "하이싱큐", "하이 thinq", "하이 thin q", "허브야", "엄마케어"];

export function VoiceHubController({
  isRoutineRunning,
  onRunRoutine,
  onListening,
  onThinking,
  onResponse,
}: VoiceHubControllerProps) {
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [notice, setNotice] = useState("중앙 허브를 누르고 '하이 씽큐, 오늘 상태는 ...'이라고 말해보세요.");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopTimerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      clearStopTimer();
      stopStream();
      audioRef.current?.pause();
    };
  }, []);

  async function startRecording() {
    if (phase !== "idle" || isRoutineRunning) return;

    if (
      typeof window === "undefined" ||
      typeof MediaRecorder === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      fail("이 브라우저에서는 음성 인식을 사용할 수 없어요.");
      return;
    }

    try {
      audioRef.current?.pause();
      chunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : undefined;
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      streamRef.current = stream;
      recorderRef.current = recorder;
      setPhase("recording");
      setNotice("듣고 있어요. 상태를 말한 뒤 잠시 기다려주세요.");
      onListening("듣고 있어요.\n'하이 씽큐' 다음에 지금 상태를 말하면 케어 모드로 바꿔드릴게요.");

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        clearStopTimer();
        stopStream();
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size < 1200) {
          fail("녹음이 너무 짧았어요. 다시 눌러 말해주세요.");
          return;
        }
        void processVoice(blob);
      };

      recorder.onerror = () => {
        fail("녹음 중 문제가 생겼어요. 다시 시도해주세요.");
      };

      recorder.start();
      stopTimerRef.current = window.setTimeout(() => stopRecording(), 5200);
    } catch (error) {
      console.warn("[3d voice hub] recording start failed:", error);
      fail("마이크 권한을 허용한 뒤 다시 시도해주세요.");
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }

  async function processVoice(blob: Blob) {
    setPhase("analyzing");
    setNotice("음성을 분석하고 있어요.");
    onThinking("말씀하신 상태를 확인하고 있어요.\n맞는 케어 환경을 찾는 중입니다.");

    try {
      const formData = new FormData();
      formData.append("audio", blob, "simulation-3d-voice.webm");

      const voiceResponse = await fetch("/api/voice", {
        method: "POST",
        body: formData,
      });
      const voiceData = (await voiceResponse.json()) as VoiceApiResponse;
      const transcript = voiceData.transcript?.trim();

      if (!voiceResponse.ok || !transcript) {
        fail(voiceData.message ?? voiceData.error ?? "음성을 알아듣지 못했어요. 다시 말해주세요.");
        return;
      }

      if (!hasWakeWord(transcript)) {
        setPhase("idle");
        setNotice("시작어가 필요해요. '하이 씽큐, 오늘 입덧이 심해'처럼 말해주세요.");
        onResponse("아직 대기 상태예요.\n'하이 씽큐'라고 부른 뒤 지금 상태를 말하면 케어를 시작할게요.");
        return;
      }

      await executeCare(stripWakeWord(transcript), transcript);
    } catch (error) {
      console.warn("[3d voice hub] voice processing failed:", error);
      fail("음성 처리 중 문제가 생겼어요. 다시 시도해주세요.");
    }
  }

  async function executeCare(text: string, originalTranscript: string) {
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
        fail(data.error ?? "지금은 케어 모드를 실행하기 어려워요.");
        return;
      }

      const routine = resolveRoutineMode(data.mode, originalTranscript);
      if (routine) {
        onRunRoutine(routine);
      } else {
        onResponse(data.reply);
      }

      setNotice(`${data.modeLabel}로 바꿨어요.`);
      setPhase("idle");
      playResponseAudio(data.audioBase64);
    } catch (error) {
      console.warn("[3d voice hub] care execution failed:", error);
      fail("케어 실행 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.");
    }
  }

  function fail(message: string) {
    clearStopTimer();
    stopStream();
    setPhase("failed");
    setNotice(message);
    onResponse(`${message}\n기본 대기 상태는 유지할게요.`);
    window.setTimeout(() => setPhase("idle"), 900);
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

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }

  function clearStopTimer() {
    if (stopTimerRef.current !== null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  }

  const isBusy = phase !== "idle" || isRoutineRunning;
  const buttonLabel =
    phase === "recording"
      ? "듣는 중"
      : phase === "analyzing"
        ? "분석 중"
        : phase === "executing"
          ? "케어 실행 중"
          : "허브로 말하기";

  return (
    <div className="voice-hub-controller">
      <button
        type="button"
        className={`voice-hub-button${isBusy ? " active" : ""}`}
        disabled={isRoutineRunning || phase === "analyzing" || phase === "executing"}
        onClick={phase === "recording" ? stopRecording : startRecording}
        aria-label="3D 허브 음성 인식 시작"
      >
        <span className="voice-hub-dot" />
        {buttonLabel}
      </button>
      <p>{notice}</p>
    </div>
  );
}

function hasWakeWord(text: string) {
  const normalized = normalizeSpeechText(text);
  return WAKE_WORDS.some((word) => normalized.includes(normalizeSpeechText(word)));
}

function stripWakeWord(text: string) {
  let cleaned = text.trim();
  for (const word of WAKE_WORDS) {
    cleaned = cleaned.replace(new RegExp(word, "gi"), " ");
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
