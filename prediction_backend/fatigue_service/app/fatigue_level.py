from fastapi import FastAPI, HTTPException, Header
import numpy as np
from typing import List,Dict, Optional
import pandas as pd
import tensorflow as tf
from dotenv import load_dotenv
import os

load_dotenv()
API_KEY = os.getenv("API_KEY")

app = FastAPI(
    title="Fatigue Level Prediction API",
    description="API pour prédire le niveau de fatigue basé sur les données GPS, HR et HRV",
    version="1.0.0"
)

MODEL = None
FEATURE_COLS = ['hr_bpm','rr_ms','speed_yds_per_s','acc_yds_per_s2']  # adapte selon ton modèle

@app.on_event("startup")
async def startup_event():
    global MODEL
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # Répertoire actuel
    MODEL_PATH = os.path.join(BASE_DIR, "models", "hybrid_fatigue_model.keras")
    MODEL = tf.keras.models.load_model(MODEL_PATH)

@app.post("/predict_fatigue")
async def predict_fatigue(
    data: List[Dict],
    x_api_key: Optional[str] = Header(None)
):
    print("Api key",API_KEY)
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")
    # 1. Charger dans un DataFrame
    df = pd.DataFrame(data)
    # 2. Renommer les colonnes pour correspondre à FEATURE_COLS
    df = df.rename(columns={
        'hr': 'hr_bpm',
        'hrv': 'rr_ms',
        'speed': 'speed_yds_per_s',
        'acc': 'acc_yds_per_s2',
        'ts_merge': 'timestamp'
    })
    # 3. Trier par timestamp
    df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce')
    df = df.dropna(subset=['timestamp']).sort_values('timestamp')
    # 4. Sélectionner les 4 features
    features = df[FEATURE_COLS].copy()
    # 5. Cast numerics et impute
    for col in FEATURE_COLS:
        features[col] = pd.to_numeric(features[col], errors='coerce')
    features = features.ffill().bfill().fillna(0.0)
    # 6. Vérifier la taille
    if features.shape[0] < 32:
        raise HTTPException(status_code=400, detail="Il faut au moins 32 lignes de données.")
    # 7. Prendre les 32 dernières lignes
    window = features.tail(32).to_numpy().astype(np.float32)
    window = window.reshape(1, 32, 4)
    # 8. Prédire
    try:
        proba = MODEL.predict(window)[0]  # softmax sur 5 classes
        # Optionnel: map 0..4 vers 1..5 pour l'UI
        fatigue_level = int(np.argmax(proba)) + 1
        return {
            "fatigue_level": fatigue_level,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de prédiction: {str(e)}")
    
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("fatigue:app", host="0.0.0.0", port=8000, reload=True)