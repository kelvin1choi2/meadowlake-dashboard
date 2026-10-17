# Opening the real apps from the iPad and Mac

On a laptop, the "Open in" pills at the top of each sheet open websites, or Home Assistant for
devices that have no website. On an iPad or iPhone they run an Apple Shortcut instead, and the
Shortcut opens the app. Most of these apps don't offer a link a web page can use to open them,
so a Shortcut does it for them.

Synology DSM and Roon ROCK stay as web pages on the iPad too. The Roon and Home pills only show
on an iPad, iPhone or Mac, since they have no web page to fall back to.

## Make the Shortcuts (once per iPad)

For each app below:

1. Open **Shortcuts** and tap **+**.
2. Add the **Open App** action and pick the app.
3. Rename the Shortcut to the name in the first column, exactly (capitals and spaces matter).

| Shortcut name         | App to open      |
| --------------------- | ---------------- |
| Open Ecobee           | ecobee           |
| Open Hue              | Hue              |
| Open Blink            | Blink            |
| Open Rachio           | Rachio           |
| Open Roon             | Roon             |
| Open Plex             | Plex             |
| Open SmartThings      | SmartThings      |
| Open LG ThinQ         | LG ThinQ         |
| Open EcoNet           | EcoNet           |
| Open Smart Life       | Smart Life       |
| Open eero             | eero             |
| Open Home Assistant   | Home Assistant   |
| Open Home             | Home             |

The first time a pill runs a Shortcut, iOS may ask to allow it. Tap **Always Allow**.

If a Shortcut is missing or misspelled, Shortcuts says it can't find it. Make it or fix its
name and tap the pill again.

## On a Mac

The pills work the same way on a Mac (in Brave or Safari), but only for the apps that have a
Mac version: **Roon**, **Plex**, **Home Assistant** and **Home**. Everything else opens its
website or Home Assistant page, as on any computer.

Make these four Shortcuts in the Shortcuts app on the Mac, with the same names as above:
Open Roon, Open Plex, Open Home Assistant, Open Home. Skip any app that isn't installed on that
Mac. Its pill will then say the Shortcut can't be found.

The first time, Brave asks whether to open Shortcuts. Tick **Always allow** and click **Open**.
