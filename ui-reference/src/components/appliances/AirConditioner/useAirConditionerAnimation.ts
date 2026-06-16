import { useEffect, useMemo, useRef, useState } from "react";
import type { ACMode, ACState } from "../../../types/appliance";
import { getModeConfig, idlePose } from "./airConditionerStates";

type UseACAnimationProps = {
  isOn: boolean;
  mode: ACMode;
  sequenceKey: number;
};

type RenderValues = typeof idlePose & {
  displayBrightness: number;
};

const initialValues: RenderValues = {
  ...idlePose,
  displayBrightness: 0,
};

export function useAirConditionerAnimation({
  isOn,
  mode,
  sequenceKey,
}: UseACAnimationProps) {
  const [state, setState] = useState<ACState>("idle");
  const [values, setValues] = useState<RenderValues>(initialValues);
  const valuesRef = useRef(values);
  const generationRef = useRef(0);

  const modeConfig = useMemo(() => getModeConfig(mode), [mode]);

  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  useEffect(() => {
    const generation = ++generationRef.current;

    if (isOn) {
      runPowerOn(generation);
      return;
    }

    runPowerOff(generation);
    return () => {
      generationRef.current++;
    };
  }, [isOn, mode, sequenceKey]);

  function patchValue(key: keyof RenderValues, value: number) {
    setValues((current) => {
      const next = { ...current, [key]: value };
      valuesRef.current = next;
      return next;
    });
  }

  function isCurrent(generation: number) {
    return generation === generationRef.current;
  }

  function schedule(generation: number, delay: number, callback: () => void) {
    window.setTimeout(() => {
      if (isCurrent(generation)) callback();
    }, delay);
  }

  function animateKey(
    generation: number,
    key: keyof RenderValues,
    to: number,
    duration: number,
    easing: (x: number) => number = easeOutCubic
  ) {
    const from = valuesRef.current[key];
    animateValue(
      (value) => {
        if (isCurrent(generation)) patchValue(key, value);
      },
      from,
      to,
      duration,
      easing
    );
  }

  function runPowerOn(generation: number) {
    setState("powering_on");
    animateKey(generation, "displayOpacity", 1, 400);
    animateKey(generation, "displayBrightness", modeConfig.displayBrightness, 400);
    animateKey(generation, "ledIntensity", 1, 400);

    schedule(generation, 400, () => {
      setState("flap_opening");
      animateKey(generation, "flapAngle", modeConfig.flapAngle, 800);
    });

    schedule(generation, 1200, () => {
      setState("louver_adjusting");
      animateLouverWithSettle(
        (value) => {
          if (isCurrent(generation)) patchValue("louverAngle", value);
        },
        valuesRef.current.louverAngle,
        modeConfig.louverAngle,
        900
      );
    });

    schedule(generation, 2100, () => {
      setState("airflow_active");
      animateKey(generation, "airflowOpacity", modeConfig.airflowOpacity, 700);
      animateKey(generation, "airflowSpeed", modeConfig.airflowSpeed, 700);
    });

    schedule(generation, 3000, () => {
      setState("running");
    });
  }

  function runPowerOff(generation: number) {
    if (state === "idle" && valuesRef.current.ledIntensity === 0) return;

    setState("powering_off");
    animateKey(generation, "airflowOpacity", 0, 500, easeInOutSine);
    animateKey(generation, "airflowSpeed", 0, 500, easeInOutSine);

    schedule(generation, 300, () => {
      animateKey(generation, "louverAngle", 0, 500, easeInOutSine);
    });

    schedule(generation, 700, () => {
      animateKey(generation, "flapAngle", 0, 700, easeInOutSine);
    });

    schedule(generation, 1400, () => {
      animateKey(generation, "displayOpacity", 0, 400, easeOutCubic);
      animateKey(generation, "displayBrightness", 0, 400, easeOutCubic);
      animateKey(generation, "ledIntensity", 0, 400, easeOutCubic);
    });

    schedule(generation, 1850, () => {
      setState("idle");
    });
  }

  return {
    state,
    ...values,
    temperature: modeConfig.temperature,
    airflowDirection: modeConfig.airflowDirection,
    swingRange: modeConfig.swingRange,
    isRunning: state === "running",
  };
}

function animateValue(
  setter: (value: number) => void,
  from: number,
  to: number,
  duration: number,
  easing: (x: number) => number
) {
  const start = performance.now();

  function update(now: number) {
    const progress = Math.min((now - start) / duration, 1);
    setter(from + (to - from) * easing(progress));

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

function animateLouverWithSettle(
  setter: (value: number) => void,
  from: number,
  target: number,
  duration: number
) {
  const start = performance.now();

  function update(now: number) {
    const progress = Math.min((now - start) / duration, 1);
    let value = from;

    if (progress < 0.45) {
      const p = progress / 0.45;
      value = from + (target * 0.7 - from) * easeInOutSine(p);
    } else if (progress < 0.75) {
      const p = (progress - 0.45) / 0.3;
      value = target * 0.7 + (target + 4 - target * 0.7) * easeOutCubic(p);
    } else {
      const p = (progress - 0.75) / 0.25;
      value = target + 4 + (target - (target + 4)) * easeInOutSine(p);
    }

    setter(value);

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

function easeInOutSine(x: number) {
  return -(Math.cos(Math.PI * x) - 1) / 2;
}

function easeOutCubic(x: number) {
  return 1 - Math.pow(1 - x, 3);
}
