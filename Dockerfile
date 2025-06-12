# ---- Estág 1: Builder ----
# Dockerfile para construir e rodar a aplicação Node.js com pnpm em dois estágios
FROM node:22-alpine AS builder

# Instala o pnpm
RUN npm install -g pnpm

# Define o diretório de trabalho
WORKDIR /usr/src/app

# Copia os arquivos de dependências e instala as dependências
COPY package.json ./

# O 'pnpm fetch' pode ser usado para baixar dependências de forma mais eficiente em builds subsequentes
RUN pnpm fetch
RUN pnpm install --prod=false

# Copia o restante do código-fonte da aplicação
COPY . .

# Constrói a aplicação para produção
RUN pnpm run build

# ---- Estág 2: Produção ----
FROM node:22-alpine

# Instala o pnpm
RUN npm install -g pnpm

# Define o diretório de trabalho
WORKDIR /usr/src/app

# Copia os arquivos de dependências
COPY package.json ./

# Instala SOMENTE as dependências de produção
# O 'ts-node' e 'typescript' são uteis para seeding do banco de dados, então instalamos e depois removemos as dependências de desenvolvimento
RUN pnpm install --prod

# Copia o build da aplicação do estágio 'builder'
COPY --from=builder /usr/src/app/dist ./dist

# Copia o script de entrypoint para o contêiner
# Script para executar seed do banco de dados
COPY entrypoint.sh .

# Dá permissão de execução ao script
RUN chmod +x /usr/src/app/entrypoint.sh

# Define nosso script como o ponto de entrada
ENTRYPOINT ["/usr/src/app/entrypoint.sh"]

# Expõe a porta que a aplicação vai rodar
EXPOSE 3000

# Comando para iniciar a aplicação em produção
CMD ["node", "dist/main"]