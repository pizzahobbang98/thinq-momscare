import { useMemo, useState } from "react";
import { ChevronLeft, Mic, Bell, Check, Link2 } from "lucide-react";
import { useAppStore, defaultProfile } from "../store";
import {
  APPLIANCE_OPTIONS,
  CONCERN_OPTIONS,
  babyMonths,
  dueDateFromWeek,
  fmtKorean,
  fruitForWeek,
  type Profile,
  type Role,
  type Stage,
} from "../data";

type StepKey =
  | "permission"
  | "role"
  | "names"
  | "stage"
  | "detail"
  | "concerns"
  | "spouse"
  | "appliances";

const STEPS: StepKey[] = [
  "permission",
  "role",
  "names",
  "stage",
  "detail",
  "concerns",
  "spouse",
  "appliances",
];

export function OnboardingScreen() {
  const { completeOnboarding } = useAppStore();
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<Profile>({ ...defaultProfile });

  const step = STEPS[stepIndex];
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  function patch(p: Partial<Profile>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  function next() {
    if (stepIndex === STEPS.length - 1) {
      completeOnboarding(draft);
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  function back() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  const canNext = useMemo(() => {
    if (step === "role") return Boolean(draft.role);
    if (step === "names") return draft.momName.trim() !== "" && draft.dadName.trim() !== "";
    return true;
  }, [step, draft]);

  return (
    <div className="onboarding">
      <header className="onboarding-head">
        {stepIndex > 0 ? (
          <button className="ghost-icon" onClick={back} aria-label="이전">
            <ChevronLeft size={22} />
          </button>
        ) : (
          <span className="ghost-icon" />
        )}
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="progress-step">
          {stepIndex + 1}/{STEPS.length}
        </span>
      </header>

      <div className="onboarding-body">
        {step === "permission" && <PermissionStep draft={draft} patch={patch} />}
        {step === "role" && <RoleStep draft={draft} patch={patch} />}
        {step === "names" && <NamesStep draft={draft} patch={patch} />}
        {step === "stage" && <StageStep draft={draft} patch={patch} />}
        {step === "detail" && <DetailStep draft={draft} patch={patch} />}
        {step === "concerns" && <ConcernsStep draft={draft} patch={patch} />}
        {step === "spouse" && <SpouseStep draft={draft} patch={patch} />}
        {step === "appliances" && <AppliancesStep draft={draft} patch={patch} />}
      </div>

      <footer className="onboarding-foot">
        <button className="primary-button" disabled={!canNext} onClick={next}>
          {stepIndex === STEPS.length - 1 ? "맘스케어 시작하기" : "다음"}
        </button>
      </footer>
    </div>
  );
}

type StepProps = { draft: Profile; patch: (p: Partial<Profile>) => void };

function PermissionStep({ draft, patch }: StepProps) {
  return (
    <>
      <h2 className="onboarding-title">
        맘스케어가
        <br />
        함께하려면 허락이 필요해요
      </h2>
      <p className="onboarding-sub">음성허브와 알림을 위해 권한을 허용해주세요.</p>
      <button
        className={`permission-card${draft.allowMic ? " on" : ""}`}
        onClick={() => patch({ allowMic: !draft.allowMic })}
      >
        <span className="permission-icon">
          <Mic size={22} />
        </span>
        <span className="permission-text">
          <strong>마이크</strong>
          <em>음성허브로 AI에게 말을 걸 수 있어요</em>
        </span>
        <span className="permission-check">{draft.allowMic && <Check size={18} />}</span>
      </button>
      <button
        className={`permission-card${draft.allowNotification ? " on" : ""}`}
        onClick={() => patch({ allowNotification: !draft.allowNotification })}
      >
        <span className="permission-icon">
          <Bell size={22} />
        </span>
        <span className="permission-text">
          <strong>알림</strong>
          <em>검진·홈케어·배우자 소식을 알려드려요</em>
        </span>
        <span className="permission-check">{draft.allowNotification && <Check size={18} />}</span>
      </button>
    </>
  );
}

function RoleStep({ draft, patch }: StepProps) {
  const roles: Array<{ key: Role; emoji: string; title: string; desc: string }> = [
    { key: "mom", emoji: "🤰", title: "엄마", desc: "내 몸과 마음을 돌보는 케어를 받아요" },
    { key: "dad", emoji: "👨", title: "아빠", desc: "아내의 오늘을 이해하고 함께해요" },
  ];
  return (
    <>
      <h2 className="onboarding-title">어떤 역할로 시작할까요?</h2>
      <p className="onboarding-sub">역할에 따라 홈 화면과 케어 정보가 달라져요.</p>
      <div className="role-grid">
        {roles.map((r) => (
          <button
            key={r.key}
            className={`role-card${draft.role === r.key ? " selected" : ""}`}
            onClick={() => patch({ role: r.key })}
          >
            <span className="role-emoji">{r.emoji}</span>
            <strong>{r.title}</strong>
            <em>{r.desc}</em>
          </button>
        ))}
      </div>
    </>
  );
}

function NamesStep({ draft, patch }: StepProps) {
  return (
    <>
      <h2 className="onboarding-title">서로를 뭐라고 부를까요?</h2>
      <p className="onboarding-sub">앱 곳곳에서 따뜻하게 불러드릴게요.</p>
      <label className="field">
        <span>엄마 이름 (호칭)</span>
        <input
          value={draft.momName}
          onChange={(e) => patch({ momName: e.target.value })}
          placeholder="예: 지우"
        />
      </label>
      <label className="field">
        <span>아빠 이름 (호칭)</span>
        <input
          value={draft.dadName}
          onChange={(e) => patch({ dadName: e.target.value })}
          placeholder="예: 현수"
        />
      </label>
    </>
  );
}

function StageStep({ draft, patch }: StepProps) {
  const stages: Array<{ key: Stage; emoji: string; title: string; desc: string }> = [
    { key: "prep", emoji: "🌱", title: "임신준비", desc: "생리주기 · 검진 · 부부 준비" },
    { key: "pregnancy", emoji: "🤍", title: "임신중", desc: "주차별 아기 성장 · 입덧 케어" },
    { key: "parenting", emoji: "🍼", title: "육아중", desc: "수유 · 수면 · 예방접종 루틴" },
  ];
  return (
    <>
      <h2 className="onboarding-title">지금 어느 단계인가요?</h2>
      <p className="onboarding-sub">단계에 맞춰 홈 화면이 달라져요.</p>
      <div className="stage-list">
        {stages.map((s) => (
          <button
            key={s.key}
            className={`stage-card${draft.stage === s.key ? " selected" : ""}`}
            onClick={() => patch({ stage: s.key })}
          >
            <span className="stage-emoji">{s.emoji}</span>
            <span className="stage-text">
              <strong>{s.title}</strong>
              <em>{s.desc}</em>
            </span>
            {draft.stage === s.key && <Check size={18} className="stage-check" />}
          </button>
        ))}
      </div>
    </>
  );
}

function DetailStep({ draft, patch }: StepProps) {
  if (draft.stage === "prep") {
    return (
      <>
        <h2 className="onboarding-title">주기를 알려주세요</h2>
        <p className="onboarding-sub">생리주기와 검진 일정으로 캘린더를 만들어드려요.</p>
        <label className="field">
          <span>마지막 생리 시작일</span>
          <input
            type="date"
            value={draft.lastPeriodStart}
            onChange={(e) => patch({ lastPeriodStart: e.target.value })}
          />
        </label>
        <div className="field-row">
          <Stepper
            label="생리 주기"
            value={draft.cycleLength}
            min={21}
            max={40}
            suffix="일"
            onChange={(v) => patch({ cycleLength: v })}
          />
          <Stepper
            label="생리 기간"
            value={draft.periodLength}
            min={2}
            max={8}
            suffix="일"
            onChange={(v) => patch({ periodLength: v })}
          />
        </div>
        <label className="field">
          <span>다음 병원 검진일</span>
          <input
            type="date"
            value={draft.checkupDate}
            onChange={(e) => patch({ checkupDate: e.target.value })}
          />
        </label>
      </>
    );
  }

  if (draft.stage === "pregnancy") {
    const fruit = fruitForWeek(draft.pregnancyWeek);
    return (
      <>
        <h2 className="onboarding-title">몇 주차인가요?</h2>
        <p className="onboarding-sub">주차에 맞는 아기 성장 정보를 보여드려요.</p>
        <div className="week-preview">
          <span className="week-fruit">{fruit.emoji}</span>
          <strong>{draft.pregnancyWeek}주차</strong>
          <em>
            지금 아기는 {fruit.fruit}만 해요 · {fruit.size}
          </em>
        </div>
        <input
          className="week-slider"
          type="range"
          min={4}
          max={40}
          value={draft.pregnancyWeek}
          onChange={(e) => patch({ pregnancyWeek: Number(e.target.value) })}
        />
        <p className="field-hint">출산 예정일 약 {fmtKorean(dueDateFromWeek(draft.pregnancyWeek))}</p>
      </>
    );
  }

  const months = babyMonths(draft.babyBirth);
  return (
    <>
      <h2 className="onboarding-title">아이를 소개해주세요</h2>
      <p className="onboarding-sub">월령에 맞는 돌봄 루틴을 준비할게요.</p>
      <label className="field">
        <span>아이 이름 (태명)</span>
        <input
          value={draft.babyName}
          onChange={(e) => patch({ babyName: e.target.value })}
          placeholder="예: 봄이"
        />
      </label>
      <label className="field">
        <span>아이 생년월일</span>
        <input
          type="date"
          value={draft.babyBirth}
          onChange={(e) => patch({ babyBirth: e.target.value })}
        />
      </label>
      <p className="field-hint">지금 생후 {months}개월이에요.</p>
    </>
  );
}

function ConcernsStep({ draft, patch }: StepProps) {
  const options = CONCERN_OPTIONS[draft.stage];
  function toggle(item: string) {
    patch({
      concerns: draft.concerns.includes(item)
        ? draft.concerns.filter((c) => c !== item)
        : [...draft.concerns, item],
    });
  }
  return (
    <>
      <h2 className="onboarding-title">요즘 어떤 점이 신경 쓰이나요?</h2>
      <p className="onboarding-sub">선택한 관심사에 맞춰 케어 팁을 골라드려요.</p>
      <div className="chip-grid">
        {options.map((c) => (
          <button
            key={c}
            className={`select-chip${draft.concerns.includes(c) ? " selected" : ""}`}
            onClick={() => toggle(c)}
          >
            {c}
          </button>
        ))}
      </div>
    </>
  );
}

function SpouseStep({ draft, patch }: StepProps) {
  const code = draft.role === "mom" ? "MOM-2618" : "DAD-2618";
  return (
    <>
      <h2 className="onboarding-title">배우자와 연결해요</h2>
      <p className="onboarding-sub">
        연결하면 {draft.role === "mom" ? "아빠 앱에 아빠손길이" : "엄마 앱에 엄마품이"} 열려요.
      </p>
      <div className="invite-card">
        <span className="invite-label">내 초대 코드</span>
        <strong className="invite-code">{code}</strong>
        <em>배우자 앱에서 이 코드를 입력하면 연결돼요</em>
      </div>
      <button
        className={`connect-button${draft.spouseConnected ? " connected" : ""}`}
        onClick={() => patch({ spouseConnected: !draft.spouseConnected })}
      >
        <Link2 size={18} />
        {draft.spouseConnected
          ? `${draft.role === "mom" ? draft.dadName : draft.momName} 님과 연결됐어요`
          : "연결 완료하기 (시연)"}
      </button>
    </>
  );
}

function AppliancesStep({ draft, patch }: StepProps) {
  function toggle(id: string) {
    patch({
      appliances: draft.appliances.includes(id)
        ? draft.appliances.filter((a) => a !== id)
        : [...draft.appliances, id],
    });
  }
  return (
    <>
      <h2 className="onboarding-title">집에 어떤 가전이 있나요?</h2>
      <p className="onboarding-sub">선택한 가전이 홈케어 모드에 연결돼요.</p>
      <div className="appliance-grid">
        {APPLIANCE_OPTIONS.map((a) => (
          <button
            key={a.id}
            className={`appliance-card${draft.appliances.includes(a.id) ? " selected" : ""}`}
            onClick={() => toggle(a.id)}
          >
            <span className="appliance-emoji">{a.icon}</span>
            <span>{a.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="stepper-field">
      <span>{label}</span>
      <div className="stepper">
        <button onClick={() => onChange(Math.max(min, value - 1))}>−</button>
        <strong>
          {value}
          {suffix}
        </strong>
        <button onClick={() => onChange(Math.min(max, value + 1))}>+</button>
      </div>
    </div>
  );
}
