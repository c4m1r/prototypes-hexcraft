import { BLOCK_TYPES } from '../types/game';

export class Inventory {
  private selectedSlot: number = 0;
  private hotbar: string[] = [];

  constructor() {
    this.hotbar = BLOCK_TYPES.slice(0, 10).map(bt => bt.id);
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    document.addEventListener('keydown', (e) => {
      if (e.code >= 'Digit0' && e.code <= 'Digit9') {
        const digit = e.code === 'Digit0' ? 9 : parseInt(e.code.replace('Digit', '')) - 1;
        if (digit < this.hotbar.length) {
          this.selectedSlot = digit;
          this.updateUI();
        }
      }
    });

    document.addEventListener('wheel', (e) => {
      if (e.deltaY > 0) {
        this.selectedSlot = (this.selectedSlot + 1) % this.hotbar.length;
      } else {
        this.selectedSlot = (this.selectedSlot - 1 + this.hotbar.length) % this.hotbar.length;
      }
      this.updateUI();
    });
  }

  getSelectedBlock(): string {
    return this.hotbar[this.selectedSlot];
  }

  getSelectedSlot(): number {
    return this.selectedSlot;
  }

  updateUI(): void {
    const hotbarElement = document.getElementById('hotbar');
    if (!hotbarElement) return;

    hotbarElement.innerHTML = this.hotbar
      .map((blockId, index) => {
        const blockType = BLOCK_TYPES.find(bt => bt.id === blockId);
        const isSelected = index === this.selectedSlot;
        return `
          <div class="hotbar-slot ${isSelected ? 'selected' : ''}" data-slot="${index}">
            <div class="block-preview" style="background-color: ${blockType?.color || '#fff'}"></div>
            <span class="slot-number">${index === 9 ? 0 : index + 1}</span>
          </div>
        `;
      })
      .join('');
  }
}
