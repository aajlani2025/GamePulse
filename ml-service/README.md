GamePulse ML Service

This repository contains the FastAPI service for predicting player fatigue using a CNN + BiLSTM model.

Folder Structure
ml-service/
├─ app.py                # FastAPI application
├─ model/                # Folder to store the trained model
│  └─ cnn_bilstm.h5      # Example model file (not included in repo)
├─ requirements.txt      # Python dependencies
├─ Dockerfile            # Docker setup
└─ README.md             # This file


Note: The actual model files (.h5 for Keras/TensorFlow or .pt for PyTorch) are not included in this repository. They are ignored in .gitignore due to size. You must download the trained model from the GamePulse shared drive.

Model Download

Access the GamePulse shared drive.

Download the model file (example: cnn_bilstm.h5).

Place the model file inside:

ml-service/model/


The FastAPI app (app.py) will automatically load the model from:

MODEL_PATH = "model/cnn_bilstm.h5"


⚠️ Ensure the filename matches MODEL_PATH in app.py.

Model Input

The model expects a sliding window of precomputed features:

Shape: (30, 21)

30 timesteps (WIN = 30)

21 features per timestep (N_FEATURES = 21)

Order of features must match the training FEATURE_COLUMNS. Example features include:

['ax_mean','ax_std','ax_median',
 'ay_mean','ay_std','ay_median',
 'az_mean','az_std','az_median',
 'gx_mean','gx_std','gx_median',
 'gy_mean','gy_std','gy_median',
 'gz_mean','gz_std','gz_median',
 'average','rr_ms','HRR_percent']


Input JSON example for /predict endpoint:

{
  "playerId": "player123",
  "sampleTs": "2025-12-25T20:25:58Z",
  "window": {
    "features": [
      [0.01, 0.23, ..., 0.11],   // 21 features
      [0.15, 0.21, ..., 0.09],
      ...
      [0.12, 0.44, ..., 0.05]    // 30th row
    ]
  },
  "engine": "cnn_bilstm_v1"
}

Model Output

The API returns a JSON object with predicted fatigue level:

{
  "playerId": "player123",
  "sampleTs": "2025-12-25T20:25:58Z",
  "model_version": "cnn_bilstm_v1",
  "fatigue": {
    "level": 2,                           // integer: 0 to 3
    "label": "Moderate",                  // human-readable label
    "confidence": 0.74,                   // highest softmax probability
    "probabilities": [0.05,0.02,0.74,0.19] // full softmax vector
  }
}


level corresponds to the fatigue category:

0 → Very Low

1 → Low

2 → Moderate

3 → High

confidence indicates the model’s certainty for the predicted class.

FastAPI Service (app.py)

Endpoints:

GET /health → check service status

POST /predict → make predictions

Loads the model once at startup from ml-service/model/.

Validates input shape (30, 21) before inference.

Returns prediction, confidence, and full probability distribution.

Running the Service
Locally:
cd ml-service
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 9000 --reload

Docker:
docker build -t gamepulse-ml-service .
docker run -p 9000:9000 gamepulse-ml-service


The service will be available at http://localhost:9000.

Test /health and /predict endpoints.

Notes

Model files are large and not versioned. Always place the latest model in ml-service/model/.

Ensure the feature window matches the model's training configuration for reliable predictions.