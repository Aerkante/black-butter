# Black Butter

Projeto de sistema transversal de retalhos e métricas sobre poluição em Manaus - AM.

## Instale as dependências
```bash
yarn
# ou
npm install
```

### Inicie o aplicativo no modo de desenvolvimento (recarregamento rápido, relatórios de erro, etc.)
```bash
quasar dev
```

### Lint nos arquivos
```bash
yarn lint
# ou
npm run lint
```

### Formate os arquivos
```bash
yarn format
# ou
npm run format
```

### Compile o aplicativo para produção
```bash
quasar build
```

## Para construir o Laravel

### Navegue até o backend
```bash
cd backend/
```

### Instale as dependências
```bash
composer install
# ou
composer update
```

### Inicie o contêiner do Docker
```bash
docker-compose up
```

### Prepare o banco de dados
```bash
php artisan migrate:fresh --seed
```

### Inicie o servidor de desenvolvimento PHP
```bash
php artisan serve
```

### Personalize a configuração
Consulte [Configurando quasar.config.js](https://v2.quasar.dev/quasar-cli-vite/quasar-config-js).

## Ferramentas Necessárias

### Ambiente Linux
- [Node.js](https://nodejs.org/) (para executar `yarn` ou `npm`)
- [Yarn](https://classic.yarnpkg.com/en/docs/install/#debian-stable) (para instalar dependências JavaScript)
- [Quasar CLI](https://v2.quasar.dev/quasar-cli/installation)
- [Docker](https://docs.docker.com/engine/install/ubuntu/) (para executar contêineres)
- [Composer](https://getcomposer.org/download/) (para gerenciar dependências PHP)

### Ambiente Windows
- [Node.js](https://nodejs.org/) (para executar `yarn` ou `npm`)
- [Yarn](https://classic.yarnpkg.com/en/docs/install/#windows-stable) (para instalar dependências JavaScript)
- [Quasar CLI](https://v2.quasar.dev/quasar-cli/installation)
- [Docker Desktop](https://docs.docker.com/desktop/install/) (para executar contêineres)
- [WSL 2 (Windows Subsystem for Linux)](https://docs.microsoft.com/en-us/windows/wsl/install) (para uma experiência mais integrada com o desenvolvimento Linux)
- [Composer](https://getcomposer.org/download/) (para gerenciar dependências PHP)
