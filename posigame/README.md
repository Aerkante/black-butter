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
`PLAYERS_PER_MATCH` (4), `INACTIVITY_MIN` (30), `DATA_DIR` (`posigame/data`).

## Requisitos de rede (para conversar com a TI)

- O jogo usa **uma porta TCP** (padrão 8080) para HTTP e WebSocket. Nada sai para a internet:
  as fontes e todos os gráficos vêm do próprio servidor (funciona sem internet).
- Celulares precisam estar na **mesma rede** do computador do servidor (Wi-Fi corporativo, não a rede de visitantes).
  Redes com "isolamento de clientes" impedem a conexão.
- Liberar a porta no firewall do computador que roda o servidor.
- Pedir à TI um **IP fixo/reserva de DHCP** ou um nome de máquina estável, para o endereço (e o QR code) não mudarem.
- Não expor o servidor para a internet.
- Desativar a suspensão do computador no horário de uso; se ele dormir, o jogo cai para todos.

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

| Classe | Papel |
|---|---|
| Dev | dano à distância; rajada, corrida e explosão em área |
| QA | marca bugs (+30% de dano do time), deixa os bugs lentos |
| DevOps | cura o time, protege o servidor, revive todos |
| Tank | atrai bugs, reduz dano recebido, empurra e atordoa |
| PO | prioriza um bug (+50% de dano e pontos x2), muda o escopo (efeito aleatório), congela tudo e paga o combo em pontos |

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
- Partida sem jogadores conectados **pausa** (custo zero). Após 30 min vazia, é encerrada e zerada.
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

Trilhas em chiptune geradas em tempo real com WebAudio (pulso 25%/50%, triângulo e ruído), sem arquivos de áudio:
menu (calma), combate (mais calma entre ondas) e chefe (mais rápida). As partituras estão em
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
server/   index.js (HTTP + WebSocket) · match.js (simulação) · matchmaker.js · store.js · nick.js · config.js
shared/   game.js (mapa, classes, inimigos, colisão) · look.js (catálogo do boneco), usados por servidor e cliente
client/   index.html · style.css · js/ (main, net, world, render, sprites, input, ui, sfx) · fonts/
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
