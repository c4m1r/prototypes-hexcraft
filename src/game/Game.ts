import * as THREE from 'three';
import { World } from './World';
import { PlayerController } from './PlayerController';
import { Inventory } from './Inventory';
import { RaycastManager } from './RaycastManager';
import { DayNightCycle } from './DayNightCycle';
import { GameSettings } from '../types/settings';

export interface GameState {
  playerPosition: { x: number; y: number; z: number };
  isFlying: boolean;
  targetBlock: string | null;
  showFogBarrier: boolean;
  currentTime: string;
}

export class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private world: World;
  private player: PlayerController;
  private inventory: Inventory;
  private raycastManager: RaycastManager;
  private dayNightCycle: DayNightCycle;
  private lastTime: number = 0;
  private onStateChange?: (state: GameState) => void;
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;

  constructor(canvas: HTMLCanvasElement, onStateChange?: (state: GameState) => void, settings?: GameSettings) {
    this.onStateChange = onStateChange;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 50, 150);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(50, 100, 50);
    this.scene.add(this.directionalLight);

    this.dayNightCycle = new DayNightCycle(this.scene, this.directionalLight, this.ambientLight);

    this.world = new World(this.scene, settings);
    this.world.initialize();

    this.player = new PlayerController(this.camera);

    this.inventory = new Inventory();
    this.inventory.updateUI();

    this.raycastManager = new RaycastManager(this.scene, this.world);

    this.setupEventListeners();
    this.animate(0);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    document.addEventListener('mousedown', (e) => {
      if (document.pointerLockElement !== document.body) return;

      if (e.button === 0) {
        this.raycastManager.removeBlock(this.camera);
      } else if (e.button === 2) {
        const selectedBlock = this.inventory.getSelectedBlock();
        this.raycastManager.placeBlock(this.camera, selectedBlock);
      }
    });

    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyF') {
        this.world.toggleFogBarrier();
      }
    });
  }

  private animate(currentTime: number): void {
    requestAnimationFrame((time) => this.animate(time));

    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    this.player.update(
      Math.min(deltaTime, 0.1),
      (x, z) => this.world.getHeightAt(x, z)
    );

    this.world.update(this.player.position.x, this.player.position.z);

    this.dayNightCycle.update(Math.min(deltaTime, 0.1));

    const targetedBlock = this.raycastManager.getTargetedBlock(this.camera);

    if (this.onStateChange) {
      this.onStateChange({
        playerPosition: {
          x: this.player.position.x,
          y: this.player.position.y,
          z: this.player.position.z
        },
        isFlying: this.player.isFlying,
        targetBlock: targetedBlock?.name || null,
        showFogBarrier: this.world.getFogBarrierState(),
        currentTime: this.dayNightCycle.getCurrentTime()
      });
    }

    this.renderer.render(this.scene, this.camera);
  }
}
