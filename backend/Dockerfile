# backend/Dockerfile (placeholder)
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Dépendances (peut être vide au début)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt || true

# Code
COPY . .

EXPOSE 8000
# Démarrage provisoire: simple serveur HTTP (à remplacer par ta vraie app)
CMD ["python", "-m", "http.server", "8000"]
