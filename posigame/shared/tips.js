// Dicas mostradas entre as partidas (tela de fim de jogo, menu e intervalos entre ondas).
// Todas descrevem regras reais do jogo.

export const TIPS = {
  geral: [
    'Defenda o servidor no centro: se a vida dele chegar a zero, o jogo acaba para todos.',
    'Bugs só nascem nos portais vermelhos das bordas, com 1 segundo de aviso.',
    'Quem entra ou renasce fica invulnerável por 3 segundos na zona segura.',
    'Derrotar bugs em sequência aumenta o combo e os pontos de cada bug.',
    'Ondas limpas sem ninguém levar dano pagam bônus de onda perfeita.',
    'A cada 5 ondas aparece o chefe Segfault. Prepare as habilidades antes!',
    'Jogar com amigos deixa os bugs mais fortes, mas o time ganha muito mais pontos.',
    'Entre as ondas todo mundo volta à vida e recupera um pouco de vida.',
    'Seus pontos ficam salvos no seu nick: pontuação total, melhor partida e onda mais longa.',
    'O visual do boneco não muda a classe: monte do seu jeito e escolha a classe pelo estilo de jogo.',
    'Se o Wi-Fi cair, você tem 45 segundos para voltar e continuar na mesma partida.',
  ],
  powerups: [
    'Bugs derrotados podem soltar power-ups: pegue-os passando por cima.',
    'Pizza cura 30% da vida. Guarde para quando precisar!',
    'O Crachá VIP reduz o dano recebido em 60% por 8 segundos: ótimo contra o chefe.',
    'O Energético faz você atacar 60% mais rápido por 8 segundos.',
    'O Deploy explode e fere todos os bugs perto de você.',
    'O Ar-condicionado congela todos os bugs por 3 segundos: hora de bater sem dó.',
    'O Backup cura o servidor e revive quem estiver caído.',
    'O Bônus dá 150 pontos na hora. Não deixe passar!',
    'Power-ups somem depois de alguns segundos: eles piscam quando estão acabando.',
    'O chefe sempre solta vários power-ups quando cai.',
  ],
  dev: [
    'Dev: a Rajada atinge os 3 bugs mais próximos de uma vez.',
    'Dev: use o Refactor para fugir de cerco e reposicionar rápido.',
    'Dev: guarde o Hotfix para quando os bugs se juntarem em volta do servidor.',
  ],
  qa: [
    'QA: bugs marcados recebem 30% a mais de dano de todo o time.',
    'QA: o Caso de teste marca e fere todos os bugs por perto: ótimo para abrir uma luta.',
    'QA: o Bug bash marca e fere todos os bugs do mapa de uma vez.',
    'QA: a Regressão machuca e deixa os bugs lentos, ideal para o time recuar e recarregar.',
  ],
  ops: [
    'DevOps: fique perto de aliados caídos: você os revive em poucos segundos.',
    'DevOps: o Firewall deixa o servidor invulnerável e queima os bugs colados nele.',
    'DevOps: o Patch cura o time e também fere os bugs em volta.',
    'DevOps: o Rollback revive todo mundo, cura o time e ainda fere todos os bugs. Use no aperto!',
  ],
  tank: [
    'Tank: o Grito faz os bugs perseguirem você em vez do servidor, e ainda machuca.',
    'Tank: com o Escudo ativo, quem bate em você leva dano de volta.',
    'Tank: a Muralha empurra, atordoa e esmaga os bugs: ótima contra o chefe.',
  ],
  po: [
    'PO: Priorizar dá +50% de dano e pontos em dobro no bug marcado.',
    'PO: o Sprint Review congela e fere todos os bugs e paga o combo em pontos para todos.',
    'PO: a Mudança de escopo é um sorteio: dano em todos, congelar, meteoros... ou caos. Arrisque!',
    'PO: aliados perto de você ganham 10% a mais de pontos.',
  ],
};

// Sorteia uma dica; com a classe do jogador, dicas dela entram no sorteio.
export function pickTip(cls, rand = Math.random) {
  const pool = [...TIPS.geral, ...TIPS.powerups, ...(TIPS[cls] || []), ...(TIPS[cls] || [])];
  return pool[Math.floor(rand() * pool.length)];
}
