# Setup fresh BSP session at each step for screenshot capture
param([string]$Base = "http://localhost:3006")

function New-Session {
  $r = Invoke-RestMethod -Uri "$Base/api/v1/gm/sessions" -Method POST -Body (@{ name = "Screenshot Demo" } | ConvertTo-Json) -ContentType "application/json"
  return $r
}

function New-Company($joinCode, $teamName) {
  Invoke-RestMethod -Uri "$Base/api/v1/join/$joinCode/companies" -Method POST -Body (@{ teamName = $teamName } | ConvertTo-Json) -ContentType "application/json"
}

function Get-Dashboard($companyId) {
  Invoke-RestMethod -Uri "$Base/api/v1/play/companies/$companyId/dashboard" -Method GET
}

function Post-Decision($companyId, $step, $payload, $version) {
  $body = @{ step = $step; payload = $payload; companyStatusVersion = $version; validateOnly = $false } | ConvertTo-Json -Depth 10
  Invoke-RestMethod -Uri "$Base/api/v1/play/companies/$companyId/decisions" -Method POST -Body $body -ContentType "application/json"
}

function Advance($sessionId) {
  Invoke-RestMethod -Uri "$Base/api/v1/gm/sessions/$sessionId/advance-step" -Method POST
}

$loan = @{ loanEarly = 2; loanMid = 0; deposit = 1; loanRepayment = 0; step1UiPhase = "COMPLETE" }
$facility = @{ landPlotsPurchased = 1; machineBigPurchased = 1; machineSmallPurchased = 0 }
$hiring = @{ headPurchase = 2; headProduction = 3; headSales = 2 }
$material = @{
  branches = @()
  lines = @(@{ regionCode = "ASIA"; materials = @{ A = 15; B = 15; C = 15; D = 15 } })
}
$production = @{ productionQty = 3; machineBigRun = 1; machineSmallRun = 0 }
$sales = @{
  lines = @(@{ regionCode = "ASIA"; unitPriceManwon = 100; qty = 3 })
  branchesNew = @()
}

$results = @{}

# Step 1 — fresh session
$s1 = New-Session
$c1 = New-Company $s1.joinCode "Team-Step1"
$results["step1"] = @{ sessionId = $s1.sessionId; joinCode = $s1.joinCode; companyId = $c1.companyId; url = "$Base/play?companyId=$($c1.companyId)" }

# Step 2
$s2 = New-Session
$c2 = New-Company $s2.joinCode "Team-Step2"
$d = Get-Dashboard $c2.companyId
Post-Decision $c2.companyId "LOAN" $loan $d.statusVersion | Out-Null
Advance $s2.sessionId | Out-Null
$results["step2"] = @{ sessionId = $s2.sessionId; joinCode = $s2.joinCode; companyId = $c2.companyId; url = "$Base/play?companyId=$($c2.companyId)" }

# Step 3
$s3 = New-Session
$c3 = New-Company $s3.joinCode "Team-Step3"
$d = Get-Dashboard $c3.companyId
Post-Decision $c3.companyId "LOAN" $loan $d.statusVersion | Out-Null; Advance $s3.sessionId | Out-Null
$d = Get-Dashboard $c3.companyId
Post-Decision $c3.companyId "FACILITY" $facility $d.statusVersion | Out-Null; Advance $s3.sessionId | Out-Null
$results["step3"] = @{ sessionId = $s3.sessionId; joinCode = $s3.joinCode; companyId = $c3.companyId; url = "$Base/play?companyId=$($c3.companyId)" }

# Step 4
$s4 = New-Session
$c4 = New-Company $s4.joinCode "Team-Step4"
$d = Get-Dashboard $c4.companyId
Post-Decision $c4.companyId "LOAN" $loan $d.statusVersion | Out-Null; Advance $s4.sessionId | Out-Null
$d = Get-Dashboard $c4.companyId
Post-Decision $c4.companyId "FACILITY" $facility $d.statusVersion | Out-Null; Advance $s4.sessionId | Out-Null
$d = Get-Dashboard $c4.companyId
Post-Decision $c4.companyId "HIRING" $hiring $d.statusVersion | Out-Null; Advance $s4.sessionId | Out-Null
$results["step4"] = @{ sessionId = $s4.sessionId; joinCode = $s4.joinCode; companyId = $c4.companyId; url = "$Base/play?companyId=$($c4.companyId)" }

# Step 5
$s5 = New-Session
$c5 = New-Company $s5.joinCode "Team-Step5"
$d = Get-Dashboard $c5.companyId
Post-Decision $c5.companyId "LOAN" $loan $d.statusVersion | Out-Null; Advance $s5.sessionId | Out-Null
$d = Get-Dashboard $c5.companyId
Post-Decision $c5.companyId "FACILITY" $facility $d.statusVersion | Out-Null; Advance $s5.sessionId | Out-Null
$d = Get-Dashboard $c5.companyId
Post-Decision $c5.companyId "HIRING" $hiring $d.statusVersion | Out-Null; Advance $s5.sessionId | Out-Null
$d = Get-Dashboard $c5.companyId
Post-Decision $c5.companyId "MATERIAL" $material $d.statusVersion | Out-Null; Advance $s5.sessionId | Out-Null
$results["step5"] = @{ sessionId = $s5.sessionId; joinCode = $s5.joinCode; companyId = $c5.companyId; url = "$Base/play?companyId=$($c5.companyId)" }

# Step 6
$s6 = New-Session
$c6 = New-Company $s6.joinCode "Team-Step6"
$d = Get-Dashboard $c6.companyId
Post-Decision $c6.companyId "LOAN" $loan $d.statusVersion | Out-Null; Advance $s6.sessionId | Out-Null
$d = Get-Dashboard $c6.companyId
Post-Decision $c6.companyId "FACILITY" $facility $d.statusVersion | Out-Null; Advance $s6.sessionId | Out-Null
$d = Get-Dashboard $c6.companyId
Post-Decision $c6.companyId "HIRING" $hiring $d.statusVersion | Out-Null; Advance $s6.sessionId | Out-Null
$d = Get-Dashboard $c6.companyId
Post-Decision $c6.companyId "MATERIAL" $material $d.statusVersion | Out-Null; Advance $s6.sessionId | Out-Null
$d = Get-Dashboard $c6.companyId
Post-Decision $c6.companyId "PRODUCTION" $production $d.statusVersion | Out-Null; Advance $s6.sessionId | Out-Null
$results["step6"] = @{ sessionId = $s6.sessionId; joinCode = $s6.joinCode; companyId = $c6.companyId; url = "$Base/play?companyId=$($c6.companyId)" }

# Step 7 + settlement
$s7 = New-Session
$c7 = New-Company $s7.joinCode "Team-Step7"
$d = Get-Dashboard $c7.companyId
Post-Decision $c7.companyId "LOAN" $loan $d.statusVersion | Out-Null; Advance $s7.sessionId | Out-Null
$d = Get-Dashboard $c7.companyId
Post-Decision $c7.companyId "FACILITY" $facility $d.statusVersion | Out-Null; Advance $s7.sessionId | Out-Null
$d = Get-Dashboard $c7.companyId
Post-Decision $c7.companyId "HIRING" $hiring $d.statusVersion | Out-Null; Advance $s7.sessionId | Out-Null
$d = Get-Dashboard $c7.companyId
Post-Decision $c7.companyId "MATERIAL" $material $d.statusVersion | Out-Null; Advance $s7.sessionId | Out-Null
$d = Get-Dashboard $c7.companyId
Post-Decision $c7.companyId "PRODUCTION" $production $d.statusVersion | Out-Null; Advance $s7.sessionId | Out-Null
$d = Get-Dashboard $c7.companyId
Post-Decision $c7.companyId "SALES" $sales $d.statusVersion | Out-Null; Advance $s7.sessionId | Out-Null
$results["step7"] = @{ sessionId = $s7.sessionId; joinCode = $s7.joinCode; companyId = $c7.companyId; url = "$Base/play?companyId=$($c7.companyId)" }

# Close period for financials
Invoke-RestMethod -Uri "$Base/api/v1/gm/sessions/$($s7.sessionId)/close-period" -Method POST -Body "{}" -ContentType "application/json" | Out-Null
$results["financials"] = @{ sessionId = $s7.sessionId; joinCode = $s7.joinCode; companyId = $c7.companyId; url = "$Base/play?companyId=$($c7.companyId)" }

# GM session with teams
$results["gmDesk"] = @{ sessionId = $s7.sessionId; joinCode = $s7.joinCode; url = "$Base/gm" }
$results["joinCode"] = @{ joinCode = $s1.joinCode; url = "$Base/join" }

$results | ConvertTo-Json -Depth 5
