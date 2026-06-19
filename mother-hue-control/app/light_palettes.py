from __future__ import annotations

HUE_COLOR_CYCLE_STEP_MS = 2000
HUE_COLOR_CYCLE_SECONDS = HUE_COLOR_CYCLE_STEP_MS / 1000

HUE_MODE_PALETTES: dict[str, tuple[str, ...]] = {
    "default": ("#7A4A00", "#94611A", "#B27D35", "#CEA15D", "#E4C98E", "#F6E8C8"),
    "condition-balance": ("#FF8A00", "#FFA126", "#FFB84D", "#FFCC73", "#FFE0A3", "#FFF0CC"),
    "sleep-rhythm": ("#003CFF", "#2F62FF", "#5A82FF", "#82A1FF", "#ADC2FF", "#D8E2FF"),
    "mood-refresh": ("#FFCC00", "#FFD52E", "#FFDE5C", "#FFE789", "#FFF0B5", "#FFF9E0"),
    "rest-prepare": ("#FF4E42", "#FF6A5F", "#FF887D", "#FFA69C", "#FFC5BE", "#FFE4E0"),
    "couple-dinner": ("#C4004B", "#D22B66", "#DE5781", "#E9829D", "#F2ADBA", "#F9D8DF"),
    "nausea-care": ("#00B8FF", "#22C4FF", "#4DD0FF", "#78DBFF", "#A8E9FF", "#D7F6FF"),
    "sleep-care": ("#5B1FFF", "#6F3AFF", "#8557FF", "#9C78FF", "#BBA5FF", "#DDD2FF"),
    "chores-care": ("#A6FF00", "#B8FF2E", "#C9FF5C", "#D8FF87", "#E6FFB3", "#F3FFD9"),
    "vacation-ocean": ("#00C2A8", "#24CCB6", "#4BD8C5", "#79E4D6", "#A9F0E7", "#D9FBF7"),
    "vacation-forest": ("#007A2A", "#1E9142", "#46A864", "#73C188", "#A4DAB2", "#D6F0DA"),
    "vacation-city": ("#A100FF", "#AE26FF", "#BD52FF", "#CE7DFF", "#DFAAFF", "#F0D6FF"),
}

HUE_SOLID_MODE_KEYS = frozenset(HUE_MODE_PALETTES)


def hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    value = hex_color.strip().lstrip("#")
    if len(value) != 6:
        raise ValueError(f"Invalid hex color: {hex_color}")
    return tuple(int(value[index : index + 2], 16) for index in (0, 2, 4))
