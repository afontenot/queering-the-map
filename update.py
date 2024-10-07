import json
import requests
from collections import defaultdict
from math import floor
from time import sleep


MAXMOM = 25
MAXZOOM = 19

with open("zoom.json") as f:
    moments_j = json.load(f)

moments = {}
for x in moments_j.values():
    for mom in x.get("moments", []):
        moments[mom["id"]] = mom

session = requests.Session()

print("Fetching moments")
r = session.get("https://www.queeringthemap.com/data/moments.json")
updates = r.json()

added_moments = 0
for update in updates["features"]:
    update_id = update["id"]
    if not update_id in moments:
        sleep(0.5)
        url = f"https://www.queeringthemap.com/moment/{update_id}"
        added_moments += 1
        print(added_moments, url)
        r = session.get(url)
        r.raise_for_status()
        j = r.json()
        moments[update_id] = {
            "id": update["id"],
            "latitude": update["geometry"]["coordinates"][1],
            "longitude": update["geometry"]["coordinates"][0],
            "description": j["description"],
        }

j = {}

# keys: (lon_i, lat_i)
store = {(0, 0): list(moments.values())}
nextstore = defaultdict(list)

for zoom in range(MAXZOOM + 1):
    boxwidth = 2 ** zoom
    nextboxwidth = 2 ** (zoom + 1)
    for box, moments in store.items():
        key = ",".join(str(x) for x in (box[0], box[1], zoom))
        if len(moments) <= MAXMOM or zoom == MAXZOOM:
            j[key] = {"moments": moments}
            continue

        counts = [0, 0, 0, 0]

        for moment in moments:
            lat = moment["latitude"]
            lon = moment["longitude"]
            next_lat_box = floor((lat + 90) / 360 * nextboxwidth)
            next_lon_box = floor((lon + 180) / 360 * nextboxwidth)
            nextstore[(next_lon_box, next_lat_box)].append(moment)

            lat_box = floor((lat + 90) / 360 * boxwidth)
            lon_box = floor((lon + 180) / 360 * boxwidth)
            next_lat_partition = int(next_lat_box >= 2 * lat_box + 1)
            next_lon_partition = int(next_lon_box >= 2 * lon_box + 1)
            counts[2 * next_lat_partition + next_lon_partition] += 1

        j[key] = {"counts": counts}

    store = nextstore
    nextstore = defaultdict(list)

with open("zoom.json", "w") as f:
    f.write(json.dumps(j))
