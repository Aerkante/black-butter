# PosiGame

Jogo cooperativo 8 bits isométrico contra ondas infinitas de bugs, para jogar na hora do almoço
pela rede local. Roda no navegador (celular ou PC), sem instalar nada. Um servidor Node.js, rodando
numa máquina da rede, cuida de tudo: partidas, pontuação e ranking.

> Projeto independente do restante deste repositório (o app Quasar/Laravel). Tudo do jogo está em `posigame/`.

## Como rodar

Requisitos: Node.js 20 ou superior.

```bash
cd posigame
npm install
npm start
```

O servidor mostra os endereços, por exemplo:

```
Neste computador:    http://localhost:8080
Na rede (celulares): http://192.168.0.20:8080
```

Os jogadores abrem o endereço "Na rede" no navegador, escolhem um nick, montam o boneco e jogam.
Dica: gere um QR code desse endereço e cole num cartaz no refeitório.

Variáveis de ambiente opcionais: `PORT` (8080), `HOST` (0.0.0.0), `MAX_MATCHES` (8),
`PLAYERS_PER_MATCH` (4), `INACTIVITY_MIN` (30), `DATA_DIR` (`posigame/data`),
`LOG_LEVEL` (`debug`) e `LOG_FILE` (`0` desliga o arquivo de log).

## Requisitos de rede (para conversar com a TI)

- O jogo usa **uma porta TCP** (padrão 8080) para HTTP e WebSocket. Nada sai para a internet:
  as fontes e todos os gráficos vêm do próprio servidor (funciona sem internet).
- Celulares precisam estar na **mesma rede** do computador do servidor (Wi-Fi corporativo, não a rede de visitantes).
  Redes com "isolamento de clientes" impedem a conexão.
- Liberar a porta no firewall do computador que roda o servidor.
- Pedir à TI um **IP fixo/reserva de DHCP** ou um nome de máquina estável, para o endereço (e o QR code) não mudarem.
- Não expor o servidor para a internet.
- Desativar a suspensão do computador no horário de uso; se ele dormir, o jogo cai para todos.

## Log no terminal do host

Tudo o que acontece aparece no terminal onde o servidor roda (colorido) e também é gravado em
`data/logs/posigame-AAAA-MM-DD.log`, um arquivo por dia:

```
2026-09-29 12:31:02 INFO  [rede] página aberta por 192.168.0.34 (iOS)
2026-09-29 12:31:02 INFO  [rede] conexão aberta: 192.168.0.34 (iOS); 3 online
2026-09-29 12:31:09 INFO  [jogador] Duda entrou pela primeira vez (192.168.0.34, iOS)
2026-09-29 12:31:15 INFO  [jogador] #1 Duda (PO) entrou: 1/4 na partida, onda 0
2026-09-29 12:31:21 INFO  [onda] #1 onda 1 começou: 8 bugs, 1 jogador(es), servidor 400/400
2026-09-29 12:31:24 DEBUG [combate] #1 Duda derrotou Bug +10 (combo 1)
2026-09-29 12:31:58 INFO  [onda] #1 onda 1 limpa: bônus 75, placar do time 132, servidor 392/400
2026-09-29 12:40:10 INFO  [partida] #1 FIM DE JOGO (o time inteiro caiu): onda 6, 2452 pontos | Duda 2452
```

Registra conexões e desconexões (endereço e tipo de aparelho), nicks novos e recusados, entradas e saídas de partida,
quedas e reconexões, ondas, chefe, derrubadas, revives, habilidades, cada bug derrotado com os pontos, fim de jogo,
recordes, gravação de dados, tentativas suspeitas (arquivos fora das pastas públicas, excesso de mensagens) e erros.
`LOG_LEVEL=info` esconde o detalhe de combate (`debug`); `LOG_LEVEL=silent` desliga.

## Celular

- **Sem zoom:** pinça e toque duplo no mesmo lugar não dão zoom (também no iOS). Toques rápidos em lugares
  diferentes continuam funcionando normalmente.
- **Mesma interface no computador:** menu em abas e botões de poder na tela (com a tecla de cada um), além do teclado.
- **Menu em abas** (Boneco, Classe, Ranking) com botão JOGAR sempre à mão, botões grandes (mín. 44 px) e sem rolagem lateral.
- **Controles de toque** que se ajustam à altura da tela: joystick flutuante na esquerda e botões de ataque e habilidades na direita.
- **Tela cheia** (onde o navegador permite; no iPhone o botão some), tela sempre ligada durante a partida e vibração ao levar dano.
- **SAIR** pede um segundo toque para confirmar. No modo retrato aparece o aviso para girar o celular, com um botão para sair da partida.

## O escritório (mapa)

Mapa isométrico de 24x32 tiles baseado na planta do escritório:

- **Sala de reunião** (mesa grande com notebooks e quadro branco) e **sala do diretor** (mesa executiva, estantes, sofá e tapete) no topo.
- Coluna da esquerda: **componentes** (sem armários: três mesas com componentes em U, mesa redonda com 3 cadeiras, lixeira e janelas), **segurança do trabalho** (armários, mesa com capacetes e kit de primeiros socorros) e **copa** (balcão, geladeira, máquina de café, mesas e uma mesa comprida na parte de baixo).
- **Ponto eletrônico**: uma caixinha na parede da copa (lado do salão), acima da porta lateral.
- **Salão** com piso de porcelanato creme (peças de 2 m x 2 m). Só a Secretária executiva (do lado de fora da sala do diretor) tem mesa individual; os demais setores têm **baias em "+" com 4 lugares** (mesas cremes, divisórias pretas, um monitor preto e um notebook por lugar): duas de Fiscal e duas de SESMT à esquerda, a baia larga do Cadastro em frente à porta do diretor e, na coluna da direita, Projetos, Desenvolvimento e Financeiro. A sala do diretor é simples (mesa, duas cadeiras e uma planta). O mapa (38 x 55 tiles) segue o desenho de referência: reunião e diretor em cima, baias no meio, servidor no centro e componentes, segurança e copa embaixo à esquerda. Impressora, bebedouros, lixeiras e plantas ficam junto às paredes e móveis.
- Salas com divisórias de vidro e portas de 2 tiles; só a reunião tem piso de madeira, e cada sala tem uma placa com o nome na parede.
- **Minimapa** no canto da tela e uma seta que aponta para o servidor quando ele sai da vista.
- Os bugs **dão a volta pelas paredes e entram pelas portas** (navegação por campo de distâncias em `server/nav.js`); quem está atrás de uma parede não é atacado através dela.

## Guia

A aba **Guia** do menu lista todos os inimigos (com vida, velocidade, dano, pontos e a onda em que aparecem), os
8 power-ups (com raridade), os setores e as salas, usando os mesmos sprites do jogo.

## Como jogar

| Ação | Teclado | Celular |
|---|---|---|
| Mover | WASD / setas | joystick flutuante (metade esquerda da tela) |
| Atacar (mira automática no bug mais próximo) | Espaço, J ou segurar o mouse | botão ATQ |
| Habilidades 1, 2 e ultimate | 1, 2, 3 (ou K, L, U) | botões à direita |

Em celulares, use o modo paisagem.

- Defenda o **servidor** no centro do escritório. A partida termina quando o servidor cai **ou** o time inteiro cai.
- Bugs só nascem nos **portais** das bordas, com aviso de 1 s, e nunca perto de jogadores vivos.
- Quem entra (ou renasce) aparece na **zona segura** com 3 s de invulnerabilidade.
- DevOps e PO revivem aliados derrubados que ficarem perto. A cada onda limpa, todos voltam.
- A cada 5 ondas aparece o chefe **Segfault**.
- Pode jogar sozinho: a dificuldade escala com o número de jogadores presentes.

### Classes

Todas as classes têm poder ofensivo, cada uma no seu estilo:

| Classe | Estilo | Poderes (1, 2 e ultimate) |
|---|---|---|
| Dev | dano à distância constante | rajada nos 3 mais próximos · corrida · Hotfix (explosão em área) |
| QA | marca bugs (+30% de dano do time) | Caso de teste (marca e fere) · Regressão (dano em área e lentidão) · Bug bash (70 de dano em todos) |
| DevOps | cura e controle | Patch (cura o time e fere bugs) · Firewall (servidor invulnerável e queima ao redor) · Rollback (revive, cura e fere todos) |
| Tank | linha de frente | Grito (atrai e fere) · Escudo (menos dano e devolve dano) · Muralha (empurra, atordoa e esmaga) |
| PO | prioriza e sorteia | Priorizar (marca e acerta: +50% de dano, pontos x2) · Mudança de escopo (dano em todos, congelar, meteoros ou caos) · Sprint Review (congela, fere todos e paga o combo) |

Cada poder tem efeito visual e sonoro próprio (anéis, raios, partículas, tremor e flash de tela).

### Power-ups

Os bugs soltam power-ups (o chefe solta 3): Pizza (cura), Café (velocidade), Crachá VIP (60% menos dano por 8 s),
Energético (ataque 60% mais rápido por 8 s), Deploy (explosão), Ar-condicionado (congela todos por 3 s), Bônus
(+150 pontos) e Backup (cura o servidor e revive aliados). Os ativos aparecem no canto da tela com o tempo restante.

### Dicas

Dicas aparecem no menu, entre as ondas e na tela de fim de jogo (`shared/tips.js`), incluindo dicas da sua classe.

### Pontuação

Pontos por bug (com combo e bônus por onda), calculados **só no servidor**. O ranking é global (dia, semana e geral),
por nick. Os totais são gravados a cada onda para não se perderem numa queda, e a melhor partida entra no ranking quando o jogador sai ou o time cai. Um jogador só pode estar em uma partida por vez.

## Identidade sem login

Só nick. Na primeira visita o aparelho gera um identificador aleatório (guardado no navegador) que o servidor
associa ao nick. Não há recuperação: trocar de aparelho ou limpar o navegador exige um novo nick (o aviso aparece
antes de confirmar). Nicks inativos por 60 dias podem ser reivindicados por outra pessoa. Nicks passam por
filtro de palavrões e lista de nomes reservados.

## Partidas

- Várias partidas em paralelo (até `MAX_MATCHES`). A entrada é automática na partida mais cheia com vaga; se todas
  estiverem cheias, abre uma nova. Também dá para escolher uma partida na lista.
- Entrar no meio: o jogador cai direto na onda em andamento.
- Game over do time: mostra o resultado e **reinicia todos juntos** na onda 1, depois de 10 s.
- Partida sem jogadores conectados **pausa** (custo zero). Se alguém entrar em até 30 min, a onda em andamento recomeça com o servidor recuperado (mín. 60%). Após 30 min vazia, é encerrada e zerada.
- Quem cai da rede mantém o lugar por 45 s e volta para a mesma partida ao reconectar.

## LOD (celulares fracos)

O visual se adapta ao desempenho, sem mudar as regras do jogo (bugs, vida e dano são iguais para todos):

| Nível | FPS alvo | O que muda |
|---|---|---|
| Alta | 60 | sombras, explosões, anéis de habilidade, barras de vida, LEDs animados |
| Média | 45 | como a alta, com menos efeitos simultâneos |
| Baixa | 30 | sem sombras, explosões e barras; resolução interna menor |

Com "Auto" (padrão), o jogo desce de nível se o FPS cair e sobe de volta se estabilizar. Também dá para fixar o nível no menu.
O cenário é pré-renderizado uma vez, os sprites são desenhados por código e cacheados, e há um teto fixo de 36 bugs vivos.

### Nitidez

O jogo desenha numa resolução lógica pequena e a amplia por um fator **inteiro** (cada pixel lógico vira NxN pixels do
aparelho, considerando a densidade da tela), então a imagem não borra. Polígonos, linhas e elipses são rasterizados
pixel a pixel (`client/js/px.js`), sem suavização, e todos os sprites recebem contorno e sombreamento automáticos.

## Música e sons

Sete trilhas em chiptune geradas em tempo real com WebAudio (pulso 25%/50%, triângulo e ruído), sem arquivos de áudio:
menu (Expediente, Intervalo do Café), combate (Bug Hunter, Sprint Arcade, Deploy Turbo) e chefe (Segfault!, Kernel Panic).
No modo automático a faixa muda a cada onda; o botão FAIXA (menu e partida) percorre as faixas e fixa a escolhida. As partituras estão em
`client/js/music-data.js`. Há botões separados para música e efeitos (no menu e na partida). O navegador só libera o
áudio depois do primeiro toque ou tecla.

## Administração (no código)

- **Nicks bloqueados / reservados e limites:** edite `server/config.js`.
- **Linha de comando** (pare o servidor antes):

```bash
npm run admin -- list                 # jogadores e pontuações
npm run admin -- top day|week|all     # ranking
npm run admin -- remove <nick>        # remove um nick e as pontuações dele
npm run admin -- reset-ranking        # zera o ranking (mantém nicks e visuais)
```

Os dados ficam em `posigame/data/posigame.json` (escrita atômica) com backup diário em `data/backup/` (14 dias).

## Estrutura

```
server/   index.js (HTTP + WebSocket) · match.js (simulação) · nav.js (navegação) · matchmaker.js · store.js · nick.js · logger.js · config.js
shared/   game.js (mapa, classes, inimigos, colisão) · look.js (catálogo do boneco), usados por servidor e cliente
client/   index.html · style.css · js/ (main, net, world, render, scenery, props, iso, px, sprites, skillfx, input, ui, sfx, music) · fonts/
scripts/  admin.js
test/     testes automatizados (node:test)
```

Servidor autoritativo a 20 Hz; snapshots a 10 Hz. O cliente envia só direção de movimento e pedidos de ação,
interpola os outros jogadores (~120 ms) e prevê o próprio movimento. Todas as mensagens são validadas e limitadas
por taxa; o cliente nunca informa posições nem pontos.

## Testes

```bash
npm test
```

Cobrem regras da partida (spawn seguro, ondas, escala por jogadores, game over, reconexão, habilidades),
persistência e ranking, validação de nick e de visual, e o protocolo WebSocket de ponta a ponta.

## Fontes

Press Start 2P e VT323 (SIL Open Font License 1.1), incluídas em `client/fonts/` com as licenças.

## Ideias para as próximas versões

Mais mapas (Data Center, Refeitório), roupas por conquista, modo espectador e fila de espera, desafio do dia,
ranking por setor, QR code no próprio servidor e interesse por área na rede (LOD de rede).

## Cheats secretos (só para quem administra)

Abra o terminal escondido durante a partida com a tecla `` ` `` (ou 5 toques rápidos no placar, no celular) e digite um código.
O servidor valida tudo e, **quem usa qualquer cheat fica sem registrar pontos no ranking naquela rodada** (e o time não entra no
recorde de equipes). Códigos: `sudo` (modo deus liga/desliga), `hotfix` (cura o time e o servidor), `cafezao` (velocidade 45 s),
`turbo` (recargas zeradas + overclock), `rmrf` (remove todos os bugs), `deploy` (pula para a próxima onda), `segfault` (chama o chefe).
Desligue tudo com `CHEATS=0`.

## Easter egg e power-ups de chefe

- Segredo da sala de componentes: no cantinho de baixo à esquerda, segurar o **ataque básico** faz o personagem deitar no chão e dormir (Zzz) até começar a se mover ou levar dano.
- Os 3 power-ups que o chefe deixa **não somem** até alguém pegar (os dos bugs comuns duram 14 s).
