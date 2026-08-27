const fs = require('fs');
const path = require('path');

// Ensure output directories
const gridDir = path.join(__dirname, '..', 'public', 'data', 'grid');
const argoDir = path.join(__dirname, '..', 'public', 'data', 'argo');
const assetsDir = path.join(__dirname, '..', 'public', 'assets');

[gridDir, argoDir, assetsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Grid Dimensions
const LAT_MIN = -29.5;
const LAT_MAX = 29.5;
const LAT_COUNT = 60; // ~1.0 deg step

const LON_MIN = 30.5;
const LON_MAX = 119.5;
const LON_COUNT = 90; // ~1.0 deg step

const lats = [];
for (let i = 0; i < LAT_COUNT; i++) {
  lats.push(Number((LAT_MIN + (i * (LAT_MAX - LAT_MIN)) / (LAT_COUNT - 1)).toFixed(2)));
}

const lons = [];
for (let i = 0; i < LON_COUNT; i++) {
  lons.push(Number((LON_MIN + (i * (LON_MAX - LON_MIN)) / (LON_COUNT - 1)).toFixed(2)));
}

// 24 Standard depth levels (meters)
const depths = [
  0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 
  200, 250, 300, 400, 500, 600, 750, 1000, 
  1250, 1500, 1750, 2000, 2500, 3000
];

// 7 Timesteps (SW Monsoon 2026 Progression)
const timesteps = [
  { id: "step_00", date: "2026-05-30", label: "May 30, 2026", phase: "Pre-Monsoon Thermal High" },
  { id: "step_01", date: "2026-06-09", label: "Jun 09, 2026", phase: "SW Monsoon Arabian Sea Onset" },
  { id: "step_02", date: "2026-06-19", label: "Jun 19, 2026", phase: "Somali Jet Intensification" },
  { id: "step_03", date: "2026-06-29", label: "Jun 29, 2026", phase: "Active Monsoon & Findlater Jet" },
  { id: "step_04", date: "2026-07-09", label: "Jul 09, 2026", phase: "Peak Somali Upwelling & BoB Runoff" },
  { id: "step_05", date: "2026-07-19", label: "Jul 19, 2026", phase: "Monsoon Intra-Seasonal Oscillation" },
  { id: "step_06", date: "2026-07-30", label: "Jul 30, 2026", phase: "Late Monsoon Stable Stratification" }
];

// Helper: Check if a (lat, lon) point is on Land in the Indian Ocean domain
function isLand(lat, lon) {
  // Africa
  if (lon < 39 && lat > -30) return true;
  if (lon < 42 && lat > -15 && lat < 12) return true;
  if (lon < 51 && lat > 8 && lat < 12) {
    // Horn of Africa / Somalia tip
    if (lat < 11.5 && lon < 50.5) return true;
  }
  if (lon < 44 && lat > 12) return true;

  // Madagascar
  if (lon >= 43.5 && lon <= 50.5 && lat >= -25.5 && lat <= -12.0) {
    // Narrow polygon approximation
    const midLon = 47.0;
    if (Math.abs(lon - midLon) < (25.5 + lat) * 0.2 + 1.2) return true;
  }

  // Arabian Peninsula / Middle East
  if (lat >= 12.5 && lat <= 30) {
    if (lon >= 43 && lon <= 59.5) {
      // Red sea cutout
      if (lon < 43.5 && lat < 15) return false;
      // Persian gulf cutout
      if (lat > 24 && lon > 50 && lon < 56) return false;
      // Oman / Yemen land
      if (lat >= 13 && lon <= 59) return true;
    }
    // Iran / Pakistan
    if (lat >= 24.5 && lon >= 57 && lon <= 68.5) return true;
  }

  // Indian Subcontinent
  if (lat >= 7.8 && lat <= 30) {
    // Southern tip tapering down to Kanyakumari (lat 8.0, lon 77.5)
    if (lat < 15) {
      const halfWidth = (lat - 7.5) * 1.5;
      if (Math.abs(lon - 77.5) <= halfWidth) return true;
    } else if (lat < 23) {
      if (lon >= 72.5 && lon <= 87.0) return true;
    } else {
      if (lon >= 67.5 && lon <= 90.0) return true;
    }
  }

  // Sri Lanka
  if (lat >= 5.8 && lat <= 9.8 && lon >= 79.5 && lon <= 82.0) return true;

  // Southeast Asia / Myanmar / Thailand / Malaysia / Sumatra / Java
  if (lat >= 0 && lat <= 30) {
    if (lon >= 92 && lat >= 15 && lon <= 105) return true; // Myanmar/Thailand/Indochina
    if (lon >= 99 && lat >= 1.2 && lat < 15) return true; // Malay Peninsula
  }
  // Sumatra & Java
  if (lat >= -6 && lat <= 5.8 && lon >= 95 && lon <= 106) {
    // NW-SE diagonal of Sumatra
    const expectedLon = 95 + (5.8 - lat) * 1.8;
    if (Math.abs(lon - expectedLon) < 2.5) return true;
  }
  if (lat >= -8.8 && lat <= -5.8 && lon >= 105.5 && lon <= 116) return true; // Java

  // Australia (Northwest)
  if (lat <= -11.5 && lon >= 114) {
    if (lat <= -19 || lon >= 121 || (lat <= -14 && lon >= 125)) return true;
    if (lat <= -12.5 && lon >= 115 && lon + lat * 1.5 > 98) return true;
  }

  return false;
}

// Generate Gridded Manifest
const gridManifest = {
  version: "1.0.0",
  source: "INCOIS (Indian National Centre for Ocean Information Services)",
  dataset: "INCOIS-GODAS Indian Ocean High-Resolution Assimilation Product",
  spatialDomain: {
    latMin: LAT_MIN,
    latMax: LAT_MAX,
    latCount: LAT_COUNT,
    lonMin: LON_MIN,
    lonMax: LON_MAX,
    lonCount: LON_COUNT,
    latitudes: lats,
    longitudes: lons
  },
  verticalDomain: {
    depthLevelsCount: depths.length,
    depths: depths,
    unit: "meters"
  },
  temporalDomain: {
    timestepsCount: timesteps.length,
    timesteps: timesteps
  },
  variables: {
    temperature: {
      name: "Sea Water Potential Temperature",
      symbol: "T",
      unit: "°C",
      validRange: [1.8, 32.5],
      displayRange: {
        surface: [22.0, 31.0],
        global: [2.0, 31.0]
      },
      colorMap: "turbo",
      description: "Conservative temperature profile across upper and deep Indian Ocean water masses."
    },
    salinity: {
      name: "Practical Salinity",
      symbol: "S",
      unit: "PSU",
      validRange: [30.0, 38.0],
      displayRange: {
        surface: [32.0, 36.8],
        global: [33.5, 37.0]
      },
      colorMap: "haline",
      description: "Salinity highlighting Arabian Sea high-salinity core and Bay of Bengal freshwater plume."
    }
  },
  anomaliesNote: "A small number of high-latitude boundary values near northern margin contain model edge flags. Display range defaults protect visual contrast."
};

fs.writeFileSync(path.join(gridDir, 'manifest.json'), JSON.stringify(gridManifest, null, 2));
console.log('Created grid manifest.json');

// Generate 7 Timestep JSON files
timesteps.forEach((step, tIdx) => {
  // 3D Array: [depth_idx][lat_idx][lon_idx]
  // To keep payload compact and fast, we store arrays or flattened float arrays.
  // We'll store a clean structured JSON:
  // {
  //   stepId: "step_00",
  //   date: "2026-05-30",
  //   temperature: [ [ [values... lon] ... lat] ... depth ],
  //   salinity: [ [ [values... lon] ... lat] ... depth ]
  // }

  const tFrac = tIdx / (timesteps.length - 1); // 0.0 to 1.0 (Progression of SW Monsoon)
  const upwellingStrength = Math.sin(tFrac * Math.PI * 0.9 + 0.1); // peaks at step 4 (July)
  const riverDischargeStrength = Math.pow(tFrac, 1.4); // increases towards July

  const temp3D = [];
  const salt3D = [];

  for (let d = 0; d < depths.length; d++) {
    const depth = depths[d];
    const tempLatLon = [];
    const saltLatLon = [];

    // Vertical stratification factors
    // Thermocline steepness
    const thermoclineDepth = 120 - 30 * Math.sin(tFrac * Math.PI); // shallowing during upwelling
    const tempZ = 2.2 + 26.5 / (1 + Math.exp((depth - thermoclineDepth) / 55));
    const saltZDeep = 34.72 + (0.08 * (3000 - depth)) / 3000;

    for (let latI = 0; latI < LAT_COUNT; latI++) {
      const lat = lats[latI];
      const tempRow = [];
      const saltRow = [];

      for (let lonI = 0; lonI < LON_COUNT; lonI++) {
        const lon = lons[lonI];

        if (isLand(lat, lon)) {
          tempRow.push(null);
          saltRow.push(null);
          continue;
        }

        // --- TEMPERATURE PHYSICS ---
        let baseSST = 28.5;

        // Equatorial warm pool (Lon 65 - 100, Lat -5 to +5)
        const eqDist = Math.abs(lat);
        const warmPoolCore = Math.exp(-Math.pow((lon - 85) / 22, 2) - Math.pow(lat / 8, 2));
        baseSST += 1.8 * warmPoolCore;

        // Southern Ocean cooling gradient
        if (lat < -10) {
          baseSST -= Math.pow((Math.abs(lat) - 10) / 19.5, 1.4) * 8.5;
        }

        // Arabian Sea & Bay of Bengal SST differences
        if (lat > 5 && lon < 76) {
          // Arabian Sea
          // Strong Somali & Oman coastal upwelling in June/July (SW monsoon)
          const distToSomalia = Math.sqrt(Math.pow((lon - 51) / 8, 2) + Math.pow((lat - 11) / 6, 2));
          const somaliCooling = Math.exp(-distToSomalia) * 6.8 * upwellingStrength;
          
          const distToOman = Math.sqrt(Math.pow((lon - 58) / 7, 2) + Math.pow((lat - 19) / 5, 2));
          const omanCooling = Math.exp(-distToOman) * 5.2 * upwellingStrength;

          baseSST = baseSST - somaliCooling - omanCooling + 0.5 * (1 - tFrac);
        } else if (lat > 5 && lon >= 78 && lon <= 95) {
          // Bay of Bengal: stays very warm due to freshwater cap stratification
          baseSST += 0.6 - 0.4 * riverDischargeStrength;
        }

        // Temperature depth decay with thermocline
        let localTemp;
        if (depth === 0) {
          localTemp = baseSST;
        } else if (depth <= 50) {
          // Mixed layer
          localTemp = baseSST - 0.005 * depth;
        } else if (depth <= 400) {
          // Thermocline transition
          const blend = (depth - 50) / 350;
          const deepAt400 = 10.5;
          localTemp = baseSST * (1 - blend) + deepAt400 * blend - (lat < -15 ? 2.5 : 0);
        } else if (depth <= 1000) {
          const blend = (depth - 400) / 600;
          localTemp = 10.5 * (1 - blend) + 4.8 * blend;
        } else {
          const blend = (depth - 1000) / 2000;
          localTemp = 4.8 * (1 - blend) + 1.9 * blend;
        }

        // Add subtle ocean meso-scale eddy perturbations
        const eddy1 = 0.35 * Math.sin(lat * 0.4 + lon * 0.3 + tIdx * 0.7);
        const eddy2 = 0.25 * Math.cos(lat * 0.8 - lon * 0.5 + tIdx * 0.5);
        localTemp += (eddy1 + eddy2) * Math.exp(-depth / 300);

        // Northern boundary rare anomalous value (as specified in dataset quality prompt)
        if (latI === LAT_COUNT - 1 && lonI === 45 && depth === 0) {
          localTemp = 41.5; // Single northern edge outlier
        }

        // --- SALINITY PHYSICS ---
        let localSalt = 35.0;

        if (depth < 250) {
          // Surface & subsurface salinity regimes
          if (lon < 75 && lat > 5) {
            // Arabian Sea High Salinity Water (ASHSW: 36.2 - 37.2 PSU)
            const asCore = Math.exp(-Math.pow((lon - 64) / 12, 2) - Math.pow((lat - 18) / 8, 2));
            localSalt = 36.1 + 0.9 * asCore - (depth / 250) * 0.4;
          } else if (lon >= 80 && lon <= 96 && lat > 5) {
            // Bay of Bengal Low Salinity Pool (BoB freshwater plume from Ganga/Brahmaputra: 31.5 - 33.5 PSU)
            const riverHead = Math.exp(-Math.pow((lon - 89) / 8, 2) - Math.pow((lat - 21) / 7, 2));
            const boBSurface = 33.8 - (2.4 * riverDischargeStrength + 0.8) * riverHead;
            // Strong halocline (salinity jumps up rapidly below 50m)
            const haloclineBlend = Math.min(1.0, depth / 120);
            localSalt = boBSurface * (1 - haloclineBlend) + 34.85 * haloclineBlend;
          } else if (lat < -15) {
            // South Indian Ocean Subtropical Salinity Maximum (~35.6 PSU at surface)
            localSalt = 35.5 + 0.3 * Math.sin((lat + 20) * 0.2) - (depth / 300) * 0.3;
          } else {
            // Equatorial intermediate salinity (34.8 - 35.2 PSU)
            localSalt = 34.9 + 0.3 * Math.sin(lon * 0.1);
          }
        } else if (depth <= 1000) {
          // Red Sea / Persian Gulf Water intrusion at 400-800m in NW Indian Ocean
          const rswInfluence = (lon < 72 && lat > 8) ? Math.exp(-Math.pow((depth - 600) / 180, 2)) * 0.65 : 0;
          localSalt = 34.85 + rswInfluence;
        } else {
          // Deep uniform salinity
          localSalt = saltZDeep + 0.03 * Math.sin(lat * 0.1);
        }

        // Small eddy noise
        localSalt += 0.05 * Math.sin(lat * 0.6 + lon * 0.4 + tIdx * 0.9) * Math.exp(-depth / 400);

        tempRow.push(Number(localTemp.toFixed(2)));
        saltRow.push(Number(localSalt.toFixed(2)));
      }
      tempLatLon.push(tempRow);
      saltLatLon.push(saltRow);
    }
    temp3D.push(tempLatLon);
    salt3D.push(saltLatLon);
  }

  const stepData = {
    stepId: step.id,
    date: step.date,
    label: step.label,
    phase: step.phase,
    temperature: temp3D,
    salinity: salt3D
  };

  fs.writeFileSync(path.join(gridDir, `${step.id}.json`), JSON.stringify(stepData));
  console.log(`Generated ${step.id}.json`);
});

// Generate Argo Floats Catalog & Observations
const argoFloats = [
  {
    wmo: "2902741",
    platform: "Apex Profiler (INCOIS-MoES)",
    program: "Indian Ocean Argo Implementation",
    status: "ACTIVE",
    sensorPayload: "Sea-Bird SBE 41CP CTD + Aanderaa Optode DOXY",
    deployDate: "2024-03-15",
    basin: "Arabian Sea (Central Basin)",
    startPos: { lat: 14.8, lon: 66.2 },
    driftVelocity: { dLat: 0.12, dLon: 0.18 }
  },
  {
    wmo: "2902742",
    platform: "Provor CTS4 (INCOIS)",
    program: "Bay of Bengal Monsoon Experiment (BoBMEX)",
    status: "ACTIVE",
    sensorPayload: "SBE 41CTD + Satlantic OCR-504 Radiometer",
    deployDate: "2024-05-10",
    basin: "Bay of Bengal (Northern Plume)",
    startPos: { lat: 17.5, lon: 88.4 },
    driftVelocity: { dLat: -0.08, dLon: 0.22 }
  },
  {
    wmo: "2902195",
    platform: "Navis-BGC (INCOIS)",
    program: "Equatorial Indian Ocean Upwelling Study",
    status: "ACTIVE",
    sensorPayload: "SBE 41CP + SBE 63 DO + WetLabs ECO FLbb",
    deployDate: "2023-11-20",
    basin: "Equatorial Indian Ocean (Wyrtki Jet)",
    startPos: { lat: 0.5, lon: 80.5 },
    driftVelocity: { dLat: -0.02, dLon: 0.45 }
  },
  {
    wmo: "2902210",
    platform: "Arvor Deep 4000 (INCOIS)",
    program: "Somali Current & Upwelling Dynamics",
    status: "ACTIVE",
    sensorPayload: "SBE 41CP High-Accuracy CTD",
    deployDate: "2024-01-18",
    basin: "Western Arabian Sea (Somali Jet)",
    startPos: { lat: 10.2, lon: 54.0 },
    driftVelocity: { dLat: 0.25, dLon: 0.32 }
  },
  {
    wmo: "6903201",
    platform: "Apex Profiler (INCOIS-RAMA)",
    program: "RAMA Moored Buoy Co-located Float Network",
    status: "ACTIVE",
    sensorPayload: "SBE 41CP CTD",
    deployDate: "2023-08-04",
    basin: "South-Central Indian Ocean",
    startPos: { lat: -8.5, lon: 73.0 },
    driftVelocity: { dLat: 0.05, dLon: -0.15 }
  },
  {
    wmo: "5904588",
    platform: "Provor-IV (INCOIS)",
    program: "South Indian Ocean Subtropical Gyre Exploration",
    status: "ACTIVE",
    sensorPayload: "SBE 41CP CTD + Transmissometer",
    deployDate: "2024-02-28",
    basin: "South Indian Ocean Gyre",
    startPos: { lat: -21.4, lon: 85.0 },
    driftVelocity: { dLat: -0.10, dLon: -0.28 }
  },
  {
    wmo: "2902804",
    platform: "Navis Auto-Profiler (INCOIS)",
    program: "Southwest Bay of Bengal Circulation",
    status: "ACTIVE",
    sensorPayload: "SBE 41CP CTD",
    deployDate: "2024-04-02",
    basin: "Bay of Bengal (Sri Lanka Dome)",
    startPos: { lat: 8.8, lon: 83.5 },
    driftVelocity: { dLat: 0.15, dLon: -0.12 }
  },
  {
    wmo: "2902911",
    platform: "Apex Profiler (INCOIS)",
    program: "Oman Upwelling & Oxygen Minimum Zone (OMZ)",
    status: "ACTIVE",
    sensorPayload: "SBE 41CP CTD + SBE 43 DO Sensor",
    deployDate: "2024-03-01",
    basin: "Northern Arabian Sea (OMZ Core)",
    startPos: { lat: 21.0, lon: 63.5 },
    driftVelocity: { dLat: -0.12, dLon: 0.14 }
  },
  {
    wmo: "6903882",
    platform: "Arvor CTS5 (INCOIS)",
    program: "Eastern Equatorial Indian Ocean / Sumatra Coast",
    status: "ACTIVE",
    sensorPayload: "SBE 41CP CTD + Chlorophyll Fluorometer",
    deployDate: "2023-12-12",
    basin: "Eastern Indian Ocean (Sumatra Basin)",
    startPos: { lat: -3.8, lon: 98.2 },
    driftVelocity: { dLat: 0.18, dLon: -0.09 }
  },
  {
    wmo: "5906103",
    platform: "Apex Profiler (INCOIS)",
    program: "Mozambique Channel Eddies & Agulhas Inflow",
    status: "ACTIVE",
    sensorPayload: "SBE 41CP CTD",
    deployDate: "2024-01-05",
    basin: "Mozambique Channel",
    startPos: { lat: -18.2, lon: 41.5 },
    driftVelocity: { dLat: -0.22, dLon: 0.08 }
  },
  {
    wmo: "2903102",
    platform: "Provor-Bio (INCOIS)",
    program: "Lakshadweep High & Mini Warm Pool Study",
    status: "ACTIVE",
    sensorPayload: "SBE 41CP + Nitrate + pH + Optode",
    deployDate: "2024-04-19",
    basin: "Southeastern Arabian Sea",
    startPos: { lat: 10.8, lon: 72.8 },
    driftVelocity: { dLat: 0.08, dLon: 0.11 }
  },
  {
    wmo: "2903255",
    platform: "Navis-EBR (INCOIS)",
    program: "Ninety East Ridge Deep Flow Monitoring",
    status: "ACTIVE",
    sensorPayload: "SBE 41CP CTD",
    deployDate: "2023-10-14",
    basin: "Ninety East Ridge Transect",
    startPos: { lat: -12.0, lon: 90.0 },
    driftVelocity: { dLat: 0.14, dLon: -0.18 }
  }
];

// Generate float observations per timestep
const argoDataOutput = argoFloats.map(floatMeta => {
  const cycles = timesteps.map((step, tIdx) => {
    // Current float position drifting with current
    const currentLat = Number((floatMeta.startPos.lat + floatMeta.driftVelocity.dLat * tIdx).toFixed(2));
    const currentLon = Number((floatMeta.startPos.lon + floatMeta.driftVelocity.dLon * tIdx).toFixed(2));

    // Generate CTD vertical profile (0 to 2000m)
    const profileDepths = [
      0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 250, 
      300, 400, 500, 600, 750, 1000, 1250, 1500, 1750, 2000
    ];

    const tFrac = tIdx / (timesteps.length - 1);
    const upwellingEffect = (floatMeta.basin.includes("Somali") || floatMeta.basin.includes("Oman")) ? Math.sin(tFrac * Math.PI) * 4.5 : 0;
    const freshwaterEffect = floatMeta.basin.includes("Bay of Bengal") ? Math.pow(tFrac, 1.2) * 2.2 : 0;

    const temperatures = [];
    const salinities = [];
    const pressures = [];
    const densities = [];

    // Surface conditions for this float
    let sst = 28.6;
    let sss = 35.2;

    if (floatMeta.basin.includes("Arabian Sea") || floatMeta.basin.includes("Somali") || floatMeta.basin.includes("Oman")) {
      sst = 29.2 - upwellingEffect;
      sss = 36.6 + 0.2 * Math.sin(tIdx);
    } else if (floatMeta.basin.includes("Bay of Bengal")) {
      sst = 29.8;
      sss = 33.2 - freshwaterEffect;
    } else if (currentLat < -15) {
      sst = 22.4 - Math.abs(currentLat + 15) * 0.6;
      sss = 35.7;
    }

    profileDepths.forEach(z => {
      // Pressure roughly depth in dbar
      const p = Number((z * 1.01).toFixed(1));
      pressures.push(p);

      // Temperature profile
      let t;
      if (z === 0) t = sst;
      else if (z <= 40) t = sst - 0.01 * z;
      else if (z <= 250) {
        const bl = (z - 40) / 210;
        t = (sst - 0.4) * (1 - bl) + 14.2 * bl;
      } else if (z <= 1000) {
        const bl = (z - 250) / 750;
        t = 14.2 * (1 - bl) + 5.2 * bl;
      } else {
        const bl = (z - 1000) / 1000;
        t = 5.2 * (1 - bl) + 2.1 * bl;
      }
      // Float sensor precision noise
      t += 0.04 * Math.sin(z * 0.15 + tIdx);
      temperatures.push(Number(t.toFixed(2)));

      // Salinity profile
      let s;
      if (z <= 50) {
        s = sss;
      } else if (z <= 200) {
        // Halocline / subsurface salinity maximum
        if (sss < 34.5) {
          // Bay of Bengal sharp halocline
          const bl = (z - 50) / 150;
          s = sss * (1 - bl) + 34.9 * bl;
        } else {
          s = sss - 0.003 * (z - 50);
        }
      } else if (z <= 800) {
        // Red Sea Water intrusion in Arabian Sea
        if (floatMeta.basin.includes("Arabian")) {
          const rsw = Math.exp(-Math.pow((z - 550) / 150, 2)) * 0.55;
          s = 35.1 + rsw;
        } else {
          s = 34.85 + 0.05 * Math.cos(z * 0.02);
        }
      } else {
        s = 34.72 + (0.05 * (2000 - z)) / 1000;
      }
      s += 0.02 * Math.cos(z * 0.1 + tIdx);
      salinities.push(Number(s.toFixed(2)));

      // Approximate Potential Density (Sigma-Theta kg/m^3)
      const sigma = 28.0 - 0.25 * t + 0.78 * (s - 35.0) + (p * 0.004);
      densities.push(Number(sigma.toFixed(2)));
    });

    return {
      cycleNumber: tIdx + 1,
      stepId: step.id,
      timestamp: step.date,
      dateLabel: step.label,
      latitude: currentLat,
      longitude: currentLon,
      depths: profileDepths,
      temperature: temperatures,
      salinity: salinities,
      pressure: pressures,
      sigmaTheta: densities
    };
  });

  return {
    ...floatMeta,
    latestPosition: cycles[cycles.length - 1],
    trajectory: cycles.map(c => ({
      stepId: c.stepId,
      timestamp: c.timestamp,
      dateLabel: c.dateLabel,
      latitude: c.latitude,
      longitude: c.longitude
    })),
    profiles: cycles
  };
});

const argoManifest = {
  version: "1.0.0",
  source: "INCOIS Argo Data Assembly Centre (DAC) / MoES India",
  description: "High-resolution CTD vertical profiles from Indian Ocean active robotic profiling floats.",
  totalFloats: argoDataOutput.length,
  activeFloats: argoDataOutput.filter(f => f.status === "ACTIVE").length,
  variables: ["temperature", "salinity", "pressure", "sigmaTheta"],
  depthRange: [0, 2000]
};

fs.writeFileSync(path.join(argoDir, 'manifest.json'), JSON.stringify(argoManifest, null, 2));
fs.writeFileSync(path.join(argoDir, 'floats.json'), JSON.stringify(argoDataOutput, null, 2));
console.log('Created argo manifest.json & floats.json with', argoDataOutput.length, 'floats.');
