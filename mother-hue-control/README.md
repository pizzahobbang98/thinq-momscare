# MotherTogether Hue Control

Philips Hue Bridge 없이 Hue Bluetooth 전구를 제어하기 위한 로컬 FastAPI 실험 서버입니다.
기존 MotherTogether / ThinQ Play 프로젝트 파일은 건드리지 않고, 이 폴더 안에서만 실행합니다.

## 요구 환경

- Windows 노트북 Bluetooth
- Python 3.11 권장
- Philips Hue Bluetooth 전구
- 1순위 백엔드: Home Assistant Hue BLE integration
- 2순위 백엔드: HueBLE 직접 제어

현재 HueBLE 직접 제어는 전구 페어링/인증 상태에 따라 `AuthenticationFailed`, `PairingError`, 권한 오류가 날 수 있습니다. 그 경우 Home Assistant 백엔드가 더 안정적인 우회 경로입니다.

## 설치

```powershell
cd mother-hue-control
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
```

이 PC에 Python 3.11이 없다면 `py -0p`로 설치된 버전을 확인한 뒤 가능한 버전으로 가상환경을 만들 수 있습니다. HueBLE가 불안정하면 Python 3.11 설치를 권장합니다.

## Hue 앱 준비

1. Hue 앱에서 전구가 Bluetooth로 정상 제어되는지 확인합니다.
2. Hue 앱 > Settings > Voice Assistants > Google Home 또는 Alexa > Make Discoverable을 누릅니다.
3. 휴대폰 Bluetooth를 끄고 Hue 앱을 완전히 종료합니다.
4. Windows Bluetooth 설정에서 기존 Philips Hue / Hue color lamp 장치를 제거합니다.
5. 노트북을 전구 1m 안쪽에 둡니다.

## Home Assistant 방식

`.env`를 아래처럼 설정합니다.

```dotenv
MOTHER_TOGETHER_API_KEY=mt_demo_api_key
LIGHT_BACKEND=home_assistant
HA_URL=http://localhost:8123
HA_TOKEN=replace_with_home_assistant_long_lived_access_token
HA_ENTITY_ID=light.hue_color_lamp
```

Home Assistant에서 Long-Lived Access Token을 발급하고 Philips Hue BLE integration으로 전구를 먼저 추가해 둡니다.

## HueBLE 직접 방식

`.env`를 아래처럼 설정합니다.

```dotenv
MOTHER_TOGETHER_API_KEY=mt_demo_api_key
LIGHT_BACKEND=hueble
HUE_BLE_ADDRESS=replace_with_scan_address
BLE_SCAN_TIMEOUT=10
HUE_BLE_AUTO_PAIR=true
```

먼저 서버를 켠 뒤 스캔 API로 주소를 찾습니다.

```powershell
$headers = @{ "Authorization" = "Bearer mt_demo_api_key" }
Invoke-RestMethod -Method Get -Uri "http://localhost:8000/api/v1/light/scan" -Headers $headers
```

반환된 `address`를 `.env`의 `HUE_BLE_ADDRESS`에 넣고 서버를 다시 시작합니다.
Windows에서는 `HUE_BLE_AUTO_PAIR=true`가 기본값이며, 첫 제어 호출 전에 Bleak으로 pairing을 한 번 시도합니다.

## 실행

```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## 테스트

```powershell
.\test_commands.ps1
```

포트 8000이 이미 사용 중이면 다른 포트로 실행하고 테스트 스크립트에도 같은 값을 넘깁니다.

```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8001
.\test_commands.ps1 -Port 8001
```

또는 개별 호출:

```powershell
$headers = @{ "Authorization" = "Bearer mt_demo_api_key" }
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/v1/light/nausea-care" -Headers $headers
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/v1/light/off" -Headers $headers
```

## API

- `GET /health`
- `GET /api/v1/light/scan`
- `POST /api/v1/light/on`
- `POST /api/v1/light/off`
- `POST /api/v1/light/nausea-care`
- `POST /api/v1/light/sleep-care`
- `POST /api/v1/light/vacation-mode`
- `POST /api/v1/light/chores-care`
- `POST /api/v1/light/mode`
- `POST /api/v1/light/{mode}`

모든 `/api/v1/light/*` 엔드포인트는 아래 헤더가 필요합니다.

```text
Authorization: Bearer mt_demo_api_key
```

## 모드

모든 모드는 시연용으로 최대 밝기를 사용합니다. Home Assistant backend는 `brightness: 255`, HueBLE backend는 내부에서 254 스케일로 제한됩니다. `gradient` 효과는 기준색 주변의 비슷한 색상 10개를 500~800ms 간격으로 1회 순차 적용하고 마지막 색상을 유지합니다.

- `default`: RGB `[122, 74, 0]`, HEX `#7A4A00`
- `nausea-care`: RGB `[0, 184, 255]`, HEX `#00B8FF`
- `sleep-care`: RGB `[91, 31, 255]`, HEX `#5B1FFF`
- `chores-care`: RGB `[166, 255, 0]`, HEX `#A6FF00`
- `vacation-ocean`: RGB `[0, 194, 168]`, HEX `#00C2A8`
- `vacation-forest`: RGB `[0, 122, 42]`, HEX `#007A2A`
- `vacation-city`: RGB `[161, 0, 255]`, HEX `#A100FF`
- `condition-balance`: RGB `[255, 138, 0]`, HEX `#FF8A00`
- `sleep-rhythm`: RGB `[0, 60, 255]`, HEX `#003CFF`
- `mood-refresh`: RGB `[255, 204, 0]`, HEX `#FFCC00`
- `rest-prepare`: RGB `[255, 78, 66]`, HEX `#FF4E42`
- `couple-dinner`: RGB `[196, 0, 75]`, HEX `#C4004B`

`vacation-mode`는 기존 호환 alias이며 기본적으로 `vacation-ocean`으로 처리합니다. `default`, `idle`, `base`, `standby`는 브론즈 대기 조명 `#7A4A00`으로 처리합니다. `none`은 조명 제어 없이 no-op으로 응답합니다.

## Next.js 앱 연동

브라우저에서 `http://localhost:8000`을 직접 호출하지 않습니다. QR 시연에서 휴대폰의 `localhost`는 휴대폰 자신을 가리키기 때문입니다. Next.js 앱이 서버 route `POST /api/hue-local/mode`로 중계하고, Next.js 서버가 이 FastAPI 서버를 호출합니다.

Next.js 앱 루트의 `.env.local`에 아래 값을 둡니다.

```dotenv
HUE_LOCAL_ENABLED=true
MOTHER_HUE_CONTROL_URL=http://127.0.0.1:8000
MOTHER_HUE_CONTROL_API_KEY=mt_demo_api_key
```

FastAPI 실행:

```powershell
cd mother-hue-control
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Next.js 중계 API 테스트:

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/hue-local/mode" -ContentType "application/json" -Body '{"mode":"destination_city","effect":"gradient","source":"manual"}'
```

로컬 시연은 Next.js 앱과 `mother-hue-control` FastAPI 서버가 같은 Windows 노트북에서 실행될 때 가장 안정적입니다. Vercel 배포 서버에서는 `http://127.0.0.1:8000`이 사용자 노트북이 아니라 Vercel 서버 자신을 의미하므로 이 방식으로 전구에 직접 접근할 수 없습니다. QR 시연은 노트북에서 Next.js 앱을 실행하고, 휴대폰은 같은 Wi-Fi에서 노트북 IP로 접속하는 구성이 안전합니다.

권장 테스트 순서:

1. FastAPI `GET /health` 확인
2. Next.js 앱 실행
3. 수동제어에서 입덧/수면/가사/바다/숲/도시/임신준비 모드 테스트
4. 음성 인식으로 동일 모드 테스트
5. Hue 서버가 꺼져 있어도 앱 기능이 깨지지 않는지 확인

## AuthenticationFailed 해결 순서

1. Hue 앱에서 전구가 정상 제어되는지 확인합니다.
2. Hue 앱 > Settings > Voice Assistants > Google Home 또는 Alexa > Make Discoverable을 누릅니다.
3. 휴대폰 Bluetooth를 끕니다.
4. Windows Bluetooth 설정에서 기존 Hue 장치를 제거합니다.
5. 노트북을 전구 1m 안쪽에 둔 뒤 다시 시도합니다.
6. 계속 실패하면 `LIGHT_BACKEND=home_assistant`로 전환합니다.

발표에서는 "Hue Bridge 없이 Bluetooth 기반 로컬 제어 서버를 구성하고, MotherTogether API key 호출로 조명을 자동 제어했습니다"라고 설명하면 됩니다.
