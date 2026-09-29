// Configuração do servidor. Tudo pode ser sobrescrito por variáveis de ambiente.
// Administração (nicks proibidos, limites, etc.) é feita aqui, no código.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const num = (v, d) => (v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : d);

export const config = {
  root,
  host: process.env.HOST || '0.0.0.0',
  port: num(process.env.PORT, 8080),
  dataDir: process.env.DATA_DIR || path.join(root, 'data'),

  // partidas
  maxMatches: num(process.env.MAX_MATCHES, 8),
  playersPerMatch: num(process.env.PLAYERS_PER_MATCH, 4),
  // partida vazia por este tempo é encerrada e zerada
  inactivityMs: num(process.env.INACTIVITY_MIN, 30) * 60 * 1000,
  // quem cai da rede mantém o lugar por este tempo
  reconnectGraceMs: num(process.env.RECONNECT_GRACE_S, 45) * 1000,

  // conexões
  maxConnections: num(process.env.MAX_CONNECTIONS, 120),
  maxConnectionsPerIp: num(process.env.MAX_PER_IP, 12),

  // nicks
  nickReserveMs: num(process.env.NICK_RESERVE_DAYS, 60) * 24 * 3600 * 1000,
  // adicione aqui nicks que devem ser bloqueados (minúsculas, sem acento)
  bannedNicks: [],
  reservedNicks: ['admin', 'administrador', 'servidor', 'server', 'posigame', 'sistema', 'system', 'moderador'],

  // ranking
  maxRuns: 20000,
  maxTeams: 1000,
};
