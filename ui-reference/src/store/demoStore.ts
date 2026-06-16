import { useCallback, useMemo, useState } from "react";
import type { ACMode } from "../types/appliance";

export function useDemoStore() {
  const [isOn, setIsOn] = useState(false);
  const [mode, setMode] = useState<ACMode>("default");
  const [sequenceKey, setSequenceKey] = useState(0);

  const runMode = useCallback((nextMode: ACMode) => {
    setMode(nextMode);
    setIsOn(true);
    setSequenceKey((key) => key + 1);
  }, []);

  const turnOff = useCallback(() => {
    setIsOn(false);
  }, []);

  const reset = useCallback(() => {
    setMode("default");
    setIsOn(false);
    setSequenceKey((key) => key + 1);
  }, []);

  return useMemo(
    () => ({ isOn, mode, sequenceKey, runMode, turnOff, reset }),
    [isOn, mode, sequenceKey, runMode, turnOff, reset]
  );
}
