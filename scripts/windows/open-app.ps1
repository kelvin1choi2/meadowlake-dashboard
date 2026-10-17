# Opens one of the dashboard's apps on this PC. Windows runs this for meadowlake-app: links,
# which install-app-links.ps1 registers. It only opens apps on the list below: a link picks a
# name from the list and can never name a program to run.
param([string]$Link)

# Link name = the app's name in the Start menu. Keep in step with `windows: true` in src/apps/apps.ts.
$apps = @{
  roon        = 'Roon'
  plex        = 'Plex'
  smartthings = 'SmartThings'
}

if ($Link -notmatch '^meadowlake-app:(?://)?([a-z]+)/?$') { exit 1 }
$name = $apps[$Matches[1]]
if (-not $name) { exit 1 }

# Start menu entries cover both installed programs and Microsoft Store apps.
$entry = Get-StartApps | Where-Object { $_.Name -eq $name } | Select-Object -First 1
if (-not $entry) {
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show("There's no '$name' in this PC's Start menu, so it can't be opened.", 'Meadowlake') | Out-Null
  exit 1
}
Start-Process "shell:AppsFolder\$($entry.AppID)"
