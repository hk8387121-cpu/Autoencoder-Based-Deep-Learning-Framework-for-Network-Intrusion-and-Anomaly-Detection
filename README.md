# Deep Learning-Based Network Intrusion Detection Using Autoencoders for Anomaly Detection

## Project Overview
Traditional Intrusion Detection Systems (IDS) rely heavily on signatures. This project demonstrates an **Autoencoder-based anomaly detector** that learns the reconstruction pattern of normal NSL-KDD traffic.

**Detection principle**:
- Low Reconstruction Error → traffic is treated as normal
- Reconstruction Error above the learned threshold → traffic is flagged as a potential intrusion

The threshold is calculated from the reconstruction-error distribution of the normal training data (configurable percentile; the default is the 95th percentile). This is an anomaly-detection threshold, **not an accuracy score**.

## Architecture & Workflow

```text
NSL-KDD Dataset
       ↓
Select Normal Traffic for Training
       ↓
Categorical Encoding + StandardScaler
       ↓
Dense Autoencoder
       ↓
Reconstruct Normal Feature Vectors
       ↓
Mean Squared Reconstruction Error
       ↓
95th Percentile Threshold
       ↓
┌───────────────────────┐
│ Error ≤ Threshold     │ → Normal
│ Error > Threshold     │ → Potential Intrusion
└───────────────────────┘
       ↓
FastAPI Inference API
       ↓
React Dashboard / Alerts / Security Report
```

## Autoencoder Architecture

The implementation uses a fully connected autoencoder with a compressed bottleneck:

```text
Input features
    ↓
Dense (75% of input width)
    ↓
Dense (50% of input width)
    ↓
Bottleneck (25% of input width)
    ↓
Dense (50% of input width)
    ↓
Dense (75% of input width)
    ↓
Output (original input width)
```

Training uses **Adam** optimization and **Mean Squared Error (MSE)** reconstruction loss. Categorical NSL-KDD columns are label encoded and numerical inputs are standardized before training.

## Important Demo / Deployment Note

The public GitHub Pages dashboard runs in **demonstration inference mode**. It generates schema-valid feature vectors in the browser and sends them through the **real TensorFlow Autoencoder running in the FastAPI backend**. Therefore the displayed predictions, reconstruction errors, thresholds, anomaly counts, alerts and reports come from actual model inference.

This public demo is **not a live packet sniffer** and does not claim to capture packets from the reviewer's computer. For actual network traffic, the backend exposes a CSV inference endpoint that accepts traffic records matching the trained feature schema.

## Backend

The backend is powered by FastAPI, TensorFlow, Scikit-Learn and Pandas.

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

The API provides:
- `GET /health` — backend health
- `GET /api/v1/model/status` — model readiness, threshold and feature schema
- `GET /api/v1/metrics` — current inference counters and anomaly rate
- `GET /api/v1/alerts` — backend-generated anomaly events
- `GET /api/v1/reports/summary` — current report statistics
- `POST /api/v1/train` — train/retrain the autoencoder
- `POST /api/v1/predict` — single feature-vector inference
- `POST /api/v1/predict/csv` — batch CSV inference

## Dataset

The project uses an NSL-KDD-derived CSV for training. The backend also contains a remote fallback for the NSL-KDD 20% training file if the local dataset is unavailable during deployment.

The training routine selects rows whose `label` is `normal`; attack labels are not used to fit the autoencoder. The model therefore learns a normal-traffic reconstruction baseline rather than learning a supervised attack classifier.

## Frontend

The frontend is built with React, Vite, TailwindCSS and Recharts and is deployed through GitHub Pages.

Main screens:
- **Dashboard** — live backend inference counters and reconstruction-error visualization
- **Alerts Log** — anomaly events recorded by the backend
- **Security Report** — current backend statistics and PDF export
- **Model Configuration** — model status, threshold, feature count and retraining control
- **Settings** — model controls and browser-local preferences

## Reviewer Verification

A reviewer can verify the implementation without trusting hard-coded dashboard numbers:

1. Open **Model Configuration** and inspect the live model status, feature count and threshold returned by the backend.
2. Open **Dashboard** and observe the inference counters increasing as real `/predict` requests are made.
3. Open **Alerts Log** and verify that anomaly rows originate from the backend API.
4. Compare the threshold and anomaly counts with **Security Report**; both pages use the same backend state.
5. Download the PDF and verify that its values match the current report data.
6. Use the backend's interactive `/docs` page to inspect the REST API directly.

## Project Files

- `/backend/main.py` — FastAPI API, training lifecycle, prediction recording and report endpoints
- `/backend/ml_model.py` — autoencoder, preprocessing, threshold calculation and model persistence
- `/backend/data/nsl_kdd_subset.csv` — local NSL-KDD-derived training data
- `/src/pages/Dashboard.tsx` — inference dashboard
- `/src/pages/Alerts.tsx` — backend alert log
- `/src/pages/Reports.tsx` — backend report and PDF export
- `/src/pages/ModelInfo.tsx` — model configuration and retraining
- `/src/api.ts` — frontend/backend API integration
