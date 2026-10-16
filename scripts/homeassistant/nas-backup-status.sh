#!/bin/bash
# Asks the Synology for the latest Active Backup for Business and Cloud Sync results and
# prints them as one line of JSON, keyed by task name, in the format the dashboard's text
# helpers use ("ok|failed[ @<unix time of the run>]: <message>"):
#
#   {"RoonBackupSMB":"ok @1760598840: Backed up","Cloud Sync":"ok @1760617200: Up to date"}
#
# Runs inside Home Assistant as a shell_command (see docs/nas-alerts.md). The DSM address
# and account are read from a file that stays on Home Assistant and is never committed:
#
#   DSM_URL=http://<nas address>:5000
#   DSM_USER=<account>
#   DSM_PASS=<password>
#
# Always exits 0 and prints JSON; on trouble that's {"error": "..."}.
# DSM_URL may be https with DSM's own self-signed certificate (-k), since it stays on the home network.
set -u
conf="${1:-/config/nas/dsm.conf}"
say_error() { jq -cn --arg m "$1" '{error: $m}'; exit 0; }
[ -r "$conf" ] || say_error "No DSM settings at $conf"
# shellcheck disable=SC1090
. "$conf"
api="${DSM_URL%/}/webapi/entry.cgi"
session=MeadowlakeHA

login=$(curl -sSk -m 10 "$api" -d api=SYNO.API.Auth -d version=6 -d method=login -d session=$session -d format=sid \
  --data-urlencode "account=$DSM_USER" --data-urlencode "passwd=$DSM_PASS" 2>&1)
sid=$(jq -r '.data.sid // empty' 2>/dev/null <<<"$login")
if [ -z "$sid" ]; then
  code=$(jq -r '.error.code // empty' 2>/dev/null <<<"$login")
  case "$code" in
    400) why="wrong user name or password" ;;
    401) why="the account is disabled" ;;
    402) why="the account isn't an administrator" ;;
    403|404|406) why="two-factor sign-in is on for the account" ;;
    407) why="DSM has blocked Home Assistant's address (Control Panel → Security → Protection)" ;;
    408|409|410) why="the account's password has expired or must be changed" ;;
    "") why="no answer from DSM: ${login:0:120}" ;;
    *) why="DSM error $code" ;;
  esac
  say_error "Couldn't sign in to DSM at $DSM_URL: $why"
fi

call() { curl -sSk -m 10 "$api" --data-urlencode "_sid=$sid" "$@" 2>/dev/null; }
json_or_empty() { jq -ce . 2>/dev/null <<<"$1" || echo '{}'; }

abb=$(json_or_empty "$(call -d api=SYNO.ActiveBackup.Task -d version=1 -d method=list \
  -d load_status=true -d load_result=true -d load_devices=false -d load_versions=false --data-urlencode 'filter={}')")
cloud=$(json_or_empty "$(call -d api=SYNO.CloudSync -d version=1 -d method=list_conn -d is_tray=false -d group_by=group_by_user)")
call -d api=SYNO.API.Auth -d version=6 -d method=logout -d session=$session >/dev/null

# $abb: SYNO.ActiveBackup.Task list. $cloud: SYNO.CloudSync list_conn. $now: unix time.
jq -cn --argjson abb "$abb" --argjson cloud "$cloud" --argjson now "$(date +%s)" '
# Active Backup result codes: 2 success, 3 partial, 4 failed, 5 cancelled. Anything else
# (a first run still going) is left out, so the helper keeps its last result.
def abb_result:
  if type != "object" then empty
  else
    ({"2": ["ok", "Backed up"], "3": ["failed", "Only partly backed up"],
      "4": ["failed", "Backup failed"], "5": ["failed", "Backup cancelled"]}[(.status | tostring)]) as $s
    | if $s == null then empty
      else
        ((.time_end // 0) as $end | if $end > 0 then $end else (.time_start // 0) end) as $t
        | ((.error_count // 0) as $e | if $e > 0 then " · \($e) error\(if $e == 1 then "" else "s" end)" else "" end) as $errs
        | "\($s[0]) @\($t): \($s[1])\($errs)"
      end
  end;

# Cloud Sync has no "last run": a connection is either fine (up to date or syncing) or not.
# A failure carries no time, so its text stays the same while the problem lasts and a
# dismissed alert stays dismissed.
def cloud_result:
  [ .[] | select(
      ((.status // "") | tostring | test("error|fail|abnormal|disconnect|unlink|denied|full"; "i"))
      or ((.link_status // 1) != 1)) ] as $bad
  | if length == 0 then empty
    elif ($bad | length) > 0 then
      "failed: " + ($bad | map("\(.task_name // .user_name // "Connection"): \(if (.link_status // 1) != 1 then "not connected" else .status end)") | join(", "))
    elif any(.[]; (.status // "") == "syncing") then "ok @\($now): Syncing"
    else "ok @\($now): Up to date"
    end;

([ ($abb.data.tasks // [])[]
   | select(.task_name != null)
   | (.last_result | abb_result) as $r
   | {key: .task_name, value: $r} ]
 + [ ($cloud.data.conn // []) | cloud_result | {key: "Cloud Sync", value: .} ])
| from_entries
'
