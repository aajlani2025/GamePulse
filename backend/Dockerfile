FROM node:20-alpine
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
RUN npm ci --omit=dev

# Copier tout le code backend
COPY . .

ENV NODE_ENV=production
EXPOSE 8000
CMD ["node", "server.js"]