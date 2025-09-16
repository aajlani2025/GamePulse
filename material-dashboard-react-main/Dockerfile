# ---- Build (React) ----
FROM node:18 AS build
WORKDIR /app

# Installe d'abord les deps pour profiter du cache
COPY material-dashboard-react-main/package*.json ./
RUN npm ci || npm install

# Copie le code et construit
COPY material-dashboard-react-main/ .
# Optionnel : injecter la base API au build
ARG REACT_APP_API_BASE=http://191.101.1.242:8000
ENV REACT_APP_API_BASE=${REACT_APP_API_BASE}
RUN npm run build

# ---- Serve (Nginx) ----
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx","-g","daemon off;"]
