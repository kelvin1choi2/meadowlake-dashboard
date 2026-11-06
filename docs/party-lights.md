# Party lights (the Lounge light bars)

The **Party lights** card in the Media sheet runs the Govee light bars in the Lounge:

- **Lights on**: on and off.
- **Strobe to music** or **Steady**: strobing uses the bars' own microphone, so the flashes keep
  the beat of whatever is playing in the room.
- **Album colors** or **Govee colors**: with album colors, the bars use only colors taken from
  the cover of the album playing in the Lounge Roon zone, exactly as they are on the cover. They move on to the next color every **30, 60 or 90 seconds**
  (**Change every**), and a new album brings new colors. Govee colors leaves the choice to the bars.
  Each bar shows its own album color (this one and the next) and both move on together. Strobing
  in album colors uses Govee's **Shiny** style and needs the bars' address (step 5).
- **Mic sensitivity**: how strongly the strobe reacts to the music.
- **Strobe style**: with Govee colors, Govee's music styles **Rhythm** (the default), **Strike**,
  **Beat** and **Vibrate**.

These controls don't depend on Roon. The lights stay as they are when the music stops. Only
the colors follow the album.

```
dashboard ──► Home Assistant helpers ──► on/off, steady colors: straight to the bars (home network)
                                    ├──► strobe in album colors: straight to the bars (home network, Shiny)
                                    └──► strobe in Govee colors, two-color steady: Govee's cloud (needs your API key)
Lounge album changes ──► Home Assistant picks its colors from the cover (album-palette.py)
```

Govee's cloud can switch on music mode, but these bars ignore the color it sends. Strobing in
album colors therefore sends the Govee app's own music command straight to the bars
(`govee-music-lan.py`; the message layout comes from the govee2mqtt-extended project). Govee
doesn't publish it, so a firmware update could change it. Steady colors for each bar go through
the cloud. Govee allows 10,000 cloud
commands a day. Changing every 30 seconds uses about 2,900 a day strobing, or 5,800 steady
(one per bar), even if the lights stay on all day.

Home Assistant picks the album's colors itself whenever the Lounge album changes, so they
update even when no dashboard is open.

## 1. Check the bars' name in Home Assistant

Settings → Devices & services → Entities, search **lounge lights**. The entity ID should be
`light.lounge_lights`. If it's different, open it, tap the gear, and change the **Entity ID** to
`light.lounge_lights` (the Home Assistant part below uses that ID).

## 2. Put the Govee API key in Home Assistant

Open the **Terminal** from Home Assistant's sidebar and paste:

```sh
cd /homeassistant 2>/dev/null || cd /config
grep -q '^govee_api_key:' secrets.yaml && echo "Already there" || { read -r -p "Govee API key: " k && echo "govee_api_key: \"$k\"" >> secrets.yaml && echo "Saved"; }
```

Paste the key from Govee's email when it asks, then press Return. It stays in Home Assistant's
`secrets.yaml`. Don't put it in the thread or anywhere else.

## 3. Add the Party lights part

Still in the Terminal, paste this. It adds the Party lights package and the small script that
picks the album's colors, then checks the configuration and restarts Home Assistant.

```sh
cd /homeassistant 2>/dev/null || cd /config
mkdir -p packages party
curl -fsSL https://raw.githubusercontent.com/kelvin1choi2/meadowlake-dashboard/main/scripts/homeassistant/party-lights.yaml -o packages/party_lights.yaml
curl -fsSL https://raw.githubusercontent.com/kelvin1choi2/meadowlake-dashboard/main/scripts/homeassistant/album-palette.py -o party/album-palette.py
curl -fsSL https://raw.githubusercontent.com/kelvin1choi2/meadowlake-dashboard/main/scripts/homeassistant/govee-music-lan.py -o party/govee-music-lan.py
if grep -q 'packages:' configuration.yaml; then echo "packages: is already set up"
elif grep -q '^homeassistant:' configuration.yaml; then awk '{print} /^homeassistant:/{print "  packages: !include_dir_named packages"}' configuration.yaml > /tmp/c.yaml && cat /tmp/c.yaml > configuration.yaml
else printf '\nhomeassistant:\n  packages: !include_dir_named packages\n' >> configuration.yaml; fi
ha core check && ha core restart
```

Run the same lines again later to pick up a newer version.

## 4. Check that Home Assistant found the bars in Govee's cloud

Developer tools → States, search `sensor.govee_party_bars`. Its state should look like
`H6046|AB:CD:…|Rhythm=3;Beat=…|10`. The number at the end is how many sections the cloud can
color separately. If it's `0`, steady album colors use one color on both bars.

- **not found**: in the Govee Home app, rename the bars so the name includes **Lounge** (or
  "bar"). Then in Developer tools → Actions run **Home Assistant Core Integration: Update entity**
  on `sensor.govee_party_bars`.
- **unavailable** or **unknown**: the API key wasn't accepted. Check the `govee_api_key` line in
  `secrets.yaml`, then restart.
- **no music mode**: Govee's cloud doesn't offer music mode for these bars. Steady album colors
  still work. Tell Claude what the bars' model shows in the Govee Home app.

## 5. Give Home Assistant the bars' address

Strobing in album colors talks to the bars directly, so it needs their address on the home
network. Find it in the eero app under Devices (the bars may be listed as `ihoment_H6046…`). It
looks like `192.168.4.60`. In the eero app, it's best to reserve that address for the bars so it
doesn't change.

In Home Assistant, go to Settings → Devices & services → Helpers, open **Party lights bars
address**, then type the address in its box and press Return.

## 6. Try it

Open the Media sheet and turn on **Lights on**, then **Strobe to music** and **Album colors**,
with music playing in the Lounge. The color blocks show the album's colors. The one outlined
(**Now**) is the one on the bars, and the countdown shows when the next one comes up. Switch to
**Steady** and two blocks are outlined, one for each bar.

If a button shows **Home Assistant didn't accept that**, step 3's restart probably hasn't
happened yet.

If no colors show while an album plays in the Lounge, go to Developer tools → Actions, pick
**Shell Command: party_album_palette**, tick **Return response** and run it. It should answer
with `stdout` like `#ff734c,#3871ff,…`. Send Claude what it says otherwise.

Earlier versions of this guide added `cors_allowed_origins` under `http:`. It isn't needed any
more and can stay or go.
