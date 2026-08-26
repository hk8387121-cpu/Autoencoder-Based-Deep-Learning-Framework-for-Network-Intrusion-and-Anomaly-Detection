import os
import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow.keras import layers, models
from sklearn.preprocessing import StandardScaler, LabelEncoder
import pickle

class IDSAutoencoder:
    def __init__(self, model_dir="models"):
        self.model_dir = model_dir
        self.model = None
        self.scaler = None
        self.label_encoders = {}
        self.threshold = 0.0
        self.feature_columns = []
        self.is_trained = False
        
        if not os.path.exists(self.model_dir):
            os.makedirs(self.model_dir)
            
        self._load_if_exists()

    def _build_model(self, input_dim):
        model = models.Sequential([
            layers.InputLayer(input_shape=(input_dim,)),
            layers.Dense(int(input_dim * 0.75), activation="relu"),
            layers.Dense(int(input_dim * 0.5), activation="relu"),
            layers.Dense(int(input_dim * 0.25), activation="relu", name="bottleneck"),
            layers.Dense(int(input_dim * 0.5), activation="relu"),
            layers.Dense(int(input_dim * 0.75), activation="relu"),
            layers.Dense(input_dim, activation="linear") # Output should match input format for reconstruction
        ])
        model.compile(optimizer="adam", loss="mse")
        return model

    def preprocess_fit(self, df):
        # 1. Handle missing values
        df = df.dropna()
        
        # 2. Extract features
        if 'label' in df.columns:
            features = df.drop(columns=['label'])
        else:
            features = df.copy()
            
        self.feature_columns = list(features.columns)
        
        # 3. Encode categorical features
        categorical_cols = features.select_dtypes(include=['object']).columns
        for col in categorical_cols:
            le = LabelEncoder()
            features[col] = le.fit_transform(features[col].astype(str))
            self.label_encoders[col] = le
            
        # 4. Scale numerical features
        self.scaler = StandardScaler()
        scaled_features = self.scaler.fit_transform(features)
        
        return scaled_features

    def preprocess_transform(self, df):
        if not self.feature_columns:
            raise ValueError("Model not trained. Features unknown.")
            
        # Keep only known columns and add missing ones with 0
        features = pd.DataFrame()
        for col in self.feature_columns:
            if col in df.columns:
                features[col] = df[col]
            else:
                features[col] = 0
                
        # Fill missing values
        features = features.fillna(0)
                
        # Encode categorical
        for col, le in self.label_encoders.items():
            if col in features.columns:
                # Handle unknown labels by defaulting to a string representation that will get encoded
                features[col] = features[col].astype(str)
                # This is a basic way to handle unknown categorical in transform
                features[col] = features[col].map(lambda s: s if s in le.classes_ else '<unknown>')
                if '<unknown>' not in le.classes_:
                    le_classes = list(le.classes_)
                    le_classes.append('<unknown>')
                    le.classes_ = np.array(le_classes)
                features[col] = le.transform(features[col])
                
        # Scale
        scaled_features = self.scaler.transform(features)
        return scaled_features

    def train(self, df, normal_label="normal", percentile=95):
        if 'label' not in df.columns:
            raise ValueError("Dataset must contain a 'label' column for training.")
            
        # Filter for normal traffic
        normal_df = df[df['label'] == normal_label]
        if len(normal_df) == 0:
            raise ValueError(f"No normal traffic found with label '{normal_label}'")
            
        X_train = self.preprocess_fit(normal_df)
        
        # Build and train
        self.model = self._build_model(X_train.shape[1])
        history = self.model.fit(
            X_train, X_train,
            epochs=10,
            batch_size=32,
            validation_split=0.1,
            verbose=1
        )
        
        # Calculate threshold
        X_train_pred = self.model.predict(X_train)
        mse = np.mean(np.power(X_train - X_train_pred, 2), axis=1)
        self.threshold = np.percentile(mse, percentile)
        
        self.training_samples = len(normal_df)
        self.is_trained = True
        self._save()
        
        return history.history

    def predict(self, df):
        if not self.is_trained:
            raise ValueError("Model not trained yet.")
            
        X = self.preprocess_transform(df)
        X_pred = self.model.predict(X)
        mse = np.mean(np.power(X - X_pred, 2), axis=1)
        
        is_anomaly = mse > self.threshold
        
        # Calculate a mock confidence score based on distance from threshold
        confidence = np.clip(np.abs(mse - self.threshold) / self.threshold, 0, 1)
        
        results = []
        for i in range(len(df)):
            results.append({
                "is_anomaly": bool(is_anomaly[i]),
                "prediction": "Intrusion" if is_anomaly[i] else "Normal",
                "reconstruction_error": float(mse[i]),
                "threshold": float(self.threshold),
                "confidence_score": float(confidence[i])
            })
            
        return results

    def _save(self):
        if self.model:
            self.model.save(os.path.join(self.model_dir, "autoencoder.h5"))
        
        config = {
            "scaler": self.scaler,
            "label_encoders": self.label_encoders,
            "threshold": self.threshold,
            "feature_columns": self.feature_columns,
            "training_samples": getattr(self, "training_samples", None)
        }
        with open(os.path.join(self.model_dir, "config.pkl"), "wb") as f:
            pickle.dump(config, f)

    def _load_if_exists(self):
        model_path = os.path.join(self.model_dir, "autoencoder.h5")
        config_path = os.path.join(self.model_dir, "config.pkl")
        
        if os.path.exists(model_path) and os.path.exists(config_path):
            self.model = tf.keras.models.load_model(model_path)
            with open(config_path, "rb") as f:
                config = pickle.load(f)
                self.scaler = config["scaler"]
                self.label_encoders = config["label_encoders"]
                self.threshold = config["threshold"]
                self.feature_columns = config["feature_columns"]
                self.training_samples = config.get("training_samples", None)
            self.is_trained = True
