# Tells Home Assistant how this PC's scheduled tasks last ran, for the dashboard's Data sheet
# (docs/windows-tasks.md). install-task-report.ps1 sets it to run every 15 minutes.
# It only reads Task Scheduler and sends the results to Home Assistant; it never starts a task.
param([string]$Config = (Join-Path $env:ProgramData 'Meadowlake\task-report.conf'))

# task-report.conf lines: HA_URL=http://..., WEBHOOK_ID=..., and optionally
# ONLY=Name one;Name two (report just these) and SKIP=Name*;Other* (leave these out).
$conf = @{}
foreach ($line in Get-Content $Config -ErrorAction Stop) {
  if ($line -match '^\s*([A-Z_]+)\s*=\s*(.*?)\s*$') { $conf[$Matches[1]] = $Matches[2] }
}
$split = { param($s) if ($s) { $s -split ';' | ForEach-Object { $_.Trim() } | Where-Object { $_ } } else { @() } }
$only = & $split $conf.ONLY
# Updaters and other tasks that apps add for themselves.
$skip = @('Meadowlake*', 'GoogleUpdate*', 'MicrosoftEdgeUpdate*', 'OneDrive*', 'Brave*', 'Adobe*',
  'NVIDIA*', 'Intel*', 'Opera*', 'Firefox*', 'Mozilla*', 'npcapwatchdog', 'User_Feed_Synchronization*') + (& $split $conf.SKIP)

function When($d) { if ($d -and $d.Year -gt 2000) { $d.ToString('yyyy-MM-ddTHH:mm:sszzz') } else { $null } }
function Clock($d) { $d.ToString('h:mmt').ToLower() }

# A schedule in words and how often it should run, in minutes (0 = no fixed interval).
function Schedule($triggers) {
  $t = @($triggers)[0]
  if (-not $t) { return @('On demand', 0) }
  $repeat = $t.Repetition.Interval
  if ($repeat) {
    $m = [int][Xml.XmlConvert]::ToTimeSpan($repeat).TotalMinutes
    $text = if ($m -eq 60) { 'Hourly' } elseif ($m % 60 -eq 0) { "Every $($m / 60) hours" } else { "Every $m min" }
    return @($text, $m)
  }
  $at = if ($t.StartBoundary) { Clock ([datetime]$t.StartBoundary) } else { '' }
  switch -Wildcard ($t.CimClass.CimClassName) {
    'MSFT_TaskDailyTrigger' {
      $n = [int]$t.DaysInterval
      return @($(if ($n -gt 1) { "Every $n days $at" } else { "Daily $at" }), (1440 * [Math]::Max(1, $n)))
    }
    'MSFT_TaskWeeklyTrigger' {
      $names = 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'
      $days = 0..6 | Where-Object { $t.DaysOfWeek -band (1 -shl $_) } | ForEach-Object { $names[$_] }
      $count = [Math]::Max(1, @($days).Count)
      return @("$($days -join ', ') $at", [int](10080 * [Math]::Max(1, [int]$t.WeeksInterval) / $count))
    }
    'MSFT_TaskLogonTrigger' { return @('At sign-in', 0) }
    'MSFT_TaskBootTrigger' { return @('At startup', 0) }
    'MSFT_TaskTimeTrigger' { return @("Once $at", 0) }
    'MSFT_TaskIdleTrigger' { return @('When idle', 0) }
    'MSFT_TaskEventTrigger' { return @('On an event', 0) }
    default { return @('Other', 0) }
  }
}

$tasks = Get-ScheduledTask | Where-Object {
  $name = $_.TaskName
  -not $_.TaskPath.StartsWith('\Microsoft\') -and
  ($(if ($only) { $only -contains $name } else { -not ($skip | Where-Object { $name -like $_ }) }))
} | ForEach-Object {
  $info = $_ | Get-ScheduledTaskInfo
  $schedule, $every = Schedule $_.Triggers
  [ordered]@{
    name     = $_.TaskName
    schedule = $schedule.Trim()
    every    = $every
    enabled  = $_.State -ne 'Disabled'
    running  = $_.State -eq 'Running'
    last     = When $info.LastRunTime
    next     = When $info.NextRunTime
    result   = [int64]$info.LastTaskResult
  }
}

$body = @{ tasks = @($tasks) } | ConvertTo-Json -Depth 4 -Compress
Invoke-RestMethod -Method Post -Uri ($conf.HA_URL.TrimEnd('/') + '/api/webhook/' + $conf.WEBHOOK_ID) `
  -ContentType 'application/json' -Body ([Text.Encoding]::UTF8.GetBytes($body)) -TimeoutSec 20 | Out-Null
