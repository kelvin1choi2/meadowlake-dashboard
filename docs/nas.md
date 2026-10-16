# Hosting the dashboard on the Synology

The dashboard is a folder of static files, so the NAS serves it with Web Station. No Docker
is needed. Home Assistant runs separately on the Mac Mini.

Written for the DS1513+ on DSM 7.1.1. Menu names may differ slightly between DSM versions.

## 1. Make a folder for it

1. Install **Web Station** from Package Center. It creates a shared folder called `web`.
2. In File Station, open `web` and create a folder named `meadowlake`.

## 2. Put the dashboard in it

Download the newest
[meadowlake.zip](https://github.com/kelvin1choi2/meadowlake-dashboard/releases/latest/download/meadowlake.zip),
unzip it on your computer, and upload the **contents** (`index.html`, `assets/`, …) into
`web/meadowlake`. Step 4 can do this for you automatically from then on.

## 3. Create the website in Web Station

1. Open **Web Station → Web Service Portal → Create** and choose **Virtual host**.
   (Not Default server: that's the NAS's main site on port 80 and serves the whole `web` folder.)
2. **Port-based**, HTTP port **8080**. Leave HTTPS off.
3. Document root: `web/meadowlake`. HTTP back-end server: **Nginx**. PHP: **Not configured**.
4. Save, then open `http://<NAS address>:8080` in a browser. On the tablet, use
   **Add to Home Screen** for the full-screen app.

Plain http is deliberate. The Roon display card only loads on an http page, and the site
never leaves the home network. Don't forward port 8080 on the router.

## 4. Pass the Roon display through the NAS

The dashboard loads the Roon display from its own host on port 9330, so the browser keeps the
display's settings (zone, "start automatically") between sessions. Loaded straight from the
ROCK, Safari and Brave treat that storage as third-party and drop it, and Roon sees a new
display every time.

1. **Control Panel → Login Portal → Advanced → Reverse Proxy → Create.**
2. Source: HTTP, hostname `*`, port `9330`.
3. Destination: HTTP, the ROCK's address, port `9330`.
4. **Custom Header → Create → WebSocket**, then Save.
5. Open `http://<NAS address>:9330/display/`: it should show the Roon display. In Roon, pick
   the zone for this display once more and it stays.

Don't forward port 9330 on the router either.

## 5. Optional: update automatically

Every merge to `main` publishes a new build. To have the NAS pick it up by itself:

1. Copy `scripts/nas/update-dashboard.sh` to the NAS, for example into `web/` as
   `/volume1/web/update-dashboard.sh`.
2. **Control Panel → Task Scheduler → Create → Scheduled Task → User-defined script.**
3. User: `root`. Schedule: daily, or every hour if you like seeing changes quickly.
4. Run command: `sh /volume1/web/update-dashboard.sh /volume1/web/meadowlake`
5. Select the task and click **Run** once to test. Task Scheduler's results show
   "Dashboard updated" or "already at".

The script only downloads from this repo's public releases and only writes inside the
`meadowlake` folder.
