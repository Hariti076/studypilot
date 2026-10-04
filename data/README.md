# Data

The modelling table is the Kaggle dataset [Student Performance Factors](https://www.kaggle.com/datasets/lainguyn123/student-performance-factors) by lainguyn123. The file has 6,607 rows and 20 columns. It is synthetic.

Download `StudentPerformanceFactors.csv` and save it as:

```text
data/StudentPerformanceFactors.csv
```

CSV files in this folder are gitignored. Do not commit the download.

`src/train.py` and `src/evaluate.py` both read that path. The shipped models in `models/` were fit on this table after the six sensitive columns were left out of the feature list. See [feature_ablation.csv](../reports/feature_ablation.csv).
