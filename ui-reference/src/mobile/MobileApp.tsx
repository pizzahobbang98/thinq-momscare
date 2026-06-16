import { useEffect, useState, type JSX } from "react";
import { useAppStore } from "./store";
import { SplashScreen } from "./screens/SplashScreen";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { RecordsScreen } from "./screens/RecordsScreen";
import { HomeCareScreen } from "./screens/HomeCareScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { VoiceAgentScreen } from "./screens/VoiceAgentScreen";
import { BottomNav, type TabKey } from "./components/BottomNav";

export function MobileApp() {
  const { state } = useAppStore();
  const [splashDone, setSplashDone] = useState(false);
  const [tab, setTab] = useState<TabKey>("home");
  const [voiceOpen, setVoiceOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), 2600);
    return () => clearTimeout(timer);
  }, []);

  let content: JSX.Element;
  if (!splashDone) {
    content = <SplashScreen />;
  } else if (!state.profile.registered) {
    content = <OnboardingScreen />;
  } else {
    content = (
      <>
        <div className="screen-scroll">
          {tab === "home" && <HomeScreen onGoHomeCare={() => setTab("homecare")} />}
          {tab === "records" && <RecordsScreen />}
          {tab === "homecare" && <HomeCareScreen />}
          {tab === "settings" && <SettingsScreen />}
        </div>
        <BottomNav tab={tab} onTab={setTab} onVoice={() => setVoiceOpen(true)} />
        {voiceOpen && <VoiceAgentScreen onClose={() => setVoiceOpen(false)} />}
      </>
    );
  }

  return (
    <div className="phone-stage">
      <div className="phone-frame">
        <div className="phone-screen">{content}</div>
      </div>
    </div>
  );
}
