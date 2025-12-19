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
  health: number;
  stamina: number;
  hunger: number;
  generationCode: string;
  generationStatus: string;
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
  private health: number = 100;
  private stamina: number = 100;
  private hunger: number = 100;
  private staminaDrainAccumulator: number = 0;
  private staminaRegenAccumulator: number = 0;

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

    let didJump = false;
    this.player.update(
      Math.min(deltaTime, 0.1),
      (x, z) => this.world.getHeightAt(x, z),
      () => {
        didJump = true;
      }
    );

    this.updateStamina(Math.min(deltaTime, 0.1), didJump);

    this.world.update(this.player.position.x, this.player.position.z);

    this.dayNightCycle.update(Math.min(deltaTime, 0.1));

    const targetedBlock = this.raycastManager.getTargetedBlock(this.camera);
    const worldDebug = this.world.getDebugInfo();

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
        currentTime: this.dayNightCycle.getCurrentTime(),
        health: this.health,
        stamina: this.stamina,
        hunger: this.hunger,
        generationCode: `seed-${worldDebug.seed}`,
        generationStatus: `chunks:${worldDebug.loadedChunks} meshes:${worldDebug.meshBatches} rd:${worldDebug.renderDistance} cs:${worldDebug.chunkSize}/${worldDebug.maxLoadedChunks}`
      });
    }

    this.renderer.render(this.scene, this.camera);
  }

  private updateStamina(deltaTime: number, didJump: boolean): void {
    if (didJump && this.stamina > 0) {
      this.stamina = Math.max(0, this.stamina - 5);
    }

    if (this.player.isSprinting && this.stamina > 0) {
      this.staminaDrainAccumulator += deltaTime;
      while (this.staminaDrainAccumulator >= 0.5 && this.stamina > 0) {
        this.stamina = Math.max(0, this.stamina - 1);
        this.staminaDrainAccumulator -= 0.5;
      }
      this.staminaRegenAccumulator = 0;
    } else {
      this.staminaDrainAccumulator = 0;

      if (this.stamina < 100) {
        this.staminaRegenAccumulator += deltaTime;
        while (this.staminaRegenAccumulator >= 1 && this.stamina < 100) {
          this.stamina = Math.min(100, this.stamina + 1);
          this.staminaRegenAccumulator -= 1;
        }
      } else {
        this.staminaRegenAccumulator = 0;
      }
    }

    this.player.setSprintAllowed(this.stamina > 0);
  }
}
