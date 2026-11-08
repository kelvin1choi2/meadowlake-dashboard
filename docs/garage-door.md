# Garage door from Apple Home

The garage opener stays paired to **Apple Home only**, so it keeps working from Home, Siri and
the remote even when Home Assistant or the Mac Mini is down. Apple Home tells Home Assistant
whenever the door opens or closes, and the dashboard shows that:

```
Garage opener ──► Apple Home automation (runs on a HomePod / Apple TV) ──► HA webhook ──► binary_sensor.garage_door_apple_home ──► dashboard
```

The dashboard still only *shows* the door. Nothing on it can open or close it.

If a working HomeKit Device garage cover is in Home Assistant, the dashboard uses that instead.
When neither reports, the Safety tile says **Not answering**.

## 1. Home Assistant: clear the old pairing

If Home Assistant shows the opener under **HomeKit Device** with "Failed setup, will retry …
IncorrectPairingIdError", that's the old pairing Apple Home took over. Settings → Devices &
services → **HomeKit Device** → on that entry, **⋮ → Delete**. If it then shows up again under
**Discovered**, choose **Ignore**, so Home Assistant stops trying to pair it.

## 2. Home Assistant: a sensor that receives the reports

Open the **Terminal** from the sidebar and paste:

```sh
cd /homeassistant 2>/dev/null || cd /config
grep -q '^garage_door_webhook:' secrets.yaml 2>/dev/null || echo "garage_door_webhook: $(head -c 48 /dev/urandom | base64 | tr -dc 'A-HJ-NP-Za-km-z2-9' | head -c 24)" >> secrets.yaml
mkdir -p templates
curl -fsSL https://raw.githubusercontent.com/kelvin1choi2/meadowlake-dashboard/main/scripts/homeassistant/garage-door.yaml -o templates/garage-door.yaml
grep -q '^template:' configuration.yaml || printf '\ntemplate: !include_dir_merge_list templates\n' >> configuration.yaml
grep '^garage_door_webhook:' secrets.yaml
```

The last line prints the webhook id. It works like a password, so don't post it anywhere. It has
no 0/O or 1/l/I, so it's easy to retype.

Then Developer tools → YAML → **Check configuration**, and **Template entities** (under "YAML
configuration reloading"). The sensor **Garage door (Apple Home)** now exists, reading
unknown until the first report.

## 3. Apple Home: two automations

On an iPhone or iPad, in the **Home** app (do this twice: once for **Opens**, once for **Closes**):

1. **Automation** tab → **+** → **An Accessory is Controlled**.
2. Pick **Garage Doors**, tap **Next**, choose **Opens** (the second time: **Closes**), **Next**.
3. Leave all accessories unselected, scroll to the bottom and tap **Convert to Shortcut**.
4. Add the action **Get Contents of URL** and set:
   - URL: `http://192.168.4.75/api/webhook/` followed by the webhook id from step 2
   - tap **Show More** → Method **POST**, Request Body **JSON**
   - **Add new field** → Text, key `state`, value `open` (the second time: `closed`)
5. **Done**.

The automation runs on your home hub (HomePod or Apple TV), so it works when your phone is away.
Test it by opening the door: within a few seconds the Safety tile says **Open**.

## If it stops updating

- Check both automations are still on in the Home app (Automation tab).
- If Home Assistant's address changes, edit the URL in both automations.
- A 404 means the webhook id in the automation doesn't match secrets.yaml.
