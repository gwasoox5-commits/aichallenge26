# P2 Review Package — setup tokens and security test outputs
param([string]$Base = "http://localhost:3013")

$outDir = Join-Path $PSScriptRoot "..\docs\release"
New-Item -ItemType Directory -Force -Path (Join-Path $outDir "screenshots\p2") | Out-Null

function Read-ErrorBody($response) {
  if (-not $response) { return $null }
  $stream = $response.GetResponseStream()
  $reader = New-Object System.IO.StreamReader($stream)
  return $reader.ReadToEnd()
}

$login = Invoke-RestMethod -Uri "$Base/api/v1/auth/login" -Method POST -Body (@{ password = "bsp-admin-dev" } | ConvertTo-Json) -ContentType "application/json"
$adminHeaders = @{ Authorization = "Bearer $($login.accessToken)" }

$demo = Invoke-RestMethod -Uri "$Base/api/v1/demo/setup" -Method GET -Headers $adminHeaders
$join = Invoke-RestMethod -Uri "$Base/api/v1/auth/join" -Method POST -Body (@{
  joinCode = "DEADBEEF000000000000000000000001"
  teamName = "P2-Review-Team"
} | ConvertTo-Json) -ContentType "application/json"

$noAuthResp = $null
try {
  Invoke-WebRequest -Uri "$Base/api/v1/gm/sessions" -Method POST -Body "{}" -ContentType "application/json" -UseBasicParsing | Out-Null
} catch {
  $noAuthResp = $_.Exception.Response
}

$ceoWrongResp = $null
try {
  Invoke-WebRequest -Uri "$Base/api/v1/play/companies/00000000-0000-0000-0000-000000000001/dashboard" -Method GET -Headers @{ Authorization = "Bearer $($join.accessToken)" } -UseBasicParsing | Out-Null
} catch {
  $ceoWrongResp = $_.Exception.Response
}

$invalidJoinResp = $null
try {
  Invoke-WebRequest -Uri "$Base/api/v1/join/ABC123" -Method GET -UseBasicParsing | Out-Null
} catch {
  $invalidJoinResp = $_.Exception.Response
}

$wrongAdminResp = $null
try {
  Invoke-WebRequest -Uri "$Base/api/v1/auth/login" -Method POST -Body (@{ password = "wrong-password" } | ConvertTo-Json) -ContentType "application/json" -UseBasicParsing | Out-Null
} catch {
  $wrongAdminResp = $_.Exception.Response
}

$logout = Invoke-RestMethod -Uri "$Base/api/v1/auth/logout" -Method POST

$result = @{
  base = $Base
  adminToken = $login.accessToken
  gmToken = $demo.gmAccessToken
  ceoToken = $join.accessToken
  companyId = $join.companyId
  sessionId = $demo.sessionId
  joinCode = $demo.joinCode
  security = @{
    noAuthGmSession = @{
      status = [int]$noAuthResp.StatusCode.value__
      body = (Read-ErrorBody $noAuthResp)
    }
    ceoWrongCompany = @{
      status = [int]$ceoWrongResp.StatusCode.value__
      body = (Read-ErrorBody $ceoWrongResp)
    }
    invalidJoinCode = @{
      status = [int]$invalidJoinResp.StatusCode.value__
      body = (Read-ErrorBody $invalidJoinResp)
    }
    wrongAdminPassword = @{
      status = [int]$wrongAdminResp.StatusCode.value__
      body = (Read-ErrorBody $wrongAdminResp)
    }
    logout = $logout
  }
  urls = @{
    gm = "$Base/gm"
    join = "$Base/join"
    play = "$Base/play?companyId=$($join.companyId)"
  }
}

$jsonPath = Join-Path $outDir "p2-setup-data.json"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($jsonPath, ($result | ConvertTo-Json -Depth 5), $utf8NoBom)
Write-Output "Saved $jsonPath"
