import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, viewChild } from '@angular/core';
import * as THREE from 'three';

/**
 * Real Three.js 3D scene — floating wireframe icosahedron + torus +
 * particle starfield. Rotates with mouse, breathes on its own.
 * Renderer auto-disposes on destroy to prevent GL context leaks.
 */
@Component({
  selector: 'app-hero-3d',
  standalone: true,
  template: `<canvas #canvas class="hero-canvas"></canvas>`,
  styles: [`
    :host { display:block; width:100%; height:100%; position:relative; }
    .hero-canvas { width:100%; height:100%; display:block; }
  `]
})
export class Hero3dComponent implements AfterViewInit, OnDestroy {
  private canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  private renderer!: THREE.WebGLRenderer;
  private scene!:    THREE.Scene;
  private camera!:   THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private rafId = 0;

  private mainMesh!: THREE.Mesh;
  private ring!:     THREE.Mesh;
  private particles!: THREE.Points;
  private targetRot = { x: 0, y: 0 };
  private currentRot = { x: 0, y: 0 };

  ngAfterViewInit(): void {
    this.setup();
    this.loop();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
    this.renderer?.dispose();
    this.scene?.traverse(o => {
      if ((o as THREE.Mesh).geometry) (o as THREE.Mesh).geometry.dispose();
      const mat = (o as THREE.Mesh).material;
      if (mat) (Array.isArray(mat) ? mat : [mat]).forEach(m => m.dispose());
    });
  }

  @HostListener('window:resize')
  onResize(): void {
    if (!this.renderer) return;
    const canvas = this.canvasRef().nativeElement;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouse(e: MouseEvent): void {
    const x = (e.clientX / window.innerWidth)  - 0.5;
    const y = (e.clientY / window.innerHeight) - 0.5;
    this.targetRot.y =  x * 0.6;
    this.targetRot.x = -y * 0.4;
  }

  private setup(): void {
    const canvas = this.canvasRef().nativeElement;
    const w = canvas.clientWidth, h = canvas.clientHeight;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    this.camera.position.set(0, 0, 6);

    // Lights
    const ambient = new THREE.AmbientLight(0x8b6dff, 0.5);
    this.scene.add(ambient);
    const key = new THREE.PointLight(0xa78bfa, 80, 30);
    key.position.set(4, 3, 4);
    this.scene.add(key);
    const fill = new THREE.PointLight(0x60a5fa, 60, 30);
    fill.position.set(-4, -2, 3);
    this.scene.add(fill);

    // Main icosahedron with wireframe overlay
    const geo = new THREE.IcosahedronGeometry(1.3, 1);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x7C3AED,
      metalness: 0.45,
      roughness: 0.35,
      emissive: 0x4C1D95,
      emissiveIntensity: 0.35,
      flatShading: true,
    });
    this.mainMesh = new THREE.Mesh(geo, mat);
    this.scene.add(this.mainMesh);

    const wireGeo = new THREE.IcosahedronGeometry(1.31, 1);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xA78BFA,
      wireframe: true,
      transparent: true,
      opacity: 0.55,
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    this.mainMesh.add(wireMesh);

    // Surrounding torus
    const torusGeo = new THREE.TorusGeometry(2.2, 0.04, 16, 100);
    const torusMat = new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.75 });
    this.ring = new THREE.Mesh(torusGeo, torusMat);
    this.ring.rotation.x = Math.PI / 3;
    this.scene.add(this.ring);

    // Second torus
    const torus2Geo = new THREE.TorusGeometry(2.6, 0.03, 16, 100);
    const torus2Mat = new THREE.MeshBasicMaterial({ color: 0xEC4899, transparent: true, opacity: 0.55 });
    const ring2 = new THREE.Mesh(torus2Geo, torus2Mat);
    ring2.rotation.x = -Math.PI / 4;
    ring2.rotation.y =  Math.PI / 6;
    this.scene.add(ring2);

    // Particle field
    const N = 600;
    const positions = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 4 + Math.random() * 8;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      positions[i*3]     = r * Math.sin(p) * Math.cos(t);
      positions[i*3 + 1] = r * Math.sin(p) * Math.sin(t);
      positions[i*3 + 2] = r * Math.cos(p);
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xFFFFFF,
      size: 0.025,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
    });
    this.particles = new THREE.Points(particleGeo, particleMat);
    this.scene.add(this.particles);
  }

  private loop = (): void => {
    const dt = this.clock.getDelta();
    const t  = this.clock.elapsedTime;

    // Ease the rotation toward mouse target
    this.currentRot.x += (this.targetRot.x - this.currentRot.x) * 0.05;
    this.currentRot.y += (this.targetRot.y - this.currentRot.y) * 0.05;

    if (this.mainMesh) {
      this.mainMesh.rotation.y += 0.003;
      this.mainMesh.rotation.x = this.currentRot.x + Math.sin(t * 0.4) * 0.12;
      this.mainMesh.rotation.y += this.currentRot.y * 0.01;
      this.mainMesh.position.y = Math.sin(t * 0.7) * 0.12;
    }
    if (this.ring) {
      this.ring.rotation.z += dt * 0.18;
    }
    if (this.particles) {
      this.particles.rotation.y += dt * 0.04;
      this.particles.rotation.x += dt * 0.02;
    }

    this.renderer.render(this.scene, this.camera);
    this.rafId = requestAnimationFrame(this.loop);
  };
}
