# Backup and sync alerts

The Data tile lists the NAS backup and sync tasks first, and a failed task puts a
dismissable banner across the top of the dashboard. Home Assistant's Synology integration
doesn't report Active Backup for Business or Cloud Sync tasks, so each task's last result
lives in a text helper, which two things keep up to date:

```
Dashboard opens ──► HA script asks the NAS (steps 4–6) ──┐
NAS notification ──► HA webhook automation (steps 2–3) ──┴─► input_text helper ──► dashboard
```

- **Asking the NAS** (steps 4–6) is what keeps the tile current: the dashboard runs it every
  time it's opened, reloaded or comes back on screen, and Home Assistant every 15 minutes.
- **Notifications** (steps 2–3) are optional on top: they report a failure the moment it
  happens instead of at the next check.

Until the helpers exist, the dashboard shows sample tasks.

Each step says where it happens: **Home Assistant** steps are in its web page
(the address you open it with, menu down the left side); **Synology** steps are in DSM's web page.

## 1. Home Assistant: three text helpers

In Home Assistant, Settings → Devices & services → Helpers → Create helper → Text. Create three, each with
**Maximum length 255**:

| Name             | Entity ID                     |
|------------------|-------------------------------|
| NAS Roon backup  | `input_text.nas_roon_backup`  |
| NAS Photos backup| `input_text.nas_photos_backup`|
| NAS Cloud Sync   | `input_text.nas_cloud_sync`   |

## 2. Home Assistant: the webhook automation

In Home Assistant, Settings → Automations & scenes → Create automation → Create new → ⋮ → Edit in YAML, paste
this, and replace `PICK-A-LONG-RANDOM-ID` with a long random string of your own (it acts as
a password for the webhook, so don't reuse anything and don't commit it):

```yaml
alias: NAS backup and sync results
mode: queued
triggers:
  - trigger: webhook
    webhook_id: PICK-A-LONG-RANDOM-ID
    allowed_methods: [POST, GET]
    local_only: true
actions:
  - variables:
      text: >-
        {{ (trigger.json.text if trigger.json is mapping and 'text' in trigger.json
            else trigger.data.text if trigger.data is mapping and 'text' in trigger.data
            else trigger.query.text | default('')) | string }}
      result: >-
        {{ 'failed' if text is search('fail|error|could not|unable|partial|abort', ignorecase=True) else 'ok' }}
      value: "{{ (result ~ ': ' ~ text)[:250] }}"
  - choose:
      - conditions: "{{ 'RoonBackupSMB' in text }}"
        sequence:
          - action: input_text.set_value
            target: { entity_id: input_text.nas_roon_backup }
            data: { value: "{{ value }}" }
      - conditions: "{{ 'Photos2SMB_Backup' in text }}"
        sequence:
          - action: input_text.set_value
            target: { entity_id: input_text.nas_photos_backup }
            data: { value: "{{ value }}" }
      - conditions: "{{ text is search('Cloud Sync', ignorecase=True) }}"
        sequence:
          - action: input_text.set_value
            target: { entity_id: input_text.nas_cloud_sync }
            data: { value: "{{ value }}" }
```

`local_only: true` means only devices on the home network can call it.

## 3. Synology: send notifications to the webhook

In DSM, Control Panel → Notification → **Push Service** → Application Webhooks →
**Manage Webhooks** → Add (on newer DSM it's a **Webhooks** tab), provider **Custom**:

- **Provider tab:** URL = the address you open Home Assistant with (as in the browser's
  address bar, e.g. `http://192.168.4.75`), then `/api/webhook/PICK-A-LONG-RANDOM-ID`
  (your id from step 2), method **POST**. Include `:8123` only if your address has it.
- **HTTP Request tab:** header `Content-Type` = `application/json`; body parameter
  `text` = `@@TEXT@@`. (An empty Content-Type value makes Save fail.)
- **Parameter Type tab:** set `text` to **Message content**.
- Save, then **Send Test Message**; the Cloud Sync helper won't change (the test doesn't
  name a task), but Home Assistant's automation trace will show it arrived.

Then choose which events go to it: Control Panel → Notification → **Rules** (or Advanced)
and tick, for the webhook:

- Active Backup for Business: backup task **completed**, **failed** and **partially completed**
- Cloud Sync: sync **errors**

Cloud Sync only reports problems, so its row reads OK until a sync error arrives; the
next successful Active Backup run sets its row back to OK.

If your DSM has no Webhooks tab, the same URL and body work as a custom **SMS provider**
(Notification → SMS → Add SMS service provider), with `@@TEXT@@` as the message field.

## 4. Synology: an account for Home Assistant to ask with

In DSM, Control Panel → User & Group → Create: a user such as `ha-backups` with a long random
password, in the **administrators** group (Active Backup and Cloud Sync only answer to
admins). Two-factor sign-in has to be off for this account, so if Security → Account
enforces it for administrators, the check can't sign in.

## 5. Home Assistant: the script that asks the NAS

In Home Assistant (not DSM): Settings → **Add-ons** (called **Apps** on newer versions) →
**Add-on store** → search **Terminal & SSH** → Install. Then Start, turn on **Show in
sidebar** and click **Open web UI**. In the terminal that opens, run:

```sh
cd /homeassistant 2>/dev/null || cd /config
mkdir -p nas
curl -fsSL https://raw.githubusercontent.com/kelvin1choi2/meadowlake-dashboard/main/scripts/homeassistant/nas-backup-status.sh -o nas/nas-backup-status.sh
```

Then run `nano nas/dsm.conf`, type or paste the three lines below, press Ctrl-O, Enter to
save and Ctrl-X to leave, and run `chmod 600 nas/dsm.conf`. The three lines, with your NAS address (the one you open DSM with, on port 5000) and the
account from step 4. They stay on Home Assistant; never put them in the repo:

```sh
DSM_URL=http://NAS-ADDRESS:5000
DSM_USER=ha-backups
DSM_PASS='the password'
```

Try it: `bash nas/nas-backup-status.sh nas/dsm.conf` should print a line like
`{"RoonBackupSMB":"ok @1760598840: Backed up",…}`. `{"error": …}` says what went wrong.
The output has no passwords in it, so it's safe to paste into the project thread if the
task names aren't there.

Then add this to `configuration.yaml` (`nano configuration.yaml` in the same terminal) and
restart Home Assistant (Developer tools → YAML → Check configuration, then Restart):

```yaml
shell_command:
  nas_backup_status: bash /config/nas/nas-backup-status.sh
```

Then, back in Home Assistant, Settings → Automations & scenes → Scripts → Add script → ⋮ → Edit in YAML, paste this
and save. Keep the alias: the dashboard looks for `script.nas_refresh_backups`.

```yaml
alias: NAS refresh backups
description: Asks the NAS for its latest Active Backup and Cloud Sync results.
mode: single
max_exceeded: silent
sequence:
  - action: shell_command.nas_backup_status
    response_variable: out
    continue_on_error: true
  - variables:
      result: "{{ (out.stdout if out is defined and out.stdout is defined else '') | from_json(default={}) }}"
  - if: "{{ result.error is defined }}"
    then:
      - action: persistent_notification.create
        data:
          notification_id: nas_backups
          title: NAS backup check
          message: "{{ result.error }}"
    else:
      - action: persistent_notification.dismiss
        data: { notification_id: nas_backups }
  - repeat:
      for_each:
        - { task: RoonBackupSMB, helper: input_text.nas_roon_backup }
        - { task: Photos2SMB_Backup, helper: input_text.nas_photos_backup }
        - { task: Cloud Sync, helper: input_text.nas_cloud_sync }
      sequence:
        - variables:
            value: "{{ (result.get(repeat.item.task, '') | string)[:250] }}"
        - if: "{{ value is match('(ok|failed)[ @:]') and value != states(repeat.item.helper) }}"
          then:
            - action: input_text.set_value
              target: { entity_id: "{{ repeat.item.helper }}" }
              data: { value: "{{ value }}" }
```

If the NAS can't be reached or rejects the account, the helpers keep their last result and
Home Assistant shows a "NAS backup check" notification saying why.

## 6. Home Assistant: check every 15 minutes too

So a failure shows up on a dashboard that's left open, add one more automation (YAML as in
step 2):

```yaml
alias: NAS check backups every 15 minutes
triggers:
  - trigger: time_pattern
    minutes: /15
  - trigger: homeassistant
    event: start
actions:
  - action: script.nas_refresh_backups
```

The Data sheet's task table then shows when each task last ran and, under it, when the NAS
was last checked.
