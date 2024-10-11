# Queering the Map (static archive)

This is a completely static preservation / restoration of the
[queeringthemap.com](https://queeringthemap.com) site, which was
offline for about a month in June 2024.

This is intended as a harmless experiment, and also serves as a backup
in case **Queering the Map** ever permanently disappears.

In addition, due to the way the data is loaded, this version has much
better performance than the original QtM which may enable users on low
power devices to access it.

## Recovering the Data

Fortunately the Internet Archive has captured what appears to be a very
recent copy (as of 2024-06-07) of the user submitted data. The
`download.sh` script downloads this.

`writejson.py` simply unpacks the msgpack format and puts all the data
into a single JSON file.

## Processing the Data

Processing is done with the `zoom.py` script.

I had several requirements for the data format:

 * It needs to be easy and efficient to get *random* points in a
   specific tile of the map (i.e. zoom level + location).
 * Data must not be needless duplicated.
 * It needs to be easy and efficient to see *all* the points in a
   location when you're zoomed in far enough.

I settled on the following approach:

 * Each zoom level divides each tile of the previous level into 4 pieces.
   The highest zoom level (0) has 1 tile, a 360° by 360°. The tiles are
   numbered, starting from 0 at -180° longitude, -90° latitude. So each
   tile has the unique representation `(x, y, zoom)`.
 * The data is stored as a flat map with `(x, y, zoom)` keys.
 * If a tile at any level contains 25 or fewer points, they are stored
   together as an array with that key, and any higher zoom levels inside
   that tile are omitted. This also occurs if the zoom index is at its
   highest level.
 * If a tile contains more than 25 points, the entry for that tile will
   not contain any points, and will instead have the counts of the four
   sub-tiles, in order of increasing longitude, then latitude.

So we end up with something like the following:

```JSON
{
  "0,0,0": {
    "counts": [
      107330,
      49955,
      1,
      1
    ]
  },
  "0,0,1": {
    "counts": [
      309,
      3134,
      35054,
      68833
    ]
  },
  "1,0,1": {
    "counts": [
      866,
      9810,
      33838,
      5441
    ]
  },
  "0,1,1": {
    "moments": [
      {
        "latitude": 90.0,
        "longitude": -165.1115803611351,
        "description": "did the gay in space :)",
        "id": 42068
      }
    ]
  },
  ...
```

## Presentation of the Data

For performance, we want to choose a random selection of points to show
when zoomed out, rather than showing all (~150k+) points. This causes
several issues:

 * The randomizatization must not choose the same points every time, as
   doing so would prefer some messages over others.
 * Points selected to be visible at higher levels must remain visible when
   zoomed in, as otherwise points would be popping in and out when moving
   around the map.
 * Points not currently visible must be unloaded so as not to cause
   performance issues.

I solved this problem with a PRNG seeded by a static seed determined at
page load, along with the current tile `(x, y, zoom)`. When the user views
the map at a given zoom level `z`, a set of 25 random points is chosen for
each tile in the current field of view at each zoom level less than or equal
to `z`. Since the PRNG is reset between each of these selections, the same
points will always be chosen for the same tile on a given page load.

Point selection for a tile happens by looking up the tile in the data. If
the tile contains no points, of course there is nothing to do. If there are
25 or fewer points in the tile, then we just load the points directly from
the array (as detailed above). If there are more than 25 points, we use the
PRNG to perform a weighted random selection between the four subtiles, using
the stored counts for those subtiles. Weighting the average in this way means
that the points selected for display in a given tile are truly random.

One (current) limitation is that I don't try to balance *between* tiles that
are selected for display. If a tile is at a zoom level less than or equal to
the current zoom level, and in the field of view, I always try to load 25
points from it, even though some such tiles will have many more points than
others. This may actually help to "fill out" the map visually, and it doesn't
really "feel" non-random.
