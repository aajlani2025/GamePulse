from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
import numpy as np
import tensorflow as tf
import time

# --------------------------------------------------
# CONFIG
# --------------------------------------------------
MODEL_PATH = "model/best_fatigue_model_all_levels_win30.keras"
WIN = 30
N_FEATURES = 21

FATIGUE_LABELS = {
    0: "Very Low",
    1: "Low",
    2: "Moderate",
    3: "High"
}

# --------------------------------------------------
# LOAD MODEL (once)
# --------------------------------------------------
model = tf.keras.models.load_model(MODEL_PATH)

# --------------------------------------------------
# FASTAPI APP
# --------------------------------------------------
app = FastAPI(title="GamePulse ML Service", version="1.0.0")

# --------------------------------------------------
# INPUT SCHEMAS
# --------------------------------------------------
class Window(BaseModel):
    """
    A precomputed feature window:
    shape = (30, 21)
    order MUST match training FEATURE_COLUMNS
    """
    features: List[List[float]] = Field(
        ..., description="30x21 feature window"
    )

class PredictRequest(BaseModel):
    playerId: str = "UNKNOWN"
    sampleTs: Optional[str] = None
    window: Window
    engine: str = "cnn_bilstm_v1"

# --------------------------------------------------
# HEALTH
# --------------------------------------------------
@app.get("/health")
def health():
    return {"status": "ok", "ts": int(time.time() * 1000)}

# --------------------------------------------------
# PREDICT
# --------------------------------------------------
@app.post("/predict")
def predict(req: PredictRequest):
    try:
        # Convert to numpy
        x = np.array(req.window.features, dtype=np.float32)

        # Validate shape
        if x.shape != (WIN, N_FEATURES):
            raise ValueError(
                f"Expected input shape ({WIN}, {N_FEATURES}), got {x.shape}"
            )

        # Add batch dimension
        x = np.expand_dims(x, axis=0)  # (1, 30, 21)

        # Inference
        probs = model.predict(x, verbose=0)[0]

        fatigue_level = int(np.argmax(probs))
        confidence = float(np.max(probs))

        return {
            "playerId": req.playerId,
            "sampleTs": req.sampleTs,
            "model_version": req.engine,
            "fatigue": {
                "level": fatigue_level,
                "label": FATIGUE_LABELS.get(fatigue_level, "unknown"),
                "confidence": confidence,
                "probabilities": probs.tolist()
            }
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
