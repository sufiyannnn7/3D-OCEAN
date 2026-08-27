"""
Convert INCOIS ARGO 10-day gridded Variational Analysis NetCDF (TEMP + SAL,
dims: time x ZAX(depth) x latitude x longitude) into frontend-ready JSON for
Three.js depth-slice rendering.

Output layout:
  out/grid/manifest.json          -> grid metadata, depth levels, time steps, colorbar ranges
  out/grid/step_00.json ... step_06.json
        -> one file per timestep, each containing 24 depth-slices of TEMP + SAL
           as flat row-major (lat-major, then lon) arrays, missing values -> null

Only scipy + numpy are used (no netCDF4/xarray/h5py dependency), since the
source files are classic NetCDF3 ("CDF\x01" magic), which scipy.io.netcdf_file
reads natively.
"""
import json
import numpy as np
from datetime import datetime, timezone
from scipy.io import netcdf_file

SRC = "/mnt/user-data/uploads/incois_argo_10d_VAM_dc64_a3a7_9285_U1787844363889.nc"
OUT_DIR = "/home/claude/out/grid"
FILL_VALUE = -9999.0
ROUND_DP = 3  # decimal places to round TEMP/SAL to, keeps file size sane


def iso(ts):
    return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def main():
    nc = netcdf_file(SRC, "r", mmap=False)

    lat = nc.variables["latitude"].data.copy().astype(float)
    lon = nc.variables["longitude"].data.copy().astype(float)
    depth = nc.variables["ZAX"].data.copy().astype(float)
    time = nc.variables["time"].data.copy().astype(float)

    temp = nc.variables["TEMP"].data.copy().astype(np.float32)  # (time, depth, lat, lon)
    sal = nc.variables["SAL"].data.copy().astype(np.float32)

    n_time, n_depth, n_lat, n_lon = temp.shape
    assert (n_time, n_depth, n_lat, n_lon) == sal.shape

    # mask fill values -> NaN for stats, then -> null on JSON export
    temp_masked = np.where(temp == FILL_VALUE, np.nan, temp)
    sal_masked = np.where(sal == FILL_VALUE, np.nan, sal)

    temp_min, temp_max = float(np.nanmin(temp_masked)), float(np.nanmax(temp_masked))
    sal_min, sal_max = float(np.nanmin(sal_masked)), float(np.nanmax(sal_masked))

    # A handful of cells (71 of ~546k valid TEMP cells, all near the domain's
    # northern edge) carry physically implausible values up to ~51 degC --
    # almost certainly a DIVA interpolation artifact near a coastal boundary,
    # not real ocean temperature. Raw values are kept in the exported data,
    # but the colorbar default is clipped to the 0.5-99.5 percentile range so
    # a few bad cells don't wash out the color scale for the whole basin.
    temp_p_lo, temp_p_hi = np.nanpercentile(temp_masked, [0.5, 99.5])
    n_outliers_temp = int(np.sum((temp_masked > 35) | (temp_masked < -2)))

    # SAL had an authoritative colorbar range in the NetCDF metadata (32-37 PSU);
    # TEMP did not, so we derive a robust default from the actual data.
    manifest = {
        "title": "INCOIS ARGO 10-day Variational Analysis (TEMP + SAL)",
        "grid": {
            "nLat": n_lat,
            "nLon": n_lon,
            "latMin": float(lat.min()),
            "latMax": float(lat.max()),
            "lonMin": float(lon.min()),
            "lonMax": float(lon.max()),
            "latStep": float(round(lat[1] - lat[0], 4)),
            "lonStep": float(round(lon[1] - lon[0], 4)),
            "lats": [round(float(x), 3) for x in lat],
            "lons": [round(float(x), 3) for x in lon],
            "layout": "row-major, lat outer / lon inner (index = latIdx*nLon + lonIdx)",
        },
        "depths_m": [round(float(d), 2) for d in depth],
        "nDepth": n_depth,
        "times": [iso(t) for t in time],
        "nTime": n_time,
        "variables": {
            "TEMP": {
                "units": "degC",
                "longName": "Temperature",
                "colorBarMin": round(float(temp_p_lo), 2),
                "colorBarMax": round(float(temp_p_hi), 2),
                "dataMin": round(temp_min, 2),
                "dataMax": round(temp_max, 2),
                "note": (
                    f"colorBarMin/Max use the 0.5-99.5 percentile range for a "
                    f"clean color scale. {n_outliers_temp} of {int(np.sum(~np.isnan(temp_masked)))} "
                    "valid cells (all near the domain's northern edge) are "
                    "likely DIVA interpolation artifacts outside physical "
                    "ocean temp range; raw values are preserved in dataMin/dataMax "
                    "and in the per-step files, just excluded from the default color scale."
                ),
            },
            "SAL": {
                "units": "PSU",
                "longName": "Salinity",
                "colorBarMin": 32.0,
                "colorBarMax": 37.0,
            },
        },
        "missingValue": None,
        "sourceNote": (
            "INCOIS ERDDAP griddap dataset incois_argo_10d_VAM, "
            "10-day cadence, Indian Ocean domain."
        ),
        "files": [f"step_{i:02d}.json" for i in range(n_time)],
    }

    with open(f"{OUT_DIR}/manifest.json", "w") as f:
        json.dump(manifest, f)

    for ti in range(n_time):
        step = {
            "timeIndex": ti,
            "time": iso(time[ti]),
            "TEMP": [],
            "SAL": [],
        }
        for di in range(n_depth):
            t_slice = temp[ti, di]  # (lat, lon)
            s_slice = sal[ti, di]

            t_flat = [
                None if v == FILL_VALUE else round(float(v), ROUND_DP)
                for v in t_slice.flatten()
            ]
            s_flat = [
                None if v == FILL_VALUE else round(float(v), ROUND_DP)
                for v in s_slice.flatten()
            ]
            step["TEMP"].append(t_flat)
            step["SAL"].append(s_flat)

        with open(f"{OUT_DIR}/step_{ti:02d}.json", "w") as f:
            json.dump(step, f)

        print(f"wrote step_{ti:02d}.json  time={step['time']}")

    print("\nGrid summary")
    print(f"  shape (time, depth, lat, lon): {temp.shape}")
    print(f"  lat range: {lat.min()} .. {lat.max()}  ({n_lat} pts, step {lat[1]-lat[0]})")
    print(f"  lon range: {lon.min()} .. {lon.max()}  ({n_lon} pts, step {lon[1]-lon[0]})")
    print(f"  depth levels ({n_depth}): {depth.tolist()}")
    print(f"  time steps ({n_time}): {manifest['times']}")
    print(f"  TEMP range: {temp_min:.2f} .. {temp_max:.2f} degC")
    print(f"  SAL range: {sal_min:.2f} .. {sal_max:.2f} PSU (colorbar fixed 32-37)")

    total_cells = n_time * n_depth * n_lat * n_lon
    missing_temp = int(np.isnan(temp_masked).sum())
    print(f"  total grid cells per variable: {total_cells}")
    print(f"  missing/land TEMP cells: {missing_temp} ({100*missing_temp/total_cells:.1f}%)")


if __name__ == "__main__":
    main()
