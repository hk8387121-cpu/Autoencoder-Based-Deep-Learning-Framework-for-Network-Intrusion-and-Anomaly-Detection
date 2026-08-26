import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import io
import json

from ml_model import IDSAutoencoder

app = FastAPI(title="IDS Deep Learning API")

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://hk8387121-cpu.github.io")
ALLOWED_ORIGINS = [
    FRONTEND_URL,
    "http://localhost:3000",
    "http://localhost:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = IDSAutoencoder()

class PredictRequest(BaseModel):
    features: dict

class TrainRequest(BaseModel):
    dataset_path: str = "data/nsl_kdd_subset.csv"
    normal_label: str = "normal"
    percentile: float = 95.0

@app.get("/")
def read_root():
    return {"status": "ok", "message": "IDS Autoencoder API is running"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/api/v1/model/status")
def model_status():
    status_info = {
        "is_trained": model.is_trained,
        "threshold": float(model.threshold) if model.is_trained else None,
        "features": len(model.feature_columns) if model.is_trained else 0,
        "feature_names": model.feature_columns if model.is_trained else [],
        "status": "Ready for inference" if model.is_trained else "Awaiting training data",
        "training_samples": getattr(model, "training_samples", None),
        "model_version": "1.0.0"
    }
    return status_info

@app.post("/api/v1/predict")
def predict_single(request: PredictRequest):
    if not model.is_trained:
        raise HTTPException(status_code=400, detail="Model is not trained yet.")
    
    df = pd.DataFrame([request.features])
    results = model.predict(df)
    return results[0]

@app.post("/api/v1/predict/csv")
async def predict_csv(file: UploadFile = File(...)):
    if not model.is_trained:
        raise HTTPException(status_code=400, detail="Model is not trained yet.")
        
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV.")
        
    contents = await file.read()
    df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
    
    results = model.predict(df)
    
    # Merge results with original dataframe to return
    df['is_anomaly'] = [r['is_anomaly'] for r in results]
    df['prediction'] = [r['prediction'] for r in results]
    df['reconstruction_error'] = [r['reconstruction_error'] for r in results]
    df['confidence_score'] = [r['confidence_score'] for r in results]
    
    return {"results": results, "summary": {
        "total": len(results),
        "anomalies": sum(1 for r in results if r['is_anomaly']),
        "normal": sum(1 for r in results if not r['is_anomaly'])
    }}

@app.post("/api/v1/train")
def train_model(request: TrainRequest):
    try:
        path = request.dataset_path
        if not os.path.exists(path) and not path.startswith("http"):
            path = "https://raw.githubusercontent.com/defcom17/NSL_KDD/master/KDDTrain%2B_20Percent.txt"
            df = pd.read_csv(path, header=None)
            df.columns = [
                "duration","protocol_type","service","flag","src_bytes","dst_bytes","land","wrong_fragment",
                "urgent","hot","num_failed_logins","logged_in","num_compromised","root_shell","su_attempted",
                "num_root","num_file_creations","num_shells","num_access_files","num_outbound_cmds","is_host_login",
                "is_guest_login","count","srv_count","serror_rate","srv_serror_rate","rerror_rate","srv_rerror_rate",
                "same_srv_rate","diff_srv_rate","srv_diff_host_rate","dst_host_count","dst_host_srv_count",
                "dst_host_same_srv_rate","dst_host_diff_srv_rate","dst_host_same_src_port_rate","dst_host_srv_diff_host_rate",
                "dst_host_serror_rate","dst_host_srv_serror_rate","dst_host_rerror_rate","dst_host_srv_rerror_rate",
                "label","difficulty_level"
            ]
        else:
            df = pd.read_csv(path)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Dataset not found or cannot be read: {str(e)}")
        
    history = model.train(df, normal_label=request.normal_label, percentile=request.percentile)
    
    return {
        "status": "success",
        "threshold": float(model.threshold),
        "training_samples": len(df[df['label'] == request.normal_label]),
        "features": len(model.feature_columns),
        "history": history
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
