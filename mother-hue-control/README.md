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

모든 `/api/v1/light/*` 엔드포인트는 아래 헤더가 필요합니다.

```text
Authorization: Bearer mt_demo_api_key
```

## 모드

- `nausea-care`: 부드러운 핑크, brightness 80, RGB `[251, 231, 238]`
- `sleep-care`: 따뜻한 2200K, brightness 35
- `vacation-mode`: 따뜻한 햇빛색, brightness 150, RGB `[255, 215, 181]`
- `chores-care`: 중립 백색 4000K, brightness 180

## AuthenticationFailed 해결 순서

1. Hue 앱에서 전구가 정상 제어되는지 확인합니다.
2. Hue 앱 > Settings > Voice Assistants > Google Home 또는 Alexa > Make Discoverable을 누릅니다.
3. 휴대폰 Bluetooth를 끕니다.
4. Windows Bluetooth 설정에서 기존 Hue 장치를 제거합니다.
5. 노트북을 전구 1m 안쪽에 둔 뒤 다시 시도합니다.
6. 계속 실패하면 `LIGHT_BACKEND=home_assistant`로 전환합니다.

발표에서는 "Hue Bridge 없이 Bluetooth 기반 로컬 제어 서버를 구성하고, MotherTogether API key 호출로 조명을 자동 제어했습니다"라고 설명하면 됩니다.
