#!/usr/bin/env python3
"""Train and export a KOI disposition classifier for TensorFlow.js."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

FEATURE_ORDER = [
    "koi_period",
    "koi_depth",
    "koi_duration",
    "koi_prad",
    "koi_teq",
    "koi_steff",
    "koi_srad",
]

CLASS_ORDER = ["CANDIDATE", "CONFIRMED", "FALSE POSITIVE"]


def load_dataframe(csv_path: Path) -> pd.DataFrame:
    df = pd.read_csv(csv_path)
    required = FEATURE_ORDER + ["koi_disposition"]
    missing = [column for column in required if column not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    df = df[df["koi_disposition"].isin(CLASS_ORDER)].copy()
    return df


def preprocess(df: pd.DataFrame):
    features = df[FEATURE_ORDER].copy()

    # Median imputation keeps preprocessing robust for sparse catalog fields.
    medians = features.median(numeric_only=True)
    features = features.fillna(medians)

    means = features.mean().to_numpy(dtype=np.float32)
    stds = features.std(ddof=0).replace(0, 1).to_numpy(dtype=np.float32)

    x = ((features.to_numpy(dtype=np.float32) - means) / stds).astype(np.float32)

    y_encoder = LabelEncoder()
    y_encoder.fit(CLASS_ORDER)
    y = y_encoder.transform(df["koi_disposition"])

    return x, y, means, stds, y_encoder


def build_model(input_dim: int) -> tf.keras.Model:
    model = tf.keras.Sequential(
        [
            tf.keras.layers.Input(shape=(input_dim,)),
            tf.keras.layers.Dense(64, activation="relu"),
            tf.keras.layers.Dropout(0.2),
            tf.keras.layers.Dense(32, activation="relu"),
            tf.keras.layers.Dense(3, activation="softmax"),
        ]
    )
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


def export_metadata(path: Path, means, stds, validation_accuracy):
    metadata = {
        "model_name": "stellar-fingerprints-v1",
        "feature_order": FEATURE_ORDER,
        "class_order": CLASS_ORDER,
        "scaler": {
            "means": [float(v) for v in means],
            "stds": [float(v) for v in stds],
        },
        "metrics": {
            "validation_accuracy": float(validation_accuracy),
            "macro_f1": None,
        },
    }
    path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", type=Path, required=True, help="Path to KOI cumulative CSV")
    parser.add_argument(
        "--export-dir",
        type=Path,
        default=Path("../model"),
        help="Directory for SavedModel and metadata",
    )
    parser.add_argument("--epochs", type=int, default=50)
    args = parser.parse_args()

    df = load_dataframe(args.csv)
    x, y, means, stds, _ = preprocess(df)

    x_train, x_val, y_train, y_val = train_test_split(
        x,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    model = build_model(input_dim=x.shape[1])

    class_counts = np.bincount(y_train)
    class_weights = {
        cls: float(len(y_train) / (len(class_counts) * max(count, 1)))
        for cls, count in enumerate(class_counts)
    }

    model.fit(
        x_train,
        y_train,
        validation_data=(x_val, y_val),
        epochs=args.epochs,
        batch_size=64,
        class_weight=class_weights,
        verbose=2,
    )

    _, val_acc = model.evaluate(x_val, y_val, verbose=0)

    export_dir = args.export_dir.resolve()
    export_dir.mkdir(parents=True, exist_ok=True)

    saved_model_dir = export_dir / "koi_model_saved"
    model.export(saved_model_dir)

    export_metadata(export_dir / "model-metadata.json", means, stds, val_acc)

    print("Training complete.")
    print(f"Validation accuracy: {val_acc:.4f}")
    print(f"SavedModel: {saved_model_dir}")
    print("Convert to TF.js with:")
    print(
        "tensorflowjs_converter --input_format=tf_saved_model "
        f"{saved_model_dir} {export_dir}"
    )


if __name__ == "__main__":
    main()
