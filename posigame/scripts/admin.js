// Administração do PosiGame pela linha de comando. Pare o servidor antes de usar
// (ele grava o arquivo de dados). Exemplos:
//   npm run admin -- list
//   npm run admin -- top [day|week|all]
//   npm run admin -- remove <nick>
//   npm run admin -- reset-ranking
// Para bloquear nicks, edite `bannedNicks` em server/config.js.
import { config } from '../server/config.js';
import { Store } from '../server/store.js';

const [cmd, arg] = process.argv.slice(2);
const store = new Store({ dir: config.dataDir, reserveMs: config.nickReserveMs });

switch (cmd) {
  case 'list': {
    const rows = [...store.players.values()].sort((a, b) => b.total.score - a.total.score);
    for (const p of rows) {
      const last = new Date(p.lastSeen).toLocaleString('pt-BR');
      console.log(`${p.nick.padEnd(14)} total=${String(p.total.score).padStart(8)} melhor=${String(p.best.score).padStart(7)} partidas=${p.total.games} visto=${last}`);
    }
    console.log(`\n${rows.length} jogador(es).`);
    break;
  }
  case 'top': {
    const r = store.ranking(['day', 'week', 'all'].includes(arg) ? arg : 'all');
    r.best.forEach((b, i) => console.log(`${String(i + 1).padStart(2)}. ${b.nick.padEnd(14)} ${b.score} (onda ${b.wave})`));
    break;
  }
  case 'remove': {
    if (!arg) return console.error('Uso: remove <nick>');
    console.log(store.remove(arg) ? `Removido: ${arg}` : `Nick não encontrado: ${arg}`);
    store.saveNow();
    break;
  }
  case 'reset-ranking': {
    store.resetRanking();
    console.log('Ranking zerado (nicks e visuais foram mantidos).');
    break;
  }
  default:
    console.log('Comandos: list | top [day|week|all] | remove <nick> | reset-ranking');
}
