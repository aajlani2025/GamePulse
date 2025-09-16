# ---- Build (React) ----
FROM node:18 AS build
WORKDIR /app

# Copy deps first to use layer cache
COPY package*.json ./
RUN npm ci || npm install

# Copy the rest of the app
COPY . .

# Optional: inject API base at build-time
ARG REACT_APP_API_BASE
ENV REACT_APP_API_BASE=${REACT_APP_API_BASE}

# Avoid CRA failing on warnings in CI
ENV CI=false

RUN npm run build

# ---- Serve (Nginx) ----
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx","-g","daemon off;"]
