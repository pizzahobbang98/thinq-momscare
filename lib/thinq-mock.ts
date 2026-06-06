export type ThinQCommand = 'NAUSEA_MODE' | 'SLEEP_MODE' | 'AIR_ON' | 'AIR_OFF'

export async function controlAirPurifier(command: ThinQCommand) {
  console.log(`[ThinQ Mock] 기기 제어: ${command}`)

  const mockStatus = {
    NAUSEA_MODE: { power: 'ON',  mode: 'TURBO',  pm25: 8  },
    SLEEP_MODE:  { power: 'ON',  mode: 'SLEEP',  pm25: 10 },
    AIR_ON:      { power: 'ON',  mode: 'NORMAL', pm25: 12 },
    AIR_OFF:     { power: 'OFF', mode: 'OFF',    pm25: 15 },
  }

  return {
    success:      true,
    mock:         true,
    command,
    deviceStatus: mockStatus[command],
  }
}