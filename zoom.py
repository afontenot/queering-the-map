import json
from collections import defaultdict
from math import floor


MAXMOM = 25
MAXZOOM = 19

with open("moments.json") as f:
    moments = json.loads(f.read())

j = {}

# keys: (lon_i, lat_i)
store = {(0, 0): moments}
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
