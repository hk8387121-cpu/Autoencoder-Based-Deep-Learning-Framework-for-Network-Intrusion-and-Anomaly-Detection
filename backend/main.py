import io
import os
import threading
import time
from collections import deque
from pathlib import Path
from typing import Any, Optional

import pandas as pd
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ml_model import IDSAutoencoder

BASE_DIR = Path(__file__).resolve().parent
app = FastAPI(title="IDS Deep Learning API", version="1.4.0")

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://hk8387121-cpu.github.io").rstrip("/")
ALLOWED_ORIGINS = list(dict.fromkeys([FRONTEND_URL, "https://hk8387121-cpu.github.io", "http://localhost:3000", "http://localhost:5173"]))
app.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

model = IDSAutoencoder()
training_lock = threading.Lock()
training_in_progress = False
training_error: Optional[str] = None
alert_lock = threading.Lock()
alerts: deque[dict[str, Any]] = deque(maxlen=500)
metric_lock = threading.Lock()
metrics = {"started_at": time.time(), "total_predictions": 0, "normal_predictions": 0, "anomalies_detected": 0, "last_prediction_at": None, "last_anomaly_at": None}

NSL_KDD_URL = "https://raw.githubusercontent.com/defcom17/NSL_KDD/master/KDDTrain%2B_20Percent.txt"
NSL_KDD_COLUMNS = [
    "duration", "protocol_type", "service", "flag", "src_bytes", "dst_bytes", "land", "wrong_fragment", "urgent", "hot", "num_failed_logins", "logged_in", "num_compromised", "root_shell", "su_attempted", "num_root", "num_file_creations", "num_shells", "num_access_files", "num_outbound_cmds", "is_host_login", "is_guest_login", "count", "srv_count", "serror_rate", "srv_serror_rate", "rerror_rate", "srv_rerror_rate", "same_srv_rate", "diff_srv_rate", "srv_diff_host_rate", "dst_host_count", "dst_host_srv_count", "dst_host_same_srv_rate", "dst_host_diff_srv_rate", "dst_host_same_src_port_rate", "dst_host_srv_diff_host_rate", "dst_host_serror_rate", "dst_host_srv_serror_rate", "dst_host_rerror_rate", "dst_host_srv_rerror_rate", "label", "difficulty_level"
]

class PredictRequest(BaseModel):
    features: dict[str, Any]
    source_ip: Optional[str] = None
    destination_ip: Optional[str] = None
    protocol: Optional[str] = None
    status: Optional[str] = None

class TrainRequest(BaseModel):
    dataset_path: str = "data/nsl_kdd_subset.csv"
    normal_label: str = "normal"
    percentile: float = Field(default=95.0, ge=50.0, le=99.9)

def resolve_dataset_path(path: str) -> str:
    if not path:
        return str((BASE_DIR / "data" / "nsl_kdd_subset.csv").resolve())
    if path.startswith(("http://", "https://")):
        return path
    requested = Path(path)
    candidates = [requested if requested.is_absolute() else BASE_DIR / requested, BASE_DIR / "data" / requested.name, BASE_DIR / "data" / "nsl_kdd_subset.csv"]
    for candidate in candidates:
        if candidate.exists() and candidate.is_file():
            return str(candidate.resolve())
    return str(candidates[-1].resolve())

def load_training_dataset(path: str) -> pd.DataFrame:
    resolved_path = resolve_dataset_path(path)
    if resolved_path.startswith(("http://", "https://")):
        df = pd.read_csv(resolved_path, header=None)
        df.columns = NSL_KDD_COLUMNS
        return df
    if os.path.exists(resolved_path):
        df = pd.read_csv(resolved_path)
        if len(df.columns) == len(NSL_KDD_COLUMNS) and "label" not in df.columns:
            df.columns = NSL_KDD_COLUMNS
        return df
    df = pd.read_csv(NSL_KDD_URL, header=None)
    df.columns = NSL_KDD_COLUMNS
    return df

def _run_training_worker(dataset_path: str, normal_label: str, percentile: float):
    global training_in_progress, training_error
    try:
        df = load_training_dataset(dataset_path)
        model.train(df, normal_label=normal_label, percentile=percentile)
        print(f"Model training completed successfully. Learned {model.training_samples} normal samples.")
        return True
    except Exception as exc:
        training_error = str(exc)
        print(f"Model training failed: {exc}")
        return False
    finally:
        training_in_progress = False

def run_training(dataset_path: str = "data/nsl_kdd_subset.csv", normal_label: str = "normal", percentile: float = 95.0):
    global training_in_progress, training_error
    with training_lock:
        if training_in_progress:
            return False
        training_in_progress = True
        training_error = None
    return _run_training_worker(dataset_path, normal_label, percentile)

def start_background_training():
    global training_in_progress, training_error
    if model.is_trained:
        return False
    with training_lock:
        if training_in_progress:
            return False
        training_in_progress = True
        training_error = None
    thread = threading.Thread(target=_run_training_worker, kwargs={"dataset_path": "data/nsl_kdd_subset.csv", "normal_label": "normal", "percentile": 95.0}, name="autoencoder-initial-training", daemon=True)
    thread.start()
    return True

def record_prediction(result: dict[str, Any], request: PredictRequest):
    now = time.time()
    with metric_lock:
        metrics["total_predictions"] += 1
        metrics["last_prediction_at"] = now
        if result["is_anomaly"]:
            metrics["anomalies_detected"] += 1
            metrics["last_anomaly_at"] = now
        else:
            metrics["normal_predictions"] += 1
    if not result["is_anomaly"]:
        return None
    severity = "Critical" if result["confidence_score"] >= 0.9 else "High" if result["confidence_score"] >= 0.5 else "Medium"
    with alert_lock:
        event = {
            "id": f"ALT-{int(now * 1000)}",
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(now)),
            "sourceIP": request.source_ip or "Unknown",
            "destinationIP": request.destination_ip or "Unknown",
            "protocol": (request.protocol or "Unknown").upper(),
            "reconstructionError": result["reconstruction_error"],
            "threshold": result["threshold"],
            "confidenceScore": result["confidence_score"],
            "severity": severity,
            "status": request.status if request.status in {"New", "Investigating", "Resolved"} else "New",
            "prediction": result["prediction"],
        }
        alerts.appendleft(event)
        return event

@app.on_event("startup")
async def startup_event():
    if model.is_trained:
        print("Loaded saved autoencoder. Model is ready for inference.")
    else:
        print("No saved autoencoder found. Starting automatic NSL-KDD training in the background.")
        start_background_training()

@app.get("/")
def read_root():
    return {"status": "ok", "message": "IDS Autoencoder API is running", "model_trained": model.is_trained, "training_in_progress": training_in_progress}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/api/v1/model/status")
def model_status():
    if model.is_trained:
        status = "Ready for inference"
    elif training_in_progress:
        status = "Training model"
    elif training_error:
        status = "Training failed"
    else:
        status = "Starting"
    return {"is_trained": model.is_trained, "training_in_progress": training_in_progress, "threshold": float(model.threshold) if model.is_trained else None, "features": len(model.feature_columns) if model.is_trained else 0, "feature_names": model.feature_columns if model.is_trained else [], "status": status, "training_samples": getattr(model, "training_samples", None), "training_error": training_error, "model_version": "1.4.0"}

@app.get("/api/v1/alerts")
def get_alerts(limit: int = Query(default=100, ge=1, le=500), q: str = "", severity: str = "All", status: str = "All", protocol: str = "All"):
    query = q.strip().lower()
    with alert_lock:
        items = list(alerts)
    filtered = []
    for item in items:
        searchable = " ".join(str(item.get(key, "")) for key in ["id", "timestamp", "sourceIP", "destinationIP", "protocol", "severity", "status"]).lower()
        if query and query not in searchable: continue
        if severity != "All" and item["severity"] != severity: continue
        if status != "All" and item["status"] != status: continue
        if protocol != "All" and item["protocol"] != protocol: continue
        filtered.append(item)
        if len(filtered) >= limit: break
    return {"alerts": filtered, "total": len(filtered), "available": len(items)}

@app.get("/api/v1/metrics")
def get_metrics():
    with metric_lock:
        snapshot = dict(metrics)
    total = snapshot["total_predictions"]
    anomalies = snapshot["anomalies_detected"]
    snapshot["anomaly_rate"] = round((anomalies / total) * 100, 2) if total else 0.0
    snapshot["uptime_seconds"] = max(0, int(time.time() - snapshot["started_at"]))
    snapshot["model_efficiency"] = round(((total - anomalies) / total) * 100, 2) if total else 0.0
    return snapshot

@app.get("/api/v1/reports/summary")
def report_summary():
    with alert_lock:
        current = list(alerts)
    with metric_lock:
        metric_snapshot = dict(metrics)
    severities = {name: sum(1 for a in current if a["severity"] == name) for name in ["Critical", "High", "Medium", "Low"]}
    protocols = {name: sum(1 for a in current if a["protocol"] == name) for name in ["TCP", "UDP", "ICMP"]}
    errors = [float(a["reconstructionError"]) for a in current]
    return {"generated_at": time.strftime("%Y-%m-%d %H:%M:%S"), "alert_count": len(current), "total_predictions": metric_snapshot["total_predictions"], "anomalies_detected": metric_snapshot["anomalies_detected"], "normal_predictions": metric_snapshot["normal_predictions"], "average_reconstruction_error": sum(errors) / len(errors) if errors else 0, "max_reconstruction_error": max(errors) if errors else 0, "threshold": float(model.threshold) if model.is_trained else None, "severities": severities, "protocols": protocols, "model_version": "1.4.0"}

@app.post("/api/v1/predict")
def predict_single(request: PredictRequest):
    if training_in_progress: raise HTTPException(status_code=503, detail="Model is still training. Please retry shortly.")
    if not model.is_trained: raise HTTPException(status_code=503, detail="Model is not ready. Please retry shortly.")
    try:
        result = model.predict(pd.DataFrame([request.features]))[0]
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Prediction input is invalid: {exc}") from exc
    event = record_prediction(result, request)
    return {**result, "alert": event}

@app.post("/api/v1/predict/csv")
async def predict_csv(file: UploadFile = File(...)):
    if training_in_progress: raise HTTPException(status_code=503, detail="Model is still training. Please retry shortly.")
    if not model.is_trained: raise HTTPException(status_code=503, detail="Model is not ready. Please retry shortly.")
    if not file.filename or not file.filename.lower().endswith(".csv"): raise HTTPException(status_code=400, detail="File must be a CSV.")
    contents = await file.read()
    try: df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
    except UnicodeDecodeError: df = pd.read_csv(io.BytesIO(contents))
    try: results = model.predict(df)
    except Exception as exc: raise HTTPException(status_code=422, detail=f"CSV prediction failed: {exc}") from exc
    recorded_alerts = []
    for index, result in enumerate(results):
        row = df.iloc[index]
        metadata = PredictRequest(features={}, source_ip=str(row.get("sourceIP", row.get("src_ip", "Unknown"))), destination_ip=str(row.get("destinationIP", row.get("dst_ip", "Unknown"))), protocol=str(row.get("protocol", "Unknown")))
        event = record_prediction(result, metadata)
        if event: recorded_alerts.append(event)
    return {"results": results, "alerts_created": recorded_alerts, "summary": {"total": len(results), "anomalies": sum(1 for r in results if r["is_anomaly"]), "normal": sum(1 for r in results if not r["is_anomaly"])} }

@app.post("/api/v1/train")
def train_model(request: TrainRequest):
    if training_in_progress: raise HTTPException(status_code=409, detail="Model training is already in progress.")
    success = run_training(request.dataset_path, request.normal_label, request.percentile)
    if not success or not model.is_trained: raise HTTPException(status_code=500, detail=training_error or "Model training failed.")
    return {"status": "success", "threshold": float(model.threshold), "training_samples": model.training_samples, "features": len(model.feature_columns), "history": getattr(model, "last_history", {})}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
