# Quick demo flow: submit decisions + GM advance through steps 4-7
$base = "http://localhost:3005"

# Get demo session
$demo = Invoke-RestMethod -Uri "$base/api/v1/demo/setup" -Method GET
$sessionId = $demo.sessionId
Write-Host "Session: $($demo.joinCode) ($sessionId)"

# Create fresh company
$co = Invoke-RestMethod -Uri "$base/api/v1/demo/setup" -Method POST
$companyId = $co.companyId
Write-Host "Company: $($co.teamName) ($companyId)"

function Post-Decision($step, $payload, $version) {
  $body = @{ step = $step; payload = $payload; companyStatusVersion = $version; validateOnly = $false } | ConvertTo-Json -Depth 10
  $r = Invoke-RestMethod -Uri "$base/api/v1/play/companies/$companyId/decisions" -Method POST -Body $body -ContentType "application/json"
  return $r
}

function Advance-Step {
  Invoke-RestMethod -Uri "$base/api/v1/gm/sessions/$sessionId/advance-step" -Method POST | Out-Null
}

function Get-Dashboard {
  Invoke-RestMethod -Uri "$base/api/v1/play/companies/$companyId/dashboard" -Method GET
}

# Submit steps 1-3 for new company (session at step 3)
$d = Get-Dashboard
Post-Decision "LOAN" @{ loanEarly = 1; loanMid = 0; deposit = 0; loanRepayment = 0; step1UiPhase = "COMPLETE" } $d.statusVersion | Out-Null
Advance-Step
$d = Get-Dashboard
Post-Decision "FACILITY" @{ landPlotsPurchased = 1; machineBigPurchased = 1; machineSmallPurchased = 0 } $d.statusVersion | Out-Null
Advance-Step
$d = Get-Dashboard
Post-Decision "HIRING" @{ headPurchase = 2; headProduction = 3; headSales = 2 } $d.statusVersion | Out-Null
Advance-Step

# Step 4 Material
$d = Get-Dashboard
Write-Host "Step phase: $($d.stepPhase)"
Post-Decision "MATERIAL" @{
  branches = @()
  lines = @(@{ regionCode = "DOMESTIC"; materials = @{ STEEL = 15; PLASTIC = 15; CHEMICAL = 15; ELECTRONIC = 15 } })
} $d.statusVersion | Out-Null
Advance-Step

# Step 5 Production
$d = Get-Dashboard
Post-Decision "PRODUCTION" @{ productionQty = 3; machineBigRun = 1; machineSmallRun = 0 } $d.statusVersion | Out-Null
Advance-Step

# Step 6 Sales
$d = Get-Dashboard
Post-Decision "SALES" @{
  lines = @(@{ regionCode = "DOMESTIC"; unitPriceManwon = 500; qty = 3 })
  branchesNew = @()
} $d.statusVersion | Out-Null
Advance-Step

# Step 7 - close period
$d = Get-Dashboard
Write-Host "At step: $($d.stepPhase)"
$close = Invoke-RestMethod -Uri "$base/api/v1/gm/sessions/$sessionId/close-period" -Method POST -Body "{}" -ContentType "application/json"
Write-Host "Close period: $($close.results.Count) teams"

Write-Host "DONE companyId=$companyId sessionId=$sessionId"
