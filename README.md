# Deep Learning-Based Network Intrusion Detection Using Autoencoders for Anomaly Detection

## Project Overview
Traditional Intrusion Detection Systems (IDS) rely heavily on signature-based detection, which often fails to identify zero-day or unknown attacks. 

**Solution**: This project implements an **Autoencoder Neural Network** that learns the normal baseline of network traffic. Once trained, the model calculates a *Reconstruction Error* for incoming traffic. 
* Low Reconstruction Error = Normal Traffic
* High Reconstruction Error = Potential Intrusion (Anomaly)

The system automatically calculates a dynamic threshold (e.g. 95th percentile of normal validation error) and classifies traffic in real-time.

---

## Architecture & Workflow

```text
Network Dataset (NSL-KDD)
       ↓
Data Preprocessing (Handling missing values, duplicates)
       ↓
Feature Encoding (LabelEncoding) & Normalization (StandardScaler)
       ↓
Normal Traffic Training Data
       ↓
Autoencoder Training (Dense layers with Bottleneck)
       ↓
Reconstruction Error Calculation
       ↓
Threshold Determination (95th/99th percentile)
       ↓
┌───────────────────────┐
│ Error ≤ Threshold     │ → Normal Traffic
│ Error > Threshold     │ → Intrusion Detected
└───────────────────────┘
       ↓
Performance Evaluation (Accuracy, Precision, Recall, F1)
       ↓
Dashboard Visualization & Alerts (React Frontend)
```

## Setup & Execution

### 1. Backend (Python ML API)
The backend is powered by FastAPI, TensorFlow, Scikit-Learn, and Pandas. It exposes the Autoencoder model to the frontend via REST APIs.

**Requirements**: Python 3.10+, pip

**Installation & Running**:
```bash
cd backend

# Install requirements
pip install -r requirements.txt

# Start the server
uvicorn main:app --host 0.0.0.0 --port 8000
```
The API runs on `http://127.0.0.1:8000` with interactive docs available at `http://127.0.0.1:8000/docs`.

### 2. Frontend (React Dashboard)
The frontend is built with React, Vite, TailwindCSS, and Recharts.

**Installation & Running**:
```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

## API Endpoints (Backend)

* `GET /api/v1/model/status`: Returns whether the model is trained, the current threshold, and the features expected.
* `POST /api/v1/train`: Initiates the model training process on the `data/nsl_kdd_subset.csv` dataset. Returns the threshold and training history.
* `POST /api/v1/predict`: Accepts a JSON object containing network traffic features and returns a prediction (`Intrusion` or `Normal`), reconstruction error, and confidence score.
* `POST /api/v1/predict/csv`: Accepts a CSV file upload, processes it using the trained scaler/encoder, and returns predictions for the entire dataset.

## Training the Model
1. Start both backend and frontend servers.
2. Navigate to the **Model Configuration** tab in the Dashboard menu.
3. Click **Train Model Now**. The model will process the normal traffic from the dataset, determine the threshold, and save the configuration to the disk.
4. Once trained, the dashboard's Real-Time Metrics page will fetch real predictions by sending dummy network configurations or user-uploaded configurations to the model API.

## Project Files Summary
- `/backend/main.py`: FastAPI server handling HTTP requests.
- `/backend/ml_model.py`: Autoencoder implementation (TensorFlow), data scaling, thresholding, model persistence.
- `/backend/requirements.txt`: Python package dependencies.
- `/backend/data/nsl_kdd_subset.csv`: Sample of NSL-KDD dataset used for training/validation.
- `/src/pages/Dashboard.tsx`: Real-time dashboard receiving real prediction metrics.
- `/src/pages/ModelInfo.tsx`: UI panel for configuring and initiating Autoencoder training.
- `/src/api.ts`: API integration layer connecting React to the Python backend.
- `vite.config.ts`: Configured proxy directing `/api` calls to the local FastAPI backend on port 8000.
