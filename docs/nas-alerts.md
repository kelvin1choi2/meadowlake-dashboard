# Backup and sync alerts

The Data tile lists the NAS backup and sync tasks first, and a failed task puts a
dismissable banner across the top of the dashboard. Home Assistant's Synology integration
doesn't report Active Backup for Business or Cloud Sync tasks, so the NAS sends its own
notifications to Home Assistant, which keeps each task's last result in a text helper:

```
NAS notification → webhook → Home Assistant automation → input_text helper → dashboard
```

Until the helpers exist, the dashboard shows sample tasks.

## 1. Home Assistant: three text helpers

Settings → Devices & services → Helpers → Create helper → Text. Create three, each with
**Maximum length 255**:

| Name             | Entity ID                     |
|------------------|-------------------------------|
| NAS Roon backup  | `input_text.nas_roon_backup`  |
| NAS Photos backup| `input_text.nas_photos_backup`|
| NAS Cloud Sync   | `input_text.nas_cloud_sync`   |

## 2. Home Assistant: the webhook automation

Settings → Automations & scenes → Create automation → Create new → ⋮ → Edit in YAML, paste
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

DSM → Control Panel → Notification → **Push Service** → Application Webhooks →
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
