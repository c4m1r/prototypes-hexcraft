import * as THREE from 'three';

export class DayNightCycle {
  private scene: THREE.Scene;
  private sunLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private cycleTime: number = 0;
  private cycleDuration: number = 14 * 60;
  private fogDisabled: boolean = false;

  constructor(scene: THREE.Scene, sunLight: THREE.DirectionalLight, ambientLight: THREE.AmbientLight) {
    this.scene = scene;
    this.sunLight = sunLight;
    this.ambientLight = ambientLight;
  }

  setFogDisabled(disabled: boolean): void {
    this.fogDisabled = disabled;
    if (disabled) {
      this.scene.fog = null;
    }
  }

  update(deltaTime: number): void {
    this.cycleTime += deltaTime;
    if (this.cycleTime >= this.cycleDuration) {
      this.cycleTime = 0;
    }

    const timeOfDay = this.cycleTime / this.cycleDuration;

    const sunAngle = timeOfDay * Math.PI * 2;
    const sunHeight = Math.sin(sunAngle);

    this.sunLight.position.set(
      Math.cos(sunAngle) * 100,
      sunHeight * 100,
      50
    );

    if (sunHeight > 0) {
      const dayIntensity = Math.max(0.3, sunHeight);
      this.sunLight.intensity = dayIntensity * 0.8;
      this.ambientLight.intensity = 0.4 + dayIntensity * 0.3;

      const skyColor = new THREE.Color().lerpColors(
        new THREE.Color(0xff7f50),
        new THREE.Color(0x87ceeb),
        Math.min(sunHeight * 2, 1)
      );
      this.scene.background = skyColor;
      if (!this.fogDisabled) {
        this.scene.fog = new THREE.Fog(skyColor.getHex(), 50, 150);
      }
    } else {
      const nightIntensity = Math.max(0, -sunHeight);
      this.sunLight.intensity = 0.1;
      this.ambientLight.intensity = 0.2 + nightIntensity * 0.1;

      const nightColor = new THREE.Color().lerpColors(
        new THREE.Color(0x000033),
        new THREE.Color(0xff7f50),
        Math.max(0, 1 + sunHeight * 2)
      );
      this.scene.background = nightColor;
      if (!this.fogDisabled) {
        this.scene.fog = new THREE.Fog(nightColor.getHex(), 30, 100);
      }
    }
  }

  getCurrentTime(): string {
    const totalMinutes = (this.cycleTime / this.cycleDuration) * 24 * 60;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
}
