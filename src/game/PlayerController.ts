import * as THREE from 'three';

export class PlayerController {
  public position: THREE.Vector3;
  public rotation: THREE.Euler;
  public velocity: THREE.Vector3;
  public isFlying: boolean = true;
  public isSprinting: boolean = false;
  private lastSpacePress: number = 0;
  private readonly DOUBLE_TAP_TIME = 300;

  private keys: { [key: string]: boolean } = {};
  private speed: number = 10;
  private sprintMultiplier: number = 1.5;
  private flySpeed: number = 15;
  private jumpForce: number = 12;
  private gravity: number = 30;
  private camera: THREE.PerspectiveCamera;
  private isGrounded: boolean = false;
  private mouseSensitivity: number = 0.002;
  private isPointerLocked: boolean = false;
  private sprintAllowed: boolean = true;
  private pendingJump: boolean = false;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.position = new THREE.Vector3(0, 10, 0);
    this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');
    this.velocity = new THREE.Vector3(0, 0, 0);

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    document.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      if (e.code === 'Space') {
        const now = Date.now();
        if (now - this.lastSpacePress < this.DOUBLE_TAP_TIME) {
          this.isFlying = !this.isFlying;
          if (this.isFlying) {
            this.velocity.y = 0;
            this.pendingJump = false;
          }
        }
        this.lastSpacePress = now;

        if (!this.isFlying) {
          this.pendingJump = true;
        }
      }
    });

    document.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isPointerLocked) return;

      this.rotation.y -= e.movementX * this.mouseSensitivity;
      this.rotation.x -= e.movementY * this.mouseSensitivity;

      this.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.rotation.x));
    });

    document.addEventListener('click', () => {
      if (!this.isPointerLocked) {
        document.body.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === document.body;
    });
  }

  update(
    deltaTime: number,
    getHeightAt: (x: number, z: number) => number,
    onJump?: () => void,
    getBlockTypeAt?: (x: number, y: number, z: number) => string | null,
    getPassableSlowdown?: (blockType: string) => number
  ): void {
    const sprintKey = this.keys['ShiftLeft'];
    this.isSprinting = false;

    let moveSpeed = this.isFlying ? this.flySpeed : this.speed;
    const direction = new THREE.Vector3();

    if (this.keys['KeyW']) direction.z -= 1;
    if (this.keys['KeyS']) direction.z += 1;
    if (this.keys['KeyA']) direction.x -= 1;
    if (this.keys['KeyD']) direction.x += 1;

    if (!this.isFlying && sprintKey && this.sprintAllowed && direction.length() > 0) {
      this.isSprinting = true;
      moveSpeed = this.speed * this.sprintMultiplier;
    }

    // Проверяем проходимость блоков и применяем замедление
    let slowdownMultiplier = 1.0;
    if (getBlockTypeAt && getPassableSlowdown) {
      const blockType = getBlockTypeAt(this.position.x, this.position.y, this.position.z);
      if (blockType) {
        slowdownMultiplier = getPassableSlowdown(blockType);
      }
    }
    moveSpeed *= slowdownMultiplier;

    if (!this.isFlying && this.pendingJump && this.isGrounded) {
      this.velocity.y = this.jumpForce;
      this.pendingJump = false;
      if (onJump) onJump();
    }

    if (direction.length() > 0) {
      direction.normalize();
      direction.applyEuler(new THREE.Euler(0, this.rotation.y, 0, 'YXZ'));

      this.velocity.x = direction.x * moveSpeed;
      this.velocity.z = direction.z * moveSpeed;
    } else {
      this.velocity.x *= 0.8;
      this.velocity.z *= 0.8;
    }

    if (this.isFlying) {
      if (this.keys['Space']) this.velocity.y = moveSpeed;
      else if (this.keys['ShiftLeft']) this.velocity.y = -moveSpeed;
      else this.velocity.y *= 0.8;
    } else {
      // Применяем замедление падения в проходимых блоках
      let gravityMultiplier = 1.0;
      if (getBlockTypeAt && getPassableSlowdown) {
        const blockType = getBlockTypeAt(this.position.x, this.position.y, this.position.z);
        if (blockType) {
          gravityMultiplier = getPassableSlowdown(blockType);
        }
      }
      this.velocity.y -= this.gravity * deltaTime * gravityMultiplier;
    }

    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
    this.position.z += this.velocity.z * deltaTime;

    if (!this.isFlying) {
      const groundHeight = getHeightAt(this.position.x, this.position.z);
      const playerHeight = 1.7;

      if (this.position.y <= groundHeight + playerHeight) {
        this.position.y = groundHeight + playerHeight;
        this.velocity.y = 0;
        this.isGrounded = true;
      } else {
        this.isGrounded = false;
      }
    }

    this.camera.position.copy(this.position);
    this.camera.rotation.copy(this.rotation);
  }

  getForwardVector(): THREE.Vector3 {
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyEuler(this.rotation);
    return direction;
  }

  setSprintAllowed(allowed: boolean): void {
    this.sprintAllowed = allowed;
    if (!allowed) {
      this.isSprinting = false;
    }
  }
}
