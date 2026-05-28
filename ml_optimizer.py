import os
import json
import subprocess
import numpy as np
import pandas as pd
from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import Matern, WhiteKernel
from sklearn.preprocessing import StandardScaler

def generate_synthetic_data(num_samples=500):
    """Generates random alloy compositions and runs them through the Node.js physical engine to create ground truth."""
    seeds = []
    np.random.seed(42)
    for i in range(num_samples):
        # Generate random base composition
        elements = np.random.rand(5) # Fe, Mn, Cr, Ni, Co
        elements = elements / np.sum(elements) * 100.0
        
        # Add random small amount of C, N
        c = np.random.rand() * 4.0
        n = np.random.rand() * 4.0
        
        # Re-normalize
        total_major = 100.0 - c - n
        fe, mn, cr, ni, co = elements * (total_major / 100.0)
        
        cooling = np.random.uniform(0.1, 100.0)
        
        seeds.append({
            "name": f"ML_Seed_{i}",
            "composition_at_pct": {
                "Fe": float(fe), "Mn": float(mn), "Cr": float(cr), 
                "Ni": float(ni), "Co": float(co), "C": float(c), "N": float(n)
            },
            "process_parameters": {
                "cooling_rate_K_s": float(cooling)
            }
        })
    
    os.makedirs("scratch", exist_ok=True)
    input_path = "scratch/ml_train_seeds.json"
    output_path = "scratch/ml_train_output.json"
    
    with open(input_path, "w") as f:
        json.dump(seeds, f)
        
    subprocess.run(["node", "agy.js", "/batch-screen", f"--input={input_path}", f"--output={output_path}"], capture_output=True, text=True)
    
    if not os.path.exists(output_path):
        return pd.DataFrame()
        
    with open(output_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    records = []
    for group in ["lower_risk_screening_rank", "moderate_risk_candidates", "triage_out_candidates"]:
        for item in data.get(group, []):
            comp = item["composition"]
            res = item["screening_results"]
            records.append({
                "Fe": comp.get("Fe", 0), "Mn": comp.get("Mn", 0), "Cr": comp.get("Cr", 0),
                "Ni": comp.get("Ni", 0), "Co": comp.get("Co", 0), "C": comp.get("C", 0), "N": comp.get("N", 0),
                "cooling": item["process"].get("cooling_rate_K_s", 10),
                "Hardness_HV": res.get("surrogate_hardness_HV", 0),
                "Risk_kJ_mol": res.get("interstitial_precipitation_risk_kJ_mol", 0)
            })
            
    df = pd.DataFrame(records)
    # Remove failed calculations where HV or Risk is unexpectedly missing
    df = df.dropna()
    return df

class SurrogateOptimizer:
    def __init__(self):
        self.scaler_X = StandardScaler()
        # Matern kernel is excellent for physical processes + WhiteKernel for noise
        kernel_h = 1.0 * Matern(length_scale=1.0, nu=1.5) + WhiteKernel(noise_level=1)
        kernel_r = 1.0 * Matern(length_scale=1.0, nu=1.5) + WhiteKernel(noise_level=1)
        self.gpr_hardness = GaussianProcessRegressor(kernel=kernel_h, n_restarts_optimizer=3, random_state=42)
        self.gpr_risk = GaussianProcessRegressor(kernel=kernel_r, n_restarts_optimizer=3, random_state=42)
        self.is_trained = False
        
    def train(self, df):
        if df.empty:
            return False
            
        X = df[['Fe', 'Mn', 'Cr', 'Ni', 'Co', 'C', 'N', 'cooling']].values
        y_hardness = df['Hardness_HV'].values
        y_risk = df['Risk_kJ_mol'].values
        
        X_scaled = self.scaler_X.fit_transform(X)
        
        # Train
        self.gpr_hardness.fit(X_scaled, y_hardness)
        self.gpr_risk.fit(X_scaled, y_risk)
        self.is_trained = True
        return True
        
    def generate_random_candidates(self, num=2000):
        X_random = np.random.rand(num, 8)
        # Normalize Fe to Co to sum to 100 minus C/N
        C = X_random[:, 5] * 5.0 # 0-5 at%
        N = X_random[:, 6] * 5.0 # 0-5 at%
        rem = 100.0 - C - N
        sums = np.sum(X_random[:, 0:5], axis=1)
        for i in range(5):
            X_random[:, i] = (X_random[:, i] / sums) * rem
            
        X_random[:, 7] = X_random[:, 7] * 99.9 + 0.1 # Cooling 0.1 - 100
        return X_random
        
    def predict_with_uq(self, X):
        X_scaled = self.scaler_X.transform(X)
        h_mean, h_std = self.gpr_hardness.predict(X_scaled, return_std=True)
        r_mean, r_std = self.gpr_risk.predict(X_scaled, return_std=True)
        return h_mean, h_std, r_mean, r_std

    def find_pareto_front(self, num_candidates=2000):
        if not self.is_trained:
            return pd.DataFrame()
            
        X_cand = self.generate_random_candidates(num_candidates)
        h_mean, h_std, r_mean, r_std = self.predict_with_uq(X_cand)
        
        df = pd.DataFrame(X_cand, columns=['Fe', 'Mn', 'Cr', 'Ni', 'Co', 'C', 'N', 'cooling'])
        df['Hardness_Mean'] = h_mean
        df['Hardness_Std'] = h_std
        df['Risk_Mean'] = r_mean
        df['Risk_Std'] = r_std
        
        # Simple Pareto Filter: Maximize Hardness, Minimize Risk
        # A point dominates B if it has >= Hardness and <= Risk, and at least one is strictly better.
        # This is O(N^2) naive, so keep N small or use vectorized approach
        is_pareto = np.ones(num_candidates, dtype=bool)
        for i in range(num_candidates):
            if not is_pareto[i]:
                continue
            # Compare i against all others
            # i dominates j if h[i] >= h[j] and r[i] <= r[j]
            # j dominates i if h[j] >= h[i] and r[j] <= r[i]
            # strictly better in one
            better_h = h_mean >= h_mean[i]
            better_r = r_mean <= r_mean[i]
            strict_h = h_mean > h_mean[i]
            strict_r = r_mean < r_mean[i]
            
            # j dominates i
            j_dominates_i = better_h & better_r & (strict_h | strict_r)
            if np.any(j_dominates_i):
                is_pareto[i] = False
                continue
                
        df['Is_Pareto'] = is_pareto
        return df
