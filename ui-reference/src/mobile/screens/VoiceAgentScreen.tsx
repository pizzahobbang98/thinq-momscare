import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useAppStore } from "../store";
import { matchScenario, VOICE_SCENARIOS, type VoiceScenario } from "../careModes";
import { CARE_MODE_LABEL } from "../data";

type AgentPhase = "idle" | "listening" | "analyzing" | "proposal" | "executing" | "done";

const PHASE_LABEL: Record<AgentPhase, string> = {
  idle: "대기 중",
  listening: "듣는 중",
  analyzing: "분석 중",
  proposal: "실행 제안",
  executing: "실행 중",
  done: "완료",
};

const PHASE_MESSAGE: Record<AgentPhase, string> = {
  idle: "말씀해 주세요.",
  listening: "듣고 있어요.",
  analyzing: "컨디션과 집안 상태를 함께 확인하고 있어요.",
  proposal: "",
  executing: "집안 가전을 조정하고 있어요.",
  done: "",
};

export function VoiceAgentScreen({ onClose }: { onClose: () => void }) {
  const { applyCareMode } = useAppStore();
  const [phase, setPhase] = useState<AgentPhase>("idle");
  const [utterance, setUtterance] = useState("");
  const [scenario, setScenario] = useState<VoiceScenario | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    channelRef.current = new BroadcastChannel("momscare-hub");
    return () => {
      channelRef.current?.close();
      recognitionRef.current?.stop();
      window.clearTimeout(timerRef.current);
    };
  }, []);

  const handleUtterance = useCallback((text: string) => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setUtterance(text);
    setScenario(matchScenario(text));
    setPhase("analyzing");
    timerRef.current = window.setTimeout(() => setPhase("proposal"), 1900);
  }, []);

  const startListening = useCallback(() => {
    setPhase("listening");
    // 브라우저 음성인식이 있으면 실제 마이크 사용, 없으면 예시 칩으로 진행
    const SR =
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition ??
      (window as unknown as Record<string, unknown>).SpeechRecognition;
    if (typeof SR === "function") {
      try {
        type Recognition = {
          lang: string;
          interimResults: boolean;
          onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
          onerror: () => void;
          start: () => void;
          stop: () => void;
        };
        const rec = new (SR as new () => Recognition)();
        rec.lang = "ko-KR";
        rec.interimResults = false;
        rec.onresult = (e) => {
          const text = e.results[0]?.[0]?.transcript ?? "";
          if (text) handleUtterance(text);
        };
        rec.onerror = () => {
          /* 칩 선택으로 계속 진행 가능 */
        };
        rec.start();
        recognitionRef.current = rec;
      } catch {
        /* noop */
      }
    }
  }, [handleUtterance]);

  const execute = useCallback(() => {
    if (!scenario) return;
    setPhase("executing");
    applyCareMode(scenario.careMode);
    // 3D 대시보드(별도 탭)로 루틴 실행 전달
    channelRef.current?.postMessage({ type: "routine", mode: scenario.dashboardMode });
    timerRef.current = window.setTimeout(() => setPhase("done"), 2400);
  }, [scenario, applyCareMode]);

  function cancel() {
    setPhase("idle");
    setUtterance("");
    setScenario(null);
  }

  const orbActive = phase === "listening" || phase === "analyzing" || phase === "executing";
  const waveActive = phase === "listening" || phase === "executing";

  return (
    <div className="voice-agent">
      <button className="agent-close" onClick={onClose} aria-label="닫기">
        <X size={22} />
      </button>

      <div className={`agent-status-pill phase-${phase}`}>{PHASE_LABEL[phase]}</div>

      {/* 중앙 AI 오브젝트 */}
      <button
        className={`agent-orb${orbActive ? " active" : ""}`}
        onClick={phase === "idle" ? startListening : undefined}
        aria-label="음성 명령 시작"
      >
        <span className="orb-core" />
        <span className="orb-ring ring-a" />
        <span className="orb-ring ring-b" />
        <span className="orb-ring ring-c" />
      </button>

      {/* 텍스트 영역 */}
      <div className="agent-text">
        {utterance && phase !== "idle" && phase !== "listening" && (
          <p className="agent-utterance">“{utterance}”</p>
        )}

        {phase === "proposal" && scenario ? (
          <>
            <p className="agent-intent">{scenario.intent}</p>
            <h3 className="agent-message">{scenario.proposal}</h3>
            <div className="agent-actions">
              <button className="agent-confirm" onClick={execute}>
                네, 실행해주세요
              </button>
              <button className="agent-cancel" onClick={cancel}>
                아니요
              </button>
            </div>
          </>
        ) : phase === "done" && scenario ? (
          <>
            <p className="agent-intent">{CARE_MODE_LABEL[scenario.careMode]} 모드 실행 완료</p>
            <h3 className="agent-message">{scenario.execMessage}</h3>
            <p className="agent-hint">엄마 앱 · 아빠 앱 · 3D 대시보드에 반영됐어요.</p>
            <div className="agent-actions">
              <button className="agent-confirm" onClick={onClose}>
                확인
              </button>
              <button className="agent-cancel" onClick={cancel}>
                다시 말하기
              </button>
            </div>
          </>
        ) : (
          <h3 className="agent-message">{PHASE_MESSAGE[phase]}</h3>
        )}

        {phase === "idle" && <p className="agent-hint">오브를 누르고 말해보세요</p>}

        {(phase === "idle" || phase === "listening") && (
          <div className="agent-chips">
            {VOICE_SCENARIOS.map((s) => (
              <button key={s.id} className="agent-chip" onClick={() => handleUtterance(s.utterance)}>
                “{s.utterance}”
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 하단 음성 파형 */}
      <div className={`agent-waveform${waveActive ? " active" : ""}`}>
        {Array.from({ length: 24 }).map((_, i) => (
          <span key={i} style={{ animationDelay: `${(i % 8) * 0.09}s` }} />
        ))}
      </div>
    </div>
  );
}
