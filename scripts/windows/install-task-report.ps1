# Sets this PC up to tell Home Assistant how its scheduled tasks ran (docs/windows-tasks.md).
# Run in an administrator PowerShell window (the task runs as SYSTEM, so no window pops up and it
# can see every task). Asks for Home Assistant's address and the webhook id, then sends a first
# report straight away. Run it again to change either; -Uninstall removes it.
param([switch]$Uninstall)

$ErrorActionPreference = 'Stop'
$dir = Join-Path $env:ProgramData 'Meadowlake'
$name = 'Meadowlake task report'
$source = 'https://raw.githubusercontent.com/kelvin1choi2/meadowlake-dashboard/main/scripts/windows/report-tasks.ps1'

$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) { throw 'Open PowerShell as administrator (right-click Start, Terminal (Admin)) and run this again.' }

if ($Uninstall) {
  Unregister-ScheduledTask -TaskName $name -Confirm:$false -ErrorAction SilentlyContinue
  Remove-Item (Join-Path $dir 'report-tasks.ps1'), (Join-Path $dir 'task-report.conf') -ErrorAction SilentlyContinue
  'Removed the Meadowlake task report.'
  return
}

$url = (Read-Host 'Home Assistant address, as you open it in the browser (e.g. http://192.168.4.75)').Trim().TrimEnd('/')
$id = (Read-Host 'Webhook id (from the Home Assistant step)').Trim()
if ($url -notmatch '^https?://' -or -not $id) { throw 'Need an address starting with http:// and a webhook id.' }

New-Item $dir -ItemType Directory -Force | Out-Null
$script = Join-Path $dir 'report-tasks.ps1'
$local = if ($PSScriptRoot) { Join-Path $PSScriptRoot 'report-tasks.ps1' }
if ($local -and (Test-Path $local)) { Copy-Item $local $script -Force } else { Invoke-WebRequest $source -OutFile $script -UseBasicParsing }

# Keep ONLY/SKIP lines from an earlier install.
$conf = Join-Path $dir 'task-report.conf'
$kept = if (Test-Path $conf) { Get-Content $conf | Where-Object { $_ -match '^\s*(ONLY|SKIP)\s*=' } } else { @() }
Set-Content $conf (@("HA_URL=$url", "WEBHOOK_ID=$id") + $kept)
# Only administrators and SYSTEM can read the webhook id.
icacls $conf /inheritance:r /grant:r 'Administrators:F' 'SYSTEM:F' | Out-Null

$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
  -Argument "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$script`""
$every = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 15)
$boot = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 2) `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName $name -Action $action -Trigger $every, $boot -Settings $settings `
  -Principal $principal -Description 'Sends scheduled task results to Home Assistant for the Meadowlake dashboard.' -Force | Out-Null

& $script -Config $conf
'Installed. The dashboard''s Data sheet should list this PC''s tasks within a few seconds.'
