# Opening the real apps from a Windows PC

Windows has no Shortcuts app, so the iPad and Mac approach (docs/ipad-apps.md) doesn't work
there. Instead, a small helper teaches Windows one new kind of link, `meadowlake-app:`, and
opens the matching app. With it, the **Roon**, **Plex** and **SmartThings** pills open the
Windows apps. Everything else keeps opening its website or Home Assistant page.

The helper only opens the three apps listed in `open-app.ps1`. A link chooses one of those names
and can't run anything else.

## Install (once per PC)

1. Download `install-app-links.ps1` and `open-app.ps1` from `scripts/windows/` in the repo and
   put them in the same folder.
2. Open that folder in File Explorer, click the address bar, type `powershell` and press Enter.
3. Run:

   ```
   powershell -ExecutionPolicy Bypass -File install-app-links.ps1
   ```

4. Open the dashboard on this PC, go to **Settings**, and switch on
   **Open Roon, Plex and SmartThings here**.

The first time you tap one of those pills, Brave asks whether to open the link with Windows
PowerShell. Tick **Always allow** and click **Open**. A console window may flash for a moment
before the app opens.

If an app isn't installed, or its Start menu name differs from the list in `open-app.ps1`, a
message box says so.

## Remove

Run `powershell -ExecutionPolicy Bypass -File install-app-links.ps1 -Uninstall`, then switch the
setting off in the dashboard.
