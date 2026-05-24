"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

interface CubeVisualizationProps {
  isDark: boolean;
}

export default function CubeVisualization({ isDark }: CubeVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const lineMaterialRef = useRef<THREE.LineBasicMaterial | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const revolvingSpotlightRef = useRef<THREE.SpotLight | null>(null);
  const cornerSpotlightRef = useRef<THREE.SpotLight | null>(null);
  const coreLightRefs = useRef<{ light1: THREE.PointLight; light2: THREE.PointLight } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const canvas = document.createElement("canvas");
    container.appendChild(canvas);

    // Scene & Renderer Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    rendererRef.current = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;

    // Camera Setup
    const camera = new THREE.PerspectiveCamera(
      36,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );

    const updateCameraAspect = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      const targetXOffset = width > 1024 ? 2.4 : 0.8;
      camera.position.set(7 - targetXOffset, 5.5, 10);
      camera.lookAt(-targetXOffset, 0, 0);
    };

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x06060c, 0.6);
    ambientLightRef.current = ambientLight;
    scene.add(ambientLight);

    const revolvingSpotlight = new THREE.SpotLight(0xffffff, 25.0);
    revolvingSpotlight.angle = Math.PI / 9;
    revolvingSpotlight.penumbra = 0.4;
    revolvingSpotlight.decay = 1.0;
    revolvingSpotlight.distance = 25;
    revolvingSpotlightRef.current = revolvingSpotlight;
    scene.add(revolvingSpotlight);

    const cornerSpotlight = new THREE.SpotLight(0xffffff, 18.0);
    cornerSpotlight.position.set(8, -8, 5);
    cornerSpotlight.target.position.set(0, 0, 0);
    cornerSpotlight.angle = Math.PI / 7;
    cornerSpotlight.penumbra = 0.5;
    cornerSpotlightRef.current = cornerSpotlight;
    scene.add(cornerSpotlight);
    scene.add(cornerSpotlight.target);

    const coreLight1 = new THREE.PointLight(0xf97316, 12, 20);
    coreLight1.position.set(0, 0, 0);
    scene.add(coreLight1);

    const coreLight2 = new THREE.PointLight(0x00d2ff, 0, 15);
    coreLight2.position.set(0, 0, 0);
    scene.add(coreLight2);

    coreLightRefs.current = { light1: coreLight1, light2: coreLight2 };

    // Material
    const cubeColor = new THREE.Color(0xd5d9e0);
    const cubeMaterial = new THREE.MeshPhysicalMaterial({
      color: cubeColor,
      roughness: 0.015,
      metalness: 0.98,
      clearcoat: 1.0,
      clearcoatRoughness: 0.015,
      reflectivity: 1.0,
      side: THREE.DoubleSide,
    });

    const geometry = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    const edges = new THREE.EdgesGeometry(geometry);

    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.45,
    });
    lineMaterialRef.current = lineMaterial;

    // Cube Assembly (3x3x3 Grid)
    const group = new THREE.Group();
    const subCubes: THREE.Mesh[] = [];

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          if (x === 0 && y === 0 && z === 0) continue;

          const mesh = new THREE.Mesh(geometry, cubeMaterial);

          (mesh.userData as any) = {
            baseX: x * 1.015,
            baseY: y * 1.015,
            baseZ: z * 1.015,
            direction: new THREE.Vector3(x, y, z).normalize(),
            randomRot: new THREE.Vector3(
              Math.random() - 0.5,
              Math.random() - 0.5,
              Math.random() - 0.5
            ).normalize(),
          };

          mesh.position.set(
            (mesh.userData as any).baseX,
            (mesh.userData as any).baseY,
            (mesh.userData as any).baseZ
          );

          const lineSegments = new THREE.LineSegments(edges, lineMaterial);
          mesh.add(lineSegments);

          group.add(mesh);
          subCubes.push(mesh);
        }
      }
    }

    group.rotation.x = -0.42;
    group.rotation.y = 0.62;
    group.rotation.z = 0.12;
    scene.add(group);

    // Environment Texture
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const envScene = new THREE.Scene();
    const envLight = new THREE.DirectionalLight(0xffffff, 2.0);
    envLight.position.set(-2, 3, 2);
    envScene.add(envLight);
    const envRT = pmremGenerator.fromScene(envScene);
    scene.environment = envRT.texture;

    // Cursor Tracking & Explosion
    let targetExplosion = 0;
    let currentExplosion = 0;
    const raycaster = new THREE.Raycaster();
    const mouseVector = new THREE.Vector2();

    const handleMouseMove = (e: MouseEvent) => {
      mouseVector.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseVector.y = -(e.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouseVector, camera);
      const ray = raycaster.ray;
      const cubeCenter = new THREE.Vector3(0, 0, 0);
      const distance = ray.distanceToPoint(cubeCenter);

      if (distance < 5.2) {
        targetExplosion = Math.max(0, (5.2 - distance) * 1.9);
      } else {
        targetExplosion = 0;
      }
    };

    const handleMouseLeave = () => {
      targetExplosion = 0;
    };

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    // Animation Loop
    let clockTime = 0;
    let animationId: number;

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      clockTime += 0.012;

      group.rotation.y += 0.004;
      group.rotation.x += 0.0008;

      const orbitRadius = 9;
      revolvingSpotlight.position.x = Math.cos(clockTime) * orbitRadius;
      revolvingSpotlight.position.z = Math.sin(clockTime) * orbitRadius;
      revolvingSpotlight.position.y = 3.5;
      revolvingSpotlight.target = group;

      currentExplosion = THREE.MathUtils.lerp(currentExplosion, targetExplosion, 0.07);

      subCubes.forEach((cube) => {
        const u = cube.userData as any;
        const scatterMagnitude = currentExplosion * 3.8;

        cube.position.x = u.baseX + u.direction.x * scatterMagnitude;
        cube.position.y = u.baseY + u.direction.y * scatterMagnitude;
        cube.position.z = u.baseZ + u.direction.z * scatterMagnitude;

        cube.rotation.x = u.randomRot.x * currentExplosion * 0.95;
        cube.rotation.y = u.randomRot.y * currentExplosion * 0.95;
        cube.rotation.z = u.randomRot.z * currentExplosion * 0.95;
      });

      renderer.render(scene, camera);
    };

    const handleResize = () => {
      updateCameraAspect();
    };

    updateCameraAspect();
    animate();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
      renderer.dispose();
      if (container.contains(canvas)) {
        container.removeChild(canvas);
      }
    };
  }, []);

  // Update lights when theme changes
  useEffect(() => {
    if (ambientLightRef.current && revolvingSpotlightRef.current && cornerSpotlightRef.current && lineMaterialRef.current && coreLightRefs.current) {
      if (isDark) {
        ambientLightRef.current.color.setHex(0x0e0e16);
        revolvingSpotlightRef.current.intensity = 25.0;
        cornerSpotlightRef.current.intensity = 18.0;
        lineMaterialRef.current.color.setHex(0xf97316);
        coreLightRefs.current.light1.intensity = 12;
        coreLightRefs.current.light2.intensity = 0;
      } else {
        ambientLightRef.current.color.setHex(0xffffff);
        revolvingSpotlightRef.current.intensity = 15.0;
        cornerSpotlightRef.current.intensity = 10.0;
        lineMaterialRef.current.color.setHex(0x0284c7);
        coreLightRefs.current.light1.intensity = 2;
        coreLightRefs.current.light2.intensity = 15;
        coreLightRefs.current.light2.color.setHex(0x00d2ff);
      }
    }
  }, [isDark]);

  return <div ref={containerRef} style={{ width: "100vw", height: "100vh", overflow: "hidden" }} />;
}
