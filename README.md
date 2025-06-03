# Tanque Cheio API

Sistema backend para coleta, processamento e disponibilização de dados de preços de combustíveis no Brasil, com foco na região Nordeste, utilizando os relatórios semanais da ANP (Agência Nacional do Petróleo, Gás Natural e Biocombustíveis).

## 📌 Visão Geral

O Tanque Cheio API automatiza o processo de:

- Download dos relatórios semanais em formato Excel disponibilizados pela ANP
- Processamento e transformação dos dados relevantes
- Armazenamento estruturado em um banco de dados relacional
- Exposição dos dados através de uma API RESTful para consumo por aplicações clientes

## 🚀 Tecnologias Utilizadas

- **Node.js**
- **NestJS**
- **TypeORM**
- **PostgreSQL**
- **Docker & Docker Compose**
- **pnpm**
- **Prettier & ESLint**

## 📁 Estrutura de Pastas

A estrutura do projeto é organizada da seguinte forma:

```
tanque-cheio-api/
├── dataset/                # Armazena os arquivos CSV convertidos das planilhas(.XLSX)
├── public/                 # Arquivos públicos acessíveis externamente
├── src/                    # Código-fonte principal da aplicação
│   ├── api/                # Módulos organizados por domínio (e.g., Preços, Postos de Combustíveis, Localização, Auth)
│   ├── common/*            # Componentes reutilizáveis e utilitários
│   ├── config/             # Componentes de configuração da aplicação
│   ├── database/
│   │     ├── entity/       # Esquema do banco de dados usando TypeORM
│   │     └── seed/         # Ponto de partida para inicializar a aplicação
│   ├── main.ts             # Ponto de entrada da aplicação
│   └── app.module.ts       # Módulo raiz da aplicação
├── temp/                   # Arquivos temporários durante o processamento das planilhas baixadas da ANP
├── test/                   # Testes automatizados
├── .env.example            # Exemplo de arquivo de variáveis de ambiente
├── .gitignore              # Arquivos e pastas ignorados pelo Git
├── .prettierrc             # Configuração do Prettier
├── docker-compose.yml      # Configuração do Docker Compose
├── Dockerfile              # Dockerfile para containerização da aplicação
├── nest-cli.json           # Configuração do NestJS CLI
├── package.json            # Dependências e scripts do projeto
├── pnpm-lock.yaml          # Lockfile do pnpm
├── tsconfig.build.json     # Configuração do TypeScript para build
└── tsconfig.json           # Configuração principal do TypeScript
```

## ⚙️ Configuração e Execução

### Pré-requisitos

- Node.js (versão recomendada: 18.x)
- pnpm (gerenciador de pacotes)
- Docker & Docker Compose

### Passos para execução

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/matheudsp/tanque-cheio-api.git
   cd tanque-cheio-api
   ```

2. **Instale as dependências:**
   ```bash
   pnpm install
   ```

3. **Configure as variáveis de ambiente:**
   - Crie um arquivo `.env` na raiz do projeto com base no `.env.example` fornecido

4. **(NOT WORKING YET) Inicie os containers com Docker Compose:**
   ```bash
   docker-compose up -d
   ```

5. **Acesse a aplicação:**
   - A API estará disponível em `http://localhost:3000`

## 📌 Endpoints da API

A documentação detalhada dos endpoints disponíveis pode ser encontrada no arquivo `postman.json` e importada no Postman.

<!-- ## 🧪 Testes

Para executar os testes automatizados:

```bash
pnpm test
``` -->

## 🧑‍💻 Autor

**Matheus Pereira** - [@matheudsp](https://github.com/matheudsp)

## 📄 Licença

Este projeto está licenciado sob a Licença MIT. Consulte o arquivo LICENSE para obter mais detalhes.