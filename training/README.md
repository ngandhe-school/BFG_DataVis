## KOI Model Training (Offline)

This folder contains the offline training script for the Stellar Fingerprints classifier.

### 1. Install dependencies

```bash
pip install pandas scikit-learn tensorflow tensorflowjs
```

### 2. Download KOI CSV

Use NASA Exoplanet Archive:

- https://exoplanetarchive.ipac.caltech.edu/cgi-bin/nstedAPI/nph-nstedAPI?table=cumulative&format=csv

Save as `koi_cumulative.csv`.

### 3. Run training

From `training/`:

```bash
python train_koi_model.py --csv ./koi_cumulative.csv --export-dir ../model --epochs 50
```

This exports:

- `model/koi_model_saved/` (SavedModel)
- `model/model-metadata.json` (feature order, class order, scaler stats)

### 4. Convert for browser inference

```bash
tensorflowjs_converter --input_format=tf_saved_model ../model/koi_model_saved ../model
```

This creates:

- `model/model.json`
- `model/group*-shard*.bin`

### 5. Important contract

Feature order used by both training and browser inference:

1. `koi_period`
2. `koi_depth`
3. `koi_duration`
4. `koi_prad`
5. `koi_teq`
6. `koi_steff`
7. `koi_srad`

Class order:

1. `CANDIDATE`
2. `CONFIRMED`
3. `FALSE POSITIVE`

Do not change order without updating both model metadata and `app.js`.
