import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useAppStore } from "../store";
import { CARE_MODE_LABEL, fruitForWeek, todayISO, type DayLog } from "../data";
import { dailyTipFor } from "../careTips";
import { SectionCard } from "../components/cards";

const ALBUMS = [
  { key: "prep", title: "준비 앨범", emoji: "🌱", count: 12, desc: "검사 · 준비 과정 · 부부 기록", gradient: "album-grad-prep" },
  { key: "ultra", title: "초음파 앨범", emoji: "🩻", count: 8, desc: "주차별 초음파 · 과일 크기 비교", gradient: "album-grad-ultra" },
  { key: "birth", title: "출산 앨범", emoji: "👶", count: 5, desc: "첫 만남 · 출산 기록", gradient: "album-grad-birth" },
  { key: "growth", title: "성장 앨범", emoji: "🧸", count: 24, desc: "월령별 사진 · 가족 사진", gradient: "album-grad-growth" },
];

const RECENT_PHOTOS = [
  { emoji: "🩻", label: "18주 초음파", tone: "p1" },
  { emoji: "🥭", label: "망고 비교샷", tone: "p2" },
  { emoji: "💑", label: "산책 데이트", tone: "p3" },
  { emoji: "🧦", label: "첫 아기양말", tone: "p4" },
  { emoji: "🛏️", label: "아기방 준비", tone: "p5" },
  { emoji: "📋", label: "검진 결과", tone: "p6" },
];

const MOOD_EMOJI: Record<string, string> = {
  good: "😊",
  soso: "🙂",
  tired: "😪",
  nausea: "🤢",
  hard: "😢",
};

export function RecordsScreen() {
  const [tab, setTab] = useState<"album" | "ailog">("album");

  return (
    <div className="records-screen">
      <header className="screen-title-row">
        <h2 className="screen-title">기록</h2>
      </header>

      <div className="segmented">
        <button className={tab === "album" ? "active" : ""} onClick={() => setTab("album")}>
          아기사진첩
        </button>
        <button className={tab === "ailog" ? "active" : ""} onClick={() => setTab("ailog")}>
          하루기록AI
        </button>
      </div>

      {tab === "album" ? <AlbumTab /> : <AiLogTab />}
    </div>
  );
}

function AlbumTab() {
  return (
    <>
      <div className="album-grid">
        {ALBUMS.map((a) => (
          <button key={a.key} className={`album-tile ${a.gradient}`}>
            <span className="album-emoji">{a.emoji}</span>
            <strong>{a.title}</strong>
            <em>{a.desc}</em>
            <span className="album-count">{a.count}장</span>
          </button>
        ))}
      </div>

      <SectionCard title="최근 기록">
        <div className="photo-grid">
          {RECENT_PHOTOS.map((p, i) => (
            <div key={i} className={`photo-tile tone-${p.tone}`}>
              <span className="photo-emoji">{p.emoji}</span>
              <em>{p.label}</em>
            </div>
          ))}
        </div>
      </SectionCard>
    </>
  );
}

function AiLogTab() {
  const { state, addDayLog } = useAppStore();
  const todayDone = state.dayLogs.some((l) => l.date === todayISO());

  function generate() {
    const log = buildTodayLog(state);
    addDayLog(log);
  }

  return (
    <>
      <button className="ai-generate-button" onClick={generate}>
        <Sparkles size={18} />
        {todayDone ? "오늘 기록 다시 만들기" : "오늘 하루를 AI 기록으로 정리하기"}
      </button>

      {state.dayLogs.length === 0 ? (
        <div className="empty-state">
          <span>📔</span>
          <p>
            아직 기록이 없어요.
            <br />
            오늘의 컨디션과 홈케어 결과를 AI가 하루 일기로 정리해드려요.
          </p>
        </div>
      ) : (
        state.dayLogs.map((log) => (
          <SectionCard key={log.id} className="daylog-card">
            <header className="daylog-head">
              <strong>{log.title}</strong>
              <span className="daylog-mood">{log.mood}</span>
            </header>
            <em className="daylog-date">{log.date}</em>
            <ul className="daylog-lines">
              {log.lines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </SectionCard>
        ))
      )}
    </>
  );
}

function buildTodayLog(state: ReturnType<typeof useAppStore>["state"]): Omit<DayLog, "id"> {
  const { profile, homeCare, condition, babyEvents, checklist } = state;
  const tip = dailyTipFor(profile);
  const mood = MOOD_EMOJI[condition] ?? "📝";
  const lines: string[] = [];

  if (profile.stage === "prep") {
    lines.push(`오늘은 ${tip.phaseLabel}이에요. ${tip.emotion}`);
    const done = Object.values(checklist).filter(Boolean).length;
    lines.push(`부부 준비 체크 ${done}개를 완료했어요.`);
  } else if (profile.stage === "pregnancy") {
    const fruit = fruitForWeek(profile.pregnancyWeek);
    lines.push(`임신 ${profile.pregnancyWeek}주차, 아기는 ${fruit.fruit}만큼 자랐어요 (${fruit.size}).`);
    lines.push(tip.emotion);
  } else {
    const feed = babyEvents.filter((e) => e.type === "feed").length;
    const sleep = babyEvents.filter((e) => e.type === "sleep").length;
    const diaper = babyEvents.filter((e) => e.type === "diaper").length;
    lines.push(`${profile.babyName} — 수유 ${feed}회 · 수면 ${sleep}회 · 기저귀 ${diaper}회를 기록했어요.`);
    lines.push(tip.emotion);
  }

  if (condition) {
    const condLabel: Record<string, string> = {
      good: "컨디션이 좋은 하루였어요.",
      soso: "무난한 하루를 보냈어요.",
      tired: "피로가 쌓인 하루였어요. 일찍 쉬어요.",
      nausea: "울렁거림이 있던 하루였어요.",
      hard: "조금 힘든 하루였어요. 내일은 더 가벼워질 거예요.",
    };
    lines.push(condLabel[condition]);
  }

  if (homeCare.mode !== "basic") {
    lines.push(`AI 허브가 ${CARE_MODE_LABEL[homeCare.mode]} 모드를 실행해 집안 환경을 조정했어요.`);
  }

  return {
    date: todayISO(),
    stage: profile.stage,
    title: "오늘의 하루기록",
    mood,
    lines,
  };
}
