param(
  [int]$Port = 8000,
  [string]$ApiKey = $(if ($env:MOTHER_TOGETHER_API_KEY) { $env:MOTHER_TOGETHER_API_KEY } else { "mt_demo_api_key" })
)

$baseUrl = "http://localhost:$Port"
$headers = @{
  "Authorization" = "Bearer $ApiKey"
}

Invoke-RestMethod -Method Get -Uri "$baseUrl/health"
Invoke-RestMethod -Method Get -Uri "$baseUrl/api/v1/light/scan" -Headers $headers
Invoke-RestMethod -Method Post -Uri "$baseUrl/api/v1/light/nausea-care" -Headers $headers
Invoke-RestMethod -Method Post -Uri "$baseUrl/api/v1/light/sleep-care" -Headers $headers
Invoke-RestMethod -Method Post -Uri "$baseUrl/api/v1/light/vacation-mode" -Headers $headers
Invoke-RestMethod -Method Post -Uri "$baseUrl/api/v1/light/chores-care" -Headers $headers
Invoke-RestMethod -Method Post -Uri "$baseUrl/api/v1/light/off" -Headers $headers
