import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { defaultCoordTransform } from '../../services/coordinateTransform';
import { GridManifest, TimestepData, VisualizationSettings } from '../../types/ocean';
import { ArgoFloat } from '../../types/argo';
import { WaveManifest, WaveTimestepData, WaveSettings, WaveSample } from '../../types/wave';
import { OceanSliceMesh } from './OceanSliceMesh';
import { SeabedMesh } from './SeabedMesh';
import { ArgoMarkers } from './ArgoMarkers';
import { LandmassMesh } from './LandmassMesh';
import { CoordinateAxes } from './CoordinateAxes';
import { WaveSurfaceMesh } from './WaveSurfaceMesh';
import { gridDataLoader } from '../../services/gridDataLoader';
import { waveDataLoader } from '../../services/waveDataLoader';

export interface OceanCanvasProps {
  manifest: GridManifest;
  stepData: TimestepData;
  floats: ArgoFloat[];
  settings: VisualizationSettings;
  waveManifest?: WaveManifest | null;
  waveStepData?: WaveTimestepData | null;
  waveSettings?: WaveSettings;
  hoveredFloatId: string | null;
  selectedFloatId: string | null;
  onHoverFloat: (floatId: string | null, float: ArgoFloat | null, screenPos: { x: number; y: number } | null) => void;
  onSelectFloat: (floatId: string | null) => void;
  onHoverOcean: (info: { lat: number; lon: number; depth: number; value: number | null } | null, screenPos: { x: number; y: number } | null) => void;
  onHoverWave?: (sample: WaveSample | null) => void;
  resetViewTrigger: number;
}

export const OceanCanvas: React.FC<OceanCanvasProps> = ({
  manifest,
  stepData,
  floats,
  settings,
  waveManifest,
  waveStepData,
  waveSettings,
  hoveredFloatId,
  selectedFloatId,
  onHoverFloat,
  onSelectFloat,
  onHoverOcean,
  onHoverWave,
  resetViewTrigger,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  // Layer references
  const sliceLayerRef = useRef<OceanSliceMesh | null>(null);
  const seabedLayerRef = useRef<SeabedMesh | null>(null);
  const argoLayerRef = useRef<ArgoMarkers | null>(null);
  const landLayerRef = useRef<LandmassMesh | null>(null);
  const axesLayerRef = useRef<CoordinateAxes | null>(null);
  const waveLayerRef = useRef<WaveSurfaceMesh | null>(null);

  // Camera transition
  const cameraTargetPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 52, 68));
  const controlsTargetPos = useRef<THREE.Vector3>(new THREE.Vector3(0, -4, 0));
  const isTransitioningCamera = useRef<boolean>(false);

  // Raycaster
  const raycaster = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouse = useRef<THREE.Vector2>(new THREE.Vector2());

  // Initialize Three.js Scene
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030814);
    scene.fog = new THREE.FogExp2(0x030814, 0.0055);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 1000);
    camera.position.set(0, 52, 70);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 + 0.05;
    controls.minDistance = 10;
    controls.maxDistance = 250;
    controls.target.set(0, -4, 0);
    controlsRef.current = controls;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xddeeff, 0.65);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    sunLight.position.set(40, 80, 50);
    sunLight.castShadow = true;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x00f2fe, 0.35);
    fillLight.position.set(-50, -20, -50);
    scene.add(fillLight);

    const hemiLight = new THREE.HemisphereLight(0x70b5ff, 0x071226, 0.4);
    scene.add(hemiLight);

    // 6. Instantiate 3D Layers
    const sliceLayer = new OceanSliceMesh(manifest);
    scene.add(sliceLayer.group);
    sliceLayerRef.current = sliceLayer;

    const seabedLayer = new SeabedMesh();
    scene.add(seabedLayer.group);
    seabedLayerRef.current = seabedLayer;

    const argoLayer = new ArgoMarkers();
    argoLayer.setFloats(floats);
    scene.add(argoLayer.group);
    argoLayerRef.current = argoLayer;

    const landLayer = new LandmassMesh();
    scene.add(landLayer.group);
    landLayerRef.current = landLayer;

    const axesLayer = new CoordinateAxes(manifest);
    scene.add(axesLayer.group);
    axesLayerRef.current = axesLayer;

    // Instantiate Wave Layer if wave manifest is available
    if (waveManifest) {
      const waveLayer = new WaveSurfaceMesh(waveManifest);
      if (waveStepData) {
        waveLayer.updateTimestep(waveStepData);
      }
      scene.add(waveLayer.group);
      waveLayerRef.current = waveLayer;
    }

    // 7. Render Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      if (isTransitioningCamera.current && camera && controls) {
        camera.position.lerp(cameraTargetPos.current, 0.08);
        controls.target.lerp(controlsTargetPos.current, 0.08);
        if (
          camera.position.distanceTo(cameraTargetPos.current) < 0.1 &&
          controls.target.distanceTo(controlsTargetPos.current) < 0.1
        ) {
          isTransitioningCamera.current = false;
        }
      }

      controls.update();

      if (argoLayerRef.current) {
        argoLayerRef.current.update(
          settings.verticalExaggeration,
          delta,
          hoveredFloatId,
          selectedFloatId
        );
      }

      if (waveLayerRef.current && waveSettings) {
        waveLayerRef.current.update(waveSettings, delta);
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [manifest, waveManifest]);

  useEffect(() => {
    if (argoLayerRef.current && floats.length > 0) {
      argoLayerRef.current.setFloats(floats);
    }
  }, [floats]);

  useEffect(() => {
    if (sliceLayerRef.current && stepData) {
      sliceLayerRef.current.update(stepData, settings);
    }
  }, [stepData, settings]);

  useEffect(() => {
    if (waveLayerRef.current && waveStepData) {
      waveLayerRef.current.updateTimestep(waveStepData);
    }
  }, [waveStepData]);

  useEffect(() => {
    if (seabedLayerRef.current) {
      seabedLayerRef.current.update(settings.verticalExaggeration);
    }
    if (axesLayerRef.current) {
      axesLayerRef.current.updateDepthRuler(settings.verticalExaggeration);
    }
  }, [settings.verticalExaggeration]);

  useEffect(() => {
    if (sliceLayerRef.current) sliceLayerRef.current.setVisible(true);
    if (seabedLayerRef.current) seabedLayerRef.current.setVisible(settings.showSeabed);
    if (argoLayerRef.current) argoLayerRef.current.setVisible(settings.showArgoFloats);
    if (landLayerRef.current) landLayerRef.current.setVisible(settings.showLandmass);
    if (axesLayerRef.current) axesLayerRef.current.setVisible(settings.showCoordinates);
    if (waveLayerRef.current && waveSettings) waveLayerRef.current.setVisible(waveSettings.showWaves);
  }, [settings.showSeabed, settings.showArgoFloats, settings.showLandmass, settings.showCoordinates, waveSettings?.showWaves]);

  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current) return;

    switch (settings.cameraPreset) {
      case 'overview':
        cameraTargetPos.current.set(0, 52, 68);
        controlsTargetPos.current.set(0, -4, 0);
        break;
      case 'topdown':
        cameraTargetPos.current.set(0, 85, 0.05);
        controlsTargetPos.current.set(0, 0, 0);
        break;
      case 'arabian':
        cameraTargetPos.current.set(-18, 28, 18);
        controlsTargetPos.current.set(-18, -2, -14);
        break;
      case 'bayofbengal':
        cameraTargetPos.current.set(16, 28, 22);
        controlsTargetPos.current.set(16, -2, -10);
        break;
      case 'equatorial':
        cameraTargetPos.current.set(0, 14, 55);
        controlsTargetPos.current.set(0, -6, 0);
        break;
      case 'southocean':
        cameraTargetPos.current.set(0, 32, 75);
        controlsTargetPos.current.set(0, -4, 18);
        break;
    }
    isTransitioningCamera.current = true;
  }, [settings.cameraPreset]);

  useEffect(() => {
    if (resetViewTrigger > 0 && cameraRef.current && controlsRef.current) {
      cameraTargetPos.current.set(0, 52, 68);
      controlsTargetPos.current.set(0, -4, 0);
      isTransitioningCamera.current = true;
    }
  }, [resetViewTrigger]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || !cameraRef.current || !sceneRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    mouse.current.set(x, y);

    raycaster.current.setFromCamera(mouse.current, cameraRef.current);

    if (argoLayerRef.current && settings.showArgoFloats) {
      const hitSpheres = argoLayerRef.current.getRaycastObjects();
      const floatIntersects = raycaster.current.intersectObjects(hitSpheres, false);

      if (floatIntersects.length > 0) {
        const hit = floatIntersects[0].object;
        const floatId = hit.userData.floatId;
        const float = hit.userData.float;
        onHoverFloat(floatId, float, { x: e.clientX, y: e.clientY });
        onHoverOcean(null, null);
        if (onHoverWave) onHoverWave(null);
        return;
      } else {
        onHoverFloat(null, null, null);
      }
    }

    if (sliceLayerRef.current) {
      const sliceMesh = sliceLayerRef.current.getMesh();
      const sliceIntersects = raycaster.current.intersectObject(sliceMesh, false);

      if (sliceIntersects.length > 0) {
        const point = sliceIntersects[0].point;
        const geo = defaultCoordTransform.worldToGeo(point, settings.verticalExaggeration);

        if (geo.inBounds) {
          if (stepData) {
            const sampleVal = gridDataLoader.sampleValue(
              stepData,
              settings.variable,
              settings.depthIndex,
              geo.lat,
              geo.lon
            );

            onHoverOcean(
              {
                lat: geo.lat,
                lon: geo.lon,
                depth: manifest.depths_m[settings.depthIndex] || 0,
                value: sampleVal,
              },
              { x: e.clientX, y: e.clientY }
            );
          }

          if (waveStepData && onHoverWave) {
            const waveSample = waveDataLoader.sampleWaveAt(waveStepData, geo.lat, geo.lon);
            onHoverWave(waveSample);
          }

          return;
        }
      }
    }

    onHoverOcean(null, null);
    if (onHoverWave) onHoverWave(null);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || !cameraRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    mouse.current.set(x, y);

    raycaster.current.setFromCamera(mouse.current, cameraRef.current);

    if (argoLayerRef.current && settings.showArgoFloats) {
      const hitSpheres = argoLayerRef.current.getRaycastObjects();
      const floatIntersects = raycaster.current.intersectObjects(hitSpheres, false);

      if (floatIntersects.length > 0) {
        const hit = floatIntersects[0].object;
        const floatId = hit.userData.floatId;
        onSelectFloat(floatId);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full cursor-grab active:cursor-grabbing outline-none"
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
    />
  );
};
