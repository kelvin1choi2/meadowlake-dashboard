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

1. Open **Web Station → Web Service Portal → Create**.
2. Choose **Create service portal**, then the **Static website** service. Nginx is fine.
3. Portal type **Port-based**, HTTP port **8080**. Leave HTTPS off.
4. Document root: `web/meadowlake`.
5. Save, then open `http://<NAS address>:8080` in a browser. On the tablet, use
   **Add to Home Screen** for the full-screen app.

Plain http is deliberate. The Roon display card only loads on an http page, and the site
never leaves the home network. Don't forward port 8080 on the router.

## 4. Optional: update automatically

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
