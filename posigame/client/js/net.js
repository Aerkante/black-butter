// Conexão WebSocket com reconexão automática e medição de latência.
export class Net {
  constructor() {
    this.handlers = new Map();
    this.ws = null;
    this.retry = 0;
    this.connected = false;
    this.rtt = 0;
    this.stopped = false;
    this.pingTimer = null;
  }

  on(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type).push(fn);
    return this;
  }

  emit(type, data) {
    for (const fn of this.handlers.get(type) || []) fn(data);
  }

  connect() {
    if (this.stopped) return;
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}/ws`);
    this.ws = ws;
    ws.onopen = () => {
      this.connected = true;
      this.retry = 0;
      this.emit('open');
      clearInterval(this.pingTimer);
      this.pingTimer = setInterval(() => this.send({ t: 'ping', ts: performance.now() }), 3000);
    };
    ws.onmessage = (ev) => {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (msg.t === 'pong') this.rtt = Math.round(performance.now() - msg.ts);
      this.emit(msg.t, msg);
    };
    ws.onclose = (ev) => {
      const wasConnected = this.connected;
      this.connected = false;
      clearInterval(this.pingTimer);
      this.emit('close', { code: ev.code, wasConnected });
      if (ev.code === 4001) {
        this.stopped = true; // outro aparelho assumiu o nick: não reconecta sozinho
        return;
      }
      const wait = Math.min(5000, 400 * 2 ** this.retry++);
      setTimeout(() => this.connect(), wait);
    };
    ws.onerror = () => {};
  }

  send(obj) {
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(obj));
  }
}
