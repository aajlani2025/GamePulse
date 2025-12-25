# GamePulse ML Service

This folder contains the FastAPI service for predicting player fatigue using a CNN + BiLSTM model.

---

## Folder Structure
```
ml-service/
├─ app.py # FastAPI application
├─ model/ # Folder to store the trained model
│ └─ cnn_bilstm.h5 # Example model file (not included in repo)
├─ requirements.txt # Python dependencies
├─ Dockerfile # Docker setup
└─ README.md # This file
```
**Note:** The actual model file is **not included** in this repository. They are ignored in `.gitignore`. You must download the trained model from the GamePulse shared drive.

---

## Model Download

1. Access the GamePulse shared drive.  
2. Download the model file from : Gamepulse/GamePulse_Project_Collaboratif/04_documents
3. File name is :  
best_fatigue_model_all_levels_win30.keras
4. Place the model file inside: ml-service/model/

## Model Input

The model expects a sliding window of precomputed features:

Shape: (30, 21)

30 timesteps (WIN = 30)

21 features per timestep (N_FEATURES = 21)

Order of features must match the training FEATURE_COLUMNS.

### Example features:
```
['ax_mean','ax_std','ax_median',
 'ay_mean','ay_std','ay_median',
 'az_mean','az_std','az_median',
 'gx_mean','gx_std','gx_median',
 'gy_mean','gy_std','gy_median',
 'gz_mean','gz_std','gz_median',
 'average','rr_ms','HRR_percent']
```
## Model Output

The API returns a JSON object with predicted fatigue level:
```
{
  "playerId": "player123",
  "sampleTs": "2025-12-25T20:25:58Z",
  "model_version": "cnn_bilstm_v1",
  "fatigue": {
    "level": 2,                         
    "label": "Moderate",                  
    "confidence": 0.74,                 
    "probabilities": [0.05,0.02,0.74,0.19] 
  }
}
```
# FastAPI Service (app.py)

##  Endpoints:

- GET /health → check service status

- POST /predict → make predictions

### Behavior:

- Loads the model once at startup from ml-service/model/

- Validates input shape (30, 21) before inference

- Returns prediction, confidence, and full probability distribution

## Running the Service
### Locally : 
- cd ml-service
- pip install -r requirements.txt
- uvicorn app:app --host 0.0.0.0 --port 9000 --reload

### Docker :
- docker build -t gamepulse-ml-service .
- docker run -p 9000:9000 gamepulse-ml-service


The service will be available at: http://localhost:9000

Test /health and /predict endpoints.