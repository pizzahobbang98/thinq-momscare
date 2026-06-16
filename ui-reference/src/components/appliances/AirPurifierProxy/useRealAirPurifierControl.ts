import type { AirPurifierLevel } from "../../../types/applianceTypes";

export async function turnOnAirPurifier(level: Exclude<AirPurifierLevel, "off">) {
  console.log(`Real air purifier ON: ${level}`);
}

export async function setAirPurifierMode(level: Exclude<AirPurifierLevel, "off">) {
  console.log(`Real air purifier mode: ${level}`);
}

export async function turnOffAirPurifier() {
  console.log("Real air purifier OFF");
}
