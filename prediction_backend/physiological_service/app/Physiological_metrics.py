from email.header import Header
from fastapi import FastAPI, HTTPException
import joblib
import numpy as np
from datetime import datetime
import logging
from typing import List, Optional,Dict
from dotenv import load_dotenv
import os

load_dotenv()
API_KEY = os.getenv("API_KEY")
# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Physiological Prediction API",
    description="API pour prédire HR et HRV basé sur les données GPS",
    version="1.0.0"
)

# Variables globales pour les modèles et scaler
MODELS = {}
SCALER = None
FEATURE_COLS = ["Vitesse", "Acceleration", "Distance_HI_inc", "Sprint_inc", "COD_inc", "Impact_inc", "elapsed_time_sec"]
MODELS_LOADED = False

def load_models_and_scaler():
    """Charge tous les modèles et le scaler"""
    global MODELS, SCALER, MODELS_LOADED
    
    try:
        logger.info("⏳ Chargement des modèles et du scaler au démarrage...")
        BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # Répertoire actuel
        MODEL_PATH = os.path.join(BASE_DIR, "models")
        # Charger les modèles XGBoost
        MODELS["HR"] = joblib.load(os.path.join(MODEL_PATH, "HR_xgb.joblib"))
        MODELS["HRV"] = joblib.load(os.path.join(MODEL_PATH, "HRV_xgb.joblib"))

        # Charger le scaler 
        SCALER = joblib.load(os.path.join(MODEL_PATH, "scaler.joblib"))
        MODELS_LOADED = True
        
        logger.info(f" Modèles chargés avec succès: {list(MODELS.keys())}")
        logger.info(f" Scaler chargé: {SCALER is not None}")
        logger.info(f" Features attendues: {FEATURE_COLS}")
        logger.info(" API prête à recevoir des requêtes")
        
    except Exception as e:
        logger.error(f" Erreur critique lors du chargement: {str(e)}")
        MODELS_LOADED = False
        raise e

@app.on_event("startup")
async def startup_event():
    """Charge les modèles immédiatement au démarrage de l'API"""
    load_models_and_scaler()



@app.post("/predict/{target}")
async def predict(target: str, features: List[float], x_api_key: Optional[str] = Header(None)):
    """
    Fait une prédiction pour HR ou HRV
    - target: "HR" ou "HRV"
    - features: liste de 7 valeurs dans l'ordre exact:
      ["Vitesse", "Acceleration", "Distance_HI_inc", "Sprint_inc", 
       "COD_inc", "Impact_inc", "elapsed_time_sec"]
    """

    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")

    if not MODELS_LOADED:
        raise HTTPException(
            status_code=503, 
            detail="Service unavailable - Modèles non chargés. Vérifiez les logs du serveur."
        )
    
    if target not in MODELS:
        raise HTTPException(
            status_code=404, 
            detail=f"Target '{target}' non supportée. Targets disponibles: {list(MODELS.keys())}"
        )
    
    if len(features) != len(FEATURE_COLS):
        raise HTTPException(
            status_code=400,
            detail=f"Nombre de features incorrect. Attendu: {len(FEATURE_COLS)}, Reçu: {len(features)}. "
                   f"Features attendues: {FEATURE_COLS}"
        )
    
    try:
        # Conversion en numpy array et reshaping
        features_array = np.array(features).reshape(1, -1)
        
        # APPLICATION DU SCALER (TRÈS IMPORTANT)
        features_scaled = SCALER.transform(features_array)
        
        # Prédiction
        start_time = datetime.now()
        prediction = MODELS[target].predict(features_scaled)
        processing_time = (datetime.now() - start_time).total_seconds()
        
        logger.info(f"Prédiction {target} réussie - temps: {processing_time:.3f}s")
        
        return {
            "target": target,
            "prediction": float(prediction[0]),  # Convertir en float simple
            "processing_time_seconds": processing_time,
        }
        
    except Exception as e:
        logger.error(f" Erreur lors de la prédiction {target}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur de prédiction: {str(e)}")

@app.post("/predict_both")
async def predict_both(body: Dict,
    x_api_key: Optional[str] = Header(None)
):
    """Prédit à la fois HR et HRV """
    print("Api key",API_KEY)
    print("x_api_key",x_api_key)
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")

    if not MODELS_LOADED:
        raise HTTPException(
            status_code=503, 
            detail="Service unavailable - Modèles non chargés. Vérifiez les logs du serveur."
        )
    features = body["features"]
    if len(features) != len(FEATURE_COLS):
        raise HTTPException(
            status_code=400,
            detail=f"Nombre de features incorrect. Attendu: {len(FEATURE_COLS)}, Reçu: {len(features)}"
        )
    
    try:
        features_array = np.array(features).reshape(1, -1)
        features_scaled = SCALER.transform(features_array)
        
        start_time = datetime.now()
        
        # Prédiction pour les deux targets
        hr_pred = float(MODELS["HR"].predict(features_scaled)[0])
        hrv_pred = float(MODELS["HRV"].predict(features_scaled)[0])
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        logger.info(f"Prédiction double réussie - temps: {processing_time:.3f}s")
        
        return {
            "predictions": {
                "HR": hr_pred,
                "HRV": hrv_pred
            },
            "processing_time_seconds": processing_time,
        }
        
    except Exception as e:
        logger.error(f"❌ Erreur lors de la prédiction double: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur de prédiction: {str(e)}")


