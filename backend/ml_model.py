import os
import pickle
from pathlib import Path

import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow.keras import layers, models
from sklearn.preprocessing import StandardScaler, LabelEncoder


BASE_DIR = Path(__file__).resolve().parent


class IDSAutoencoder:
    def __init__(self, model_dir=None):
        self.model_dir = Path(model_dir) if model_dir else BASE_DIR / "models"
        if not self.model_dir.is_absolute():
            self.model_dir = (BASE_DIR / self.model_dir).resolve()

        self.model = None
        self.scaler = None
        self.label_encoders = {}
        self.threshold = 0.0
        self.feature_columns = []
        self.training_samples = None
        self.last_history = {}
        self.is_trained = False

        self.model_dir.mkdir(parents=True, exist_ok=True)
        self._load_if_exists()

    def _build_model(self, input_dim):
        model = models.Sequential([
            layers.Input(shape=(input_dim,)),
            layers.Dense(max(1, int(input_dim * 0.75)), activation="relu"),
            layers.Dense(max(1, int(input_dim * 0.5)), activation="relu"),
            layers.Dense(max(1, int(input_dim * 0.25)), activation="relu", name="bottleneck"),
            layers.Dense(max(1, int(input_dim * 0.5)), activation="relu"),
            layers.Dense(max(1, int(input_dim * 0.75)), activation="relu"),
            layers.Dense(input_dim, activation="linear"),
        ])
        model.compile(optimizer="adam", loss="mse")
        return model

    def preprocess_fit(self, df):
        df = df.dropna().copy()
        features = df.drop(columns=["label"], errors="ignore")
        self.feature_columns = list(features.columns)

        categorical_cols = features.select_dtypes(include=["object"]).columns
        self.label_encoders = {}

        for col in categorical_cols:
            le = LabelEncoder()
            features[col] = le.fit_transform(features[col].astype(str))
            le.classes_ = np.unique(np.append(le.classes_, "<unknown>"))
            self.label_encoders[col] = le

        self.scaler = StandardScaler()
        return self.scaler.fit_transform(features)

    def preprocess_transform(self, df):
        if not self.feature_columns or self.scaler is None:
            raise ValueError("Model not trained. Features unknown.")

        features = pd.DataFrame(index=df.index)
        for col in self.feature_columns:
            features[col] = df[col] if col in df.columns else 0
        features = features.fillna(0)

        for col, le in self.label_encoders.items():
            if col not in features.columns:
                continue

            values = features[col].astype(str)
            known = set(le.classes_)
            values = values.map(lambda value: value if value in known else "<unknown>")
            features[col] = le.transform(values)

        return self.scaler.transform(features)

    def train(self, df, normal_label="normal", percentile=95):
        if "label" not in df.columns:
            raise ValueError("Dataset must contain a 'label' column for training.")

        normal_df = df[
            df["label"].astype(str).str.strip().str.lower()
            == str(normal_label).strip().lower()
        ].copy()

        if normal_df.empty:
            raise ValueError(f"No normal traffic found with label '{normal_label}'")

        X_train = self.preprocess_fit(normal_df)
        self.model = self._build_model(X_train.shape[1])

        history = self.model.fit(
            X_train,
            X_train,
            epochs=10,
            batch_size=32,
            validation_split=0.1,
            verbose=1,
        )

        X_train_pred = self.model.predict(X_train, verbose=0)
        mse = np.mean(np.power(X_train - X_train_pred, 2), axis=1)
        self.threshold = float(np.percentile(mse, percentile))
        self.training_samples = int(len(normal_df))
        self.last_history = history.history
        self.is_trained = True
        self._save()
        return self.last_history

    def predict(self, df):
        if not self.is_trained or self.model is None:
            raise ValueError("Model not trained yet.")

        X = self.preprocess_transform(df)
        X_pred = self.model.predict(X, verbose=0)
        mse = np.mean(np.power(X - X_pred, 2), axis=1)
        is_anomaly = mse > self.threshold
        denominator = max(self.threshold, 1e-12)
        confidence = np.clip(np.abs(mse - self.threshold) / denominator, 0, 1)

        return [
            {
                "is_anomaly": bool(is_anomaly[i]),
                "prediction": "Intrusion" if is_anomaly[i] else "Normal",
                "reconstruction_error": float(mse[i]),
                "threshold": float(self.threshold),
                "confidence_score": float(confidence[i]),
            }
            for i in range(len(df))
        ]

    def _save(self):
        if self.model is None:
            return

        model_path = self.model_dir / "autoencoder.h5"
        config_path = self.model_dir / "config.pkl"
        model_tmp = self.model_dir / "autoencoder_tmp.h5"
        config_tmp = self.model_dir / "config.pkl.tmp"

        try:
            self.model.save(str(model_tmp))
            config = {
                "scaler": self.scaler,
                "label_encoders": self.label_encoders,
                "threshold": self.threshold,
                "feature_columns": self.feature_columns,
                "training_samples": self.training_samples,
                "model_version": "1.3.0",
            }

            with open(config_tmp, "wb") as f:
                pickle.dump(config, f)

            os.replace(model_tmp, model_path)
            os.replace(config_tmp, config_path)
        finally:
            for tmp_path in (model_tmp, config_tmp):
                try:
                    if tmp_path.exists():
                        tmp_path.unlink()
                except OSError:
                    pass

    def _load_if_exists(self):
        model_path = self.model_dir / "autoencoder.h5"
        config_path = self.model_dir / "config.pkl"

        if not (model_path.exists() and config_path.exists()):
            return

        try:
            self.model = tf.keras.models.load_model(str(model_path))
            with open(config_path, "rb") as f:
                config = pickle.load(f)

            self.scaler = config["scaler"]
            self.label_encoders = config["label_encoders"]
            self.threshold = float(config["threshold"])
            self.feature_columns = config["feature_columns"]
            self.training_samples = config.get("training_samples")
            self.is_trained = True
            print(f"Loaded trained autoencoder ({self.training_samples} normal samples).")
        except Exception as exc:
            self.model = None
            self.scaler = None
            self.label_encoders = {}
            self.feature_columns = []
            self.training_samples = None
            self.is_trained = False
            print(
                "Saved model could not be loaded; automatic retraining will be used: "
                f"{exc}"
            )
