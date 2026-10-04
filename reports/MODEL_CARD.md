# StudyPilot - Model Card (auto-generated)

## Data
- Kaggle "Student Performance Factors": 6607 rows after cleaning. The dataset is SYNTHETIC,
  so results show the pipeline works but are not evidence about real students.
- Split: 5285 train / 1322 test (stratified by risk level). Cross-validation
  (5-fold) on the training set only; the test set is used once for reporting.
- Inputs used (13): Hours_Studied, Attendance, Parental_Involvement, Access_to_Resources, Extracurricular_Activities, Sleep_Hours, Previous_Scores, Motivation_Level, Internet_Access, Tutoring_Sessions, Teacher_Quality, Peer_Influence, Physical_Activity
- Deliberately NOT used (sensitive or not actionable): Gender, Family_Income, Parental_Education_Level, Learning_Disabilities, School_Type, Distance_from_Home

## Models
- Score regression: Linear Regression (chosen by cross-validated RMSE; baseline = predict the mean)
- Risk classification: Logistic Regression (chosen by cross-validated macro-F1)
- Personas: K-Means, k = 4, on study-habit features only; each persona is named after the habit that
  most distinguishes it from the average student (Consistent Attender, Tutoring-Supported, Low Motivation, Irregular Attender)

## Test results
- Regression, all test rows: MAE 0.86, RMSE 2.53, R2 0.626
- Regression, typical rows (normal scores): RMSE 0.81, R2 0.941
- Score range shown to users: +/- 1.27 marks; test coverage 86.5% (all rows), 87.3% (typical rows)
- Classification: accuracy 0.876, macro-F1 0.875, ROC-AUC 0.975, High-risk recall 0.904
- Clustering: silhouette 0.13

## Feature ablation (what removing the sensitive inputs costs; typical test rows)
```
                       Feature set  Typ_RMSE  Typ_R2  RMSE_change_vs_compact_%
                   All 23 features     0.345   0.989                   -57.670
        Compact 17 features (used)     0.814   0.941                     0.000
                  Compact + Gender     0.814   0.941                    -0.001
           Compact + Family_Income     0.710   0.955                   -12.740
Compact + Parental_Education_Level     0.704   0.956                   -13.560
   Compact + Learning_Disabilities     0.747   0.950                    -8.263
             Compact + School_Type     0.814   0.941                     0.015
      Compact + Distance_from_Home     0.735   0.952                    -9.659
```

## Known limitations
- Synthetic, almost linear data: simple linear models match or beat tree models.
- A few extreme scores (11 flagged in the test set) cannot be explained by
  the inputs; they dominate RMSE while typical errors stay small.
- Risk labels come from fixed score thresholds, so errors cluster next to the thresholds.
- Personas are soft habit segments (weak, nearly flat silhouette across k), not distinct natural groups.
- Removing sensitive inputs lowers accuracy somewhat (see ablation); this is a deliberate fairness/simplicity choice.
- Predictions are estimates for planning, not guarantees about a student's result.
