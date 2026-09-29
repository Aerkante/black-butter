// Entrada: teclado (WASD/setas, Espaço, 1-2-3) e toque (joystick flutuante + botões).
// Envia ao servidor só a direção em coordenadas do mundo; nunca posições.

// Converte um vetor de tela (pixels) em vetor do mundo (projeção isométrica 2:1).
export function screenToWorld(sx, sy) {
  const x = sx / 16 + sy / 8;
  const y = sy / 8 - sx / 16;
  const len = Math.hypot(x, y) || 1;
  return [x / len, y / len];
}

export class Input {
  constructor({ onSkill }) {
    this.onSkill = onSkill;
    this.keys = new Set();
    this.joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
    this.attackHeld = new Set(); // origens que seguram o ataque (tecla, mouse, botão)
    this.enabled = false;
    this.bind();
  }

  bind() {
    const kmap = {
      KeyW: 'u', ArrowUp: 'u', KeyS: 'd', ArrowDown: 'd', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r',
    };
    window.addEventListener('keydown', (e) => {
      if (!this.enabled || e.repeat || e.target.closest?.('input,textarea')) return;
      if (kmap[e.code]) {
        this.keys.add(kmap[e.code]);
        e.preventDefault();
      } else if (e.code === 'Space' || e.code === 'KeyJ') {
        this.attackHeld.add('key');
        e.preventDefault();
      } else if (e.code === 'Digit1' || e.code === 'KeyK') this.onSkill(1);
      else if (e.code === 'Digit2' || e.code === 'KeyL') this.onSkill(2);
      else if (e.code === 'Digit3' || e.code === 'KeyU') this.onSkill(3);
    });
    window.addEventListener('keyup', (e) => {
      if (kmap[e.code]) this.keys.delete(kmap[e.code]);
      if (e.code === 'Space' || e.code === 'KeyJ') this.attackHeld.delete('key');
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.attackHeld.clear();
      this.joy.id = null;
      this.joy.x = this.joy.y = 0;
      this.updateKnob(false);
    });

    // botões de toque
    const hold = (el, name) => {
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        this.attackHeld.add(name);
        el.classList.add('down');
      });
      const up = () => {
        this.attackHeld.delete(name);
        el.classList.remove('down');
      };
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
    };
    hold(document.getElementById('btn-atk'), 'btn');
    for (const [id, n] of [['btn-s1', 1], ['btn-s2', 2], ['btn-ult', 3]]) {
      const el = document.getElementById(id);
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        el.classList.add('down');
        this.onSkill(n);
      });
      const up = () => el.classList.remove('down');
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
    }

    // joystick flutuante: aparece onde o polegar tocar, na metade esquerda da tela
    const zone = document.getElementById('joyzone');
    zone.addEventListener('pointerdown', (e) => {
      if (this.joy.id !== null) return;
      e.preventDefault();
      zone.setPointerCapture(e.pointerId);
      this.joy = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0 };
      this.updateKnob(true);
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.joy.id) return;
      let dx = e.clientX - this.joy.ox;
      let dy = e.clientY - this.joy.oy;
      const max = 46;
      const len = Math.hypot(dx, dy);
      if (len > max) {
        dx = (dx / len) * max;
        dy = (dy / len) * max;
      }
      this.joy.x = dx / max;
      this.joy.y = dy / max;
      this.updateKnob(true);
    });
    const end = (e) => {
      if (e.pointerId !== this.joy.id) return;
      this.joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
      this.updateKnob(false);
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);

    // mouse: segurar o botão na tela ataca
    const canvas = document.getElementById('game');
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && this.enabled) this.attackHeld.add('mouse');
    });
    window.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'mouse') this.attackHeld.delete('mouse');
    });
    window.addEventListener('contextmenu', (e) => {
      if (this.enabled) e.preventDefault();
    });
  }

  updateKnob(show) {
    const base = document.getElementById('joy-base');
    const knob = document.getElementById('joy-knob');
    base.hidden = !show;
    if (!show) return;
    base.style.left = `${this.joy.ox}px`;
    base.style.top = `${this.joy.oy}px`;
    knob.style.transform = `translate(${this.joy.x * 46}px, ${this.joy.y * 46}px)`;
  }

  // Estado atual: { dx, dy, a } em coordenadas do mundo.
  read() {
    if (!this.enabled) return { dx: 0, dy: 0, a: 0 };
    let sx = 0;
    let sy = 0;
    if (this.keys.has('l')) sx -= 1;
    if (this.keys.has('r')) sx += 1;
    if (this.keys.has('u')) sy -= 1;
    if (this.keys.has('d')) sy += 1;
    if (this.joy.id !== null && Math.hypot(this.joy.x, this.joy.y) > 0.2) {
      sx = this.joy.x;
      sy = this.joy.y;
    }
    let dx = 0;
    let dy = 0;
    if (sx || sy) {
      const mag = Math.min(1, Math.hypot(sx, sy));
      [dx, dy] = screenToWorld(sx, sy);
      dx *= mag;
      dy *= mag;
    }
    return { dx: Math.round(dx * 100) / 100, dy: Math.round(dy * 100) / 100, a: this.attackHeld.size ? 1 : 0 };
  }

  reset() {
    this.keys.clear();
    this.attackHeld.clear();
    this.joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
    this.updateKnob(false);
  }
}
