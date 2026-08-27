"""
Convert the filtered Indian ARGO Floats CSV (PLATFORM_NUMBER, time, latitude,
longitude, PRES, TEMP, PSAL) into per-float JSON for clickable markers +
depth-vs-variable Chart.js profile popups.

Output:
  out/argo/floats.json   -> [{ floatId, lat, lon, lastTime, nProfiles,
                                profiles: [{ depth, temp, salinity, time }, ...] }, ...]
  out/argo/manifest.json -> summary stats

Per the requested shape, each float has a single top-level lat/lon (used to
place its marker in the scene) plus a flat `profiles` array of
{depth, temp, salinity, time} readings spanning every cast that float made in
this dataset. The top-level lat/lon is the float's MOST RECENT fix (floats
drift, so earlier casts were at different positions) -- each profile entry
also carries its own time so the frontend can filter/group by cast if it
wants a track or a single-cast profile chart.
"""
import json
import pandas as pd

SRC = "/mnt/user-data/uploads/Indian_ARGO_Floats_filtered.csv"
OUT_DIR = "/home/claude/out/argo"
ROUND_DP = 3


def main():
    df = pd.read_csv(SRC)
    df["time"] = pd.to_datetime(df["time"], utc=True)
    df = df.sort_values(["PLATFORM_NUMBER", "time", "PRES"])

    floats_out = []
    for float_id, g in df.groupby("PLATFORM_NUMBER"):
        g = g.sort_values(["time", "PRES"])
        last_row = g.iloc[-1]

        profiles = [
            {
                "depth": round(float(row.PRES), 2),
                "temp": round(float(row.TEMP), ROUND_DP),
                "salinity": round(float(row.PSAL), ROUND_DP),
                "time": row.time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            }
            for row in g.itertuples()
        ]

        n_casts = g["time"].nunique()

        floats_out.append({
            "floatId": str(int(float_id)),
            "lat": round(float(last_row.latitude), 4),
            "lon": round(float(last_row.longitude), 4),
            "lastTime": last_row.time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "nCasts": int(n_casts),
            "nPoints": len(profiles),
            "profiles": profiles,
        })

    with open(f"{OUT_DIR}/floats.json", "w") as f:
        json.dump(floats_out, f)

    manifest = {
        "title": "Indian ARGO Floats -- Indian Ocean subset",
        "nFloats": len(floats_out),
        "nRows": int(len(df)),
        "latRange": [round(float(df.latitude.min()), 3), round(float(df.latitude.max()), 3)],
        "lonRange": [round(float(df.longitude.min()), 3), round(float(df.longitude.max()), 3)],
        "depthRange_m": [round(float(df.PRES.min()), 2), round(float(df.PRES.max()), 2)],
        "timeRange": [
            df.time.min().strftime("%Y-%m-%dT%H:%M:%SZ"),
            df.time.max().strftime("%Y-%m-%dT%H:%M:%SZ"),
        ],
        "variables": {
            "TEMP": {"units": "degC", "longName": "Temperature"},
            "PSAL": {"units": "PSU", "longName": "Practical Salinity"},
        },
        "note": (
            "Each float's top-level lat/lon is its most recent fix in this "
            "dataset (floats drift between casts); per-profile-point time is "
            "included so the frontend can group by cast for a single-date "
            "depth-vs-variable chart, or show all casts overlaid."
        ),
        "file": "floats.json",
    }
    with open(f"{OUT_DIR}/manifest.json", "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"floats: {manifest['nFloats']}")
    print(f"rows: {manifest['nRows']}")
    print(f"lat range: {manifest['latRange']}")
    print(f"lon range: {manifest['lonRange']}")
    print(f"depth range: {manifest['depthRange_m']}")
    print(f"time range: {manifest['timeRange']}")
    casts_per_float = df.groupby("PLATFORM_NUMBER")["time"].nunique()
    print(f"casts per float: min={casts_per_float.min()} median={casts_per_float.median()} max={casts_per_float.max()}")
    single_cast = int((casts_per_float == 1).sum())
    print(f"floats with only 1 cast (no time-series profile): {single_cast} / {len(casts_per_float)}")


if __name__ == "__main__":
    main()
