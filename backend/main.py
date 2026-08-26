import os
import threading
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import io

from ml_model import IDSAutoencoder

app = FastAPI(title="IDS Deep Learning API")

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://hk8387121-cpu.github.io")
ALLOWED_ORIGINS = [FRONTEND_URL, "http://localhost:3000", "http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = IDSAutoencoder()
training_lock = threading.Lock()
training_in_progress = False
training_error = None

NSL_KDD_URL = "https://raw.githubusercontent.com/defcom17/NSL_KDD/master/KDDTrain%2B_20Percent.txt"
NSL_KDD_COLUMNS = [
    "duration","protocol_type","service","flag","src_bytes","dst_bytes","land","wrong_fragment",
    "urgent","hot","num_failed_logins","logged_in","num_compromised","root_shell","su_attempted",
    "num_root","num_file_creations","num_shells","num_access_files","num_outbound_cmds","is_host_login",
    "is_guest_login","count","srv_count","serror_rate","srv_serror_rate","rerror_rate","srv_rerror_rate",
    "same_srv_rate","diff_srv_rate","srv_diff_host_rate","dst_host_count","dst_host_srv_count",
    "dst_host_same_srv_rate","dst_host_diff_srv_rate","dst_host_same_src_port_rate","dst_host_srv_diff_host_rate",
    "dst_host_serror_rate","dst_host_srv_serror_rate","dst_host_rerror_rate","dst_host_srv_rerror_rate",
    "label","difficulty_level"
]

class PredictRequest(BaseModel):
    features: dict

class TrainRequest(BaseModel):
    dataset_path: str = "data/nsl_kdd_subset.csv"
    normal_label: str = "normal"
    percentile: float = 95.0


def load_training_dataset(path: str) -> pd.DataFrame:
    if os.path.exists(path) and not path.startswith("http"):
        return pd.read_csv(path)

    df = pd.read_csv(NSL_KDD_URL, header=None)
    df.columns = NSL_KDD_COLUMNS
    return df


def run_training(dataset_path: str = "data/nsl_kdd_subset.csv", normal_label: str = "normal", percentile: float = 95.0):
    global training_in_progress, training_error
    with training_lock:
        if training_in_progress:
            return False
        training_in_progress = True
        training_error = None

    try:
        df = load_training_dataset(dataset_path)
        model.train(df, normal_label=normal_label, percentile=percentile)
        return True
    except Exception as exc:
        training_error = str(exc)
        print(f"Model training failed: {exc}")
        return False
    finally:
        training_in_progress = False


@app.on_event("startup")
async def startup_event():
    # Do not train automatically on every Render restart. Render Free instances
    # can restart/sleep, and automatic training makes the API appear unavailable
    # for several minutes. Train explicitly through POST /api/v1/train instead.
    if model.is_trained:
        print("Loaded saved autoencoder. Model is ready for inference.")
    else:
        print("No saved autoencoder found. Model is awaiting training.")


@app.get("/")
def read_root():
    return {"status": "ok", "message": "IDS Autoencoder API is running"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/api/v1/model/status")
def model_status():
    return {
        "is_trained": model.is_trained,
        "training_in_progress": training_in_progress,
        "threshold": float(model.threshold) if model.is_trained else None,
        "features": len(model.feature_columns) if model.is_trained else 0,
        "feature_names": model.feature_columns if model.is_trained else [],
        "status": (
            "Ready for inference" if model.is_trained
            else "Training model" if training_in_progress
            else "Training failed" if training_error
            else "Model not trained"
        ),
        "training_samples": getattr(model, "training_samples", None),
        "training_error": training_error,
        "model_version": "1.2.0"
    }


@app.post("/api/v1/predict")
def predict_single(request: PredictRequest):
    if training_in_progress:
        raise HTTPException(status_code=503, detail="Model is still training. Please retry shortly.")
    if not model.is_trained:
        raise HTTPException(status_code=400, detail="Model is not trained yet. Open Settings and train the model.")
    return model.predict(pd.DataFrame([request.features]))[0]


@app.post("/api/v1/predict/csv")
async def predict_csv(file: UploadFile = File(...)):
    if training_in_progress:
        raise HTTPException(status_code=503, detail="Model is still training. Please retry shortly.")
    if not model.is_trained:
        raise HTTPException(status_code=400, detail="Model is not trained yet. Open Settings and train the model.")
    if not file.filename or not file.filename.lower().endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV.")

    contents = await file.read()
    df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
    results = model.predict(df)

    return {
        "results": results,
        "summary": {
            "total": len(results),
            "anomalies": sum(1 for r in results if r['is_anomaly']),
            "normal": sum(1 for r in results if not r['is_anomaly'])
        }
    }


@app.post("/api/v1/train")
def train_model(request: TrainRequest):
    if training_in_progress:
        raise HTTPException(status_code=409, detail="Model training is already in progress.")

    success = run_training(request.dataset_path, request.normal_label, request.percentile)
    if not success or not model.is_trained:
        raise HTTPException(status_code=500, detail=training_error or "Model training failed.")

    return {
        "status": "success",
        "threshold": float(model.threshold),
        "training_samples": model.training_samples,
        "features": len(model.feature_columns),
        "history": getattr(model, "last_history", {})
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
