# The dashboard on an Apple TV

tvOS has no web browser, so the Apple TV can't open the dashboard by itself. Instead the Mac Mini
(on 24×7 anyway) shows the TV view and sends it to the Apple TV over AirPlay.

## TV view

Open the dashboard with `?tv` on the end of its address, e.g. `http://<nas>:8080/?tv`. It is built
for a widescreen TV seen from across the room:

- one category at a time fills most of the screen and the spotlight moves on by itself
  (12 s each; 18 s for a warning, 24 s for a problem); a strip along the bottom shows all of them;
- weather, what's playing and the house pulse stay on the right; failed NAS tasks show there too;
- it is display-only: nothing on it can be clicked or changed;
- for the OLEDs, the whole picture shifts by a few pixels every 3 minutes and dims from 11 pm to 6 am.

It uses the same Home Assistant connection as the regular dashboard in that browser, so open the
normal address once on the Mac, enter the address and token in Settings, then switch to `?tv`.

## Sending it to the Apple TV

1. On the Mac Mini, open Control Center → Screen Mirroring and pick the Apple TV. Choose
   **Use As Separate Display** so the Mac's own screen is left alone.
2. Open the `?tv` address in Safari or Chrome, drag the window onto the Apple TV display and make it
   full screen. For a kiosk window in Chrome:
   `open -na "Google Chrome" --args --kiosk --app="http://<nas>:8080/?tv"`
3. Keep the Mac from sleeping (System Settings → Energy → prevent automatic sleeping), or AirPlay
   drops.

After the Mac restarts it has to be unlocked (FileVault) before AirPlay and the window come back.
