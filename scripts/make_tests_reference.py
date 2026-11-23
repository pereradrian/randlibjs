"""
Generates test/fixtures/stat-tests.json: scipy.stats results for kstest, ks_2samp,
chisquare, anderson, describe and gaussian_kde, used by test/stat-tests.test.js.

Usage:  python scripts/make_tests_reference.py
"""
import json
import os

import numpy as np
from scipy import stats


def r(x):
    return [float(v) for v in x]


def main():
    rng = np.random.default_rng(31)
    out = {"kstest": [], "ks2samp": [], "chisquare": [], "anderson": [], "describe": [], "kde": []}
    for n, shift in ((8, 0.0), (40, 0.3), (300, 0.1), (3000, 0.05), (12000, 0.02)):
        x = np.round(rng.normal(shift, 1, n), 6)
        case = {"data": r(x), "results": {}}
        for alt in ("two-sided", "greater", "less"):
            res = stats.kstest(x, "norm", alternative=alt, method="exact" if n <= 10000 else "auto")
            case["results"][alt] = [float(res.statistic), float(res.pvalue)]
        out["kstest"].append(case)
    for n, m, shift in ((7, 9, 0.5), (30, 45, 0.4), (200, 150, 0.2), (800, 1000, 0.1)):
        x = np.round(rng.normal(0, 1, n), 6)
        y = np.round(rng.normal(shift, 1, m), 6)
        res = stats.ks_2samp(x, y, method="exact")
        out["ks2samp"].append({"x": r(x), "y": r(y), "statistic": float(res.statistic), "pvalue": float(res.pvalue)})
    for obs, exp, ddof in (([16, 18, 16, 14, 12, 12], None, 0), ([30, 14, 34, 45, 57, 20], [20, 20, 30, 40, 60, 30], 0),
                           ([43, 52, 54, 40], [40, 50, 55, 44], 1)):
        res = stats.chisquare(obs, exp, ddof=ddof)
        out["chisquare"].append({"observed": obs, "expected": exp, "ddof": ddof, "statistic": float(res.statistic), "pvalue": float(res.pvalue)})
    for n in (10, 50, 400):
        x = np.round(rng.standard_t(5, n), 6)
        res = stats.anderson(x, "norm")  # statistic and critical values (no p-value in scipy)
        out["anderson"].append({"data": r(x), "statistic": float(res.statistic), "critical": r(res.critical_values)})
    for n in (5, 60, 1000):
        x = np.round(rng.gamma(2, 1.5, n), 6)
        d = stats.describe(x)
        du = stats.describe(x, bias=False)
        out["describe"].append({"data": r(x), "nobs": int(d.nobs), "min": float(d.minmax[0]), "max": float(d.minmax[1]),
                                "mean": float(d.mean), "variance": float(d.variance), "skewness": float(d.skewness),
                                "kurtosis": float(d.kurtosis), "skewnessUnbiased": float(du.skewness), "kurtosisUnbiased": float(du.kurtosis)})
    x = np.round(np.concatenate([rng.normal(-2, 0.7, 120), rng.normal(2, 1.2, 80)]), 6)
    pts = np.linspace(-5, 6, 23)
    out["kdeData"] = r(x)
    for bw in ("scott", "silverman", 0.3):
        k = stats.gaussian_kde(x, bw_method=bw)
        out["kde"].append({"bandwidth": bw, "factor": float(k.factor), "x": r(pts), "pdf": r(k(pts)),
                           "cdf": [float(k.integrate_box_1d(-np.inf, p)) for p in pts]})
    path = os.path.join(os.path.dirname(__file__), "..", "test", "fixtures", "stat-tests.json")
    with open(path, "w") as fh:
        json.dump(out, fh, allow_nan=False)
    print("wrote", os.path.normpath(path))


if __name__ == "__main__":
    main()
