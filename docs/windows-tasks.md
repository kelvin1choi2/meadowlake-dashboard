# Windows PC tasks on the Data tile

The Data tile's **Windows tasks** line and the **Windows 11 tasks** table in the Data sheet show
the PC's real Task Scheduler tasks: when each last ran, and whether it's on time, late or
failed. Home Assistant can't see into Windows, so a small script on the PC reports them:

```
Task Scheduler ──► report-tasks.ps1 (every 15 min) ──► HA webhook ──► sensor.windows_tasks ──► dashboard
```

The script only reads Task Scheduler. It never starts, changes or stops a task.

Until the sensor exists, the line reads **Not set up** (the public demo keeps its made-up tasks).

## What the results mean

- **OK**: it ran when it should have, and Windows reported success (or it's running now).
- **Late**: its last run is longer ago than its schedule allows, plus some slack (at least
  half an hour). That usually means the PC was off or asleep when it was due.
- **Failed**: its last run ended with an error code, shown under the name.
- **Not run yet** / **Off**: it has never run, or it's disabled in Task Scheduler.
- **PC not reporting** on the tile: no report for 45 minutes, so the PC is probably off or asleep.

Tasks Windows and other apps add for themselves (everything under `\Microsoft\`, and updaters
such as Google, Edge, OneDrive, Adobe and NVIDIA) are left out.

## 1. Home Assistant: a sensor that receives the report

In Home Assistant, open the **Terminal** from the sidebar (the Terminal & SSH add-on, set up for
the NAS checks in docs/nas-alerts.md) and paste:

```sh
cd /homeassistant 2>/dev/null || cd /config
grep -q '^windows_tasks_webhook:' secrets.yaml 2>/dev/null || echo "windows_tasks_webhook: $(head -c 32 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 32)" >> secrets.yaml
mkdir -p templates
curl -fsSL https://raw.githubusercontent.com/kelvin1choi2/meadowlake-dashboard/main/scripts/homeassistant/windows-tasks.yaml -o templates/windows-tasks.yaml
grep -q '^template:' configuration.yaml && echo "You already have template: in configuration.yaml. Add the contents of templates/windows-tasks.yaml under it by hand." || printf '\ntemplate: !include_dir_merge_list templates\n' >> configuration.yaml
grep '^windows_tasks_webhook:' secrets.yaml
```

The last line prints the webhook id (it acts as a password, so keep it out of the repo and
the thread). You'll type it on the PC in step 2.

Then restart Home Assistant: Developer tools → YAML → **Check configuration**, then **Restart**.
`local_only: true` in the sensor means only devices on the home network can send reports.

## 2. The PC: install the reporter (once)

On the Windows PC, right-click **Start** → **Terminal (Admin)** (or **Windows PowerShell
(Admin)**), click **Yes**, and paste:

```powershell
irm https://raw.githubusercontent.com/kelvin1choi2/meadowlake-dashboard/main/scripts/windows/install-task-report.ps1 | iex
```

It asks two questions: Home Assistant's address (as you type it in the browser, e.g.
`http://192.168.4.75`) and the webhook id from step 1. It then adds a task called
**Meadowlake task report** that runs every 15 minutes and at startup, as SYSTEM (so no window
pops up), and sends a first report straight away. Within a few seconds the Data sheet lists
the PC's tasks.

If it shows an error with **404**, the webhook id doesn't match. Run it again and retype the id.

## Choosing which tasks show

The settings live in `C:\ProgramData\Meadowlake\task-report.conf` (only administrators can open
it). Add either line to it in Notepad (opened as administrator), separating names with `;`:

```
ONLY=Plex metadata refresh;Photo import to NAS
SKIP=Some updater*;Another task
```

`ONLY` reports just those tasks; `SKIP` leaves extra ones out (`*` matches anything). The next
report, within 15 minutes, uses them. Reinstalling keeps these lines.

## Running a task now

The dashboard doesn't start PC tasks. On the PC, open **Task Scheduler**, find the task under
**Task Scheduler Library**, right-click it and choose **Run**. The next report shows the result.

## Remove

In an admin terminal:

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/kelvin1choi2/meadowlake-dashboard/main/scripts/windows/install-task-report.ps1))) -Uninstall
```

Then delete `templates/windows-tasks.yaml` in Home Assistant and restart it.
