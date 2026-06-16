import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { DeviceStatusMini } from "./components/ui/DeviceStatusMini";
import { SceneCameraController } from "./components/scene/SceneCameraController";
import { SceneLighting } from "./components/scene/SceneLighting";
import { SmartRoomScene } from "./components/scene/SmartRoomScene";
import { HubResponseBubble } from "./components/hub/HubResponseBubble";
import { VoiceHubController } from "./components/hub/VoiceHubController";
import { useSceneStore } from "./store/sceneStore";
import { getLightingPalette } from "./components/scene/lightingPalette";
import { useEffect } from "react";
import type { DemoMode } from "./types/demoTypes";

const voiceAgentRoutineModes: Array<Exclude<DemoMode, "idle">> = [
  "nausea_food",
  "sleep_care",
  "housework_care",
  "destination_forest",
  "destination_ocean",
  "destination_city",
];

function toggleFullscreen() {
  if (document.fullscreenElement) {
    void document.exitFullscreen();
  } else {
    void document.documentElement.requestFullscreen?.();
  }
}

export function App() {
  const demo = useSceneStore();
  const { reset, runRoutine, setAgentResponse, setHubListening, setHubThinking } = demo;
  const lighting = getLightingPalette(demo.sceneState.ceilingLight);

  useEffect(() => {
    function onAgentResponse(event: Event) {
      const detail = (event as CustomEvent<{ message?: string; text?: string }>).detail;
      const message = detail?.message ?? detail?.text;
      if (message) setAgentResponse(message);
    }

    function onAgentRoutine(event: Event) {
      const detail = (event as CustomEvent<{ mode?: DemoMode }>).detail;
      const mode = detail?.mode;
      if (mode && voiceAgentRoutineModes.includes(mode as Exclude<DemoMode, "idle">)) {
        runRoutine(mode as Exclude<DemoMode, "idle">);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat) return;
      if (event.key.toLowerCase() === "f") toggleFullscreen();
    }

    // 맘스케어 앱(app.html)의 음성허브에서 보내는 루틴 실행 브리지
    const hubChannel = new BroadcastChannel("momscare-hub");
    hubChannel.onmessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; mode?: DemoMode; message?: string };
      if (data?.type === "routine" && data.mode && data.mode !== "idle") {
        if (voiceAgentRoutineModes.includes(data.mode as Exclude<DemoMode, "idle">)) {
          runRoutine(data.mode as Exclude<DemoMode, "idle">);
        }
      } else if (data?.type === "response" && data.message) {
        setAgentResponse(data.message);
      } else if (data?.type === "reset") {
        reset();
      }
    };

    window.addEventListener("voice-agent-response", onAgentResponse);
    window.addEventListener("voice-agent-routine", onAgentRoutine);
    window.addEventListener("voice-agent-reset", reset);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      hubChannel.close();
      window.removeEventListener("voice-agent-response", onAgentResponse);
      window.removeEventListener("voice-agent-routine", onAgentRoutine);
      window.removeEventListener("voice-agent-reset", reset);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [reset, runRoutine, setAgentResponse]);

  return (
    <main className="app-shell">
      <Canvas
        shadows
        camera={{ position: [0.2, 1.62, 6.6], fov: 42 }}
        className="scene-canvas"
      >
        <color attach="background" args={[lighting.background]} />
        <fog attach="fog" args={[lighting.background, 5.4, 11]} />
        <SceneLighting ceilingLight={demo.sceneState.ceilingLight} />
        <SmartRoomScene state={demo.sceneState} />
        <Environment preset="studio" environmentIntensity={0.28} />
        <SceneCameraController />
      </Canvas>
      <HubResponseBubble
        message={demo.sceneState.hub.message}
        active={demo.sceneState.hub.thinking || demo.sceneState.hub.speaking}
      />
      <VoiceHubController
        isRoutineRunning={demo.sceneState.isRoutineRunning}
        onRunRoutine={runRoutine}
        onListening={setHubListening}
        onThinking={setHubThinking}
        onResponse={setAgentResponse}
      />
      {demo.sceneState.debugMode && <DeviceStatusMini state={demo.sceneState} />}
    </main>
  );
}
