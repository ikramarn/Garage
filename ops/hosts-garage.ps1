# Requires running as Administrator
param(
  [ValidateSet("add","remove")] [string]$Action = "add"
)

$hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
$entry = "127.0.0.1 garage.local"

function Add-Entry {
  $content = Get-Content -Path $hostsPath -ErrorAction Stop
  if ($content -match "garage.local") {
    Write-Host "hosts entry already present" -ForegroundColor Yellow
    return
  }
  Add-Content -Path $hostsPath -Value $entry
  Write-Host "Added: $entry" -ForegroundColor Green
}

function Remove-Entry {
  $content = Get-Content -Path $hostsPath -ErrorAction Stop
  $filtered = $content | Where-Object { $_ -notmatch "garage.local" }
  Set-Content -Path $hostsPath -Value $filtered
  Write-Host "Removed garage.local entries" -ForegroundColor Green
}

if ($Action -eq "add") { Add-Entry }
elseif ($Action -eq "remove") { Remove-Entry }
