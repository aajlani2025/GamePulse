from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import time

app = FastAPI(title="GamePulse ML Service", version="0.1.0")

class Window(BaseModel):
    hr: List[float] = []
    acc: List[Dict[str, float]] = []
    gyro: List[Dict[str, float]] = []

class PredictRequest(BaseModel):
    playerId: str = "UNKNOWN"
    sampleTs: Optional[str] = None
    window: Window
    engine: str = "stub_cnn_bilstm"

@app.get("/health")
def health():
    return {"status": "ok", "ts": int(time.time() * 1000)}

@app.post("/predict")
def predict(req: PredictRequest):
    # TODO: remplacer par CNN + BiLSTM inference
    # Pour l’instant on renvoie un résultat stable pour tester le wiring.
    fatigue_score = 0.35
    fatigue_level = 2
    confidence = 0.75

    return {
        "playerId": req.playerId,
        "sampleTs": req.sampleTs,
        "model_version": req.engine,
        "fatigue": {
            "score": fatigue_score,
            "level": fatigue_level,
            "confidence": confidence
        }
    }
