# Lets the Meadowlake dashboard open Roon, Plex and SmartThings on this PC (docs/windows-apps.md).
# Run once, from the folder holding this file and open-app.ps1:
#   powershell -ExecutionPolicy Bypass -File install-app-links.ps1
# Undo with -Uninstall. Everything goes under your own Windows user; no admin needed.
param([switch]$Uninstall)

$dir = Join-Path $env:LOCALAPPDATA 'Meadowlake'
$key = 'HKCU:\Software\Classes\meadowlake-app'

if ($Uninstall) {
  Remove-Item $key -Recurse -ErrorAction SilentlyContinue
  Remove-Item $dir -Recurse -ErrorAction SilentlyContinue
  'Removed the Meadowlake app links.'
  return
}

New-Item $dir -ItemType Directory -Force | Out-Null
Copy-Item (Join-Path $PSScriptRoot 'open-app.ps1') $dir -Force
$script = Join-Path $dir 'open-app.ps1'

New-Item "$key\shell\open\command" -Force | Out-Null
Set-ItemProperty $key -Name '(default)' -Value 'URL:Meadowlake app link'
Set-ItemProperty $key -Name 'URL Protocol' -Value ''
Set-ItemProperty "$key\shell\open\command" -Name '(default)' -Value "powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$script`" `"%1`""

"Installed. Now open the dashboard on this PC, go to Settings and switch on 'Open Roon, Plex and SmartThings here'."
