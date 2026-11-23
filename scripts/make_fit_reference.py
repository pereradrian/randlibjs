"""
Generates test/fixtures/fit.json: datasets drawn with numpy and the maximum likelihood fits
of scipy.stats for each family, used by test/fit.test.js.

Families without a location parameter in randlibjs are fitted with floc=0 (and fscale=1 for
beta and chi-square), which is the same model.

Usage:  python scripts/make_fit_reference.py
"""
import json
import math
import os
import warnings

import numpy as np
from scipy import stats

warnings.simplefilter("ignore")
N = 300


def case(name, data, params, exact):
    data = [float(f"{x:.15g}") for x in data]
    return {"family": name, "data": data, "params": [float(p) for p in params], "exact": exact}


def main():
    rng = np.random.default_rng(20261123)
    cases = []
    x = rng.normal(3, 2, N); cases.append(case("normal", x, stats.norm.fit(x), True))
    x = rng.uniform(-1, 4, N); lo, sc = stats.uniform.fit(x); cases.append(case("uniform", x, [lo, lo + sc], True))
    x = rng.exponential(0.5, N); _, sc = stats.expon.fit(x, floc=0); cases.append(case("exponential", x, [1 / sc], True))
    x = rng.lognormal(0.5, 0.8, N); s, _, sc = stats.lognorm.fit(x, floc=0); cases.append(case("lognormal", x, [math.log(sc), s], True))
    for shape in (0.4, 2.5, 30):
        x = rng.gamma(shape, 1.5, N); a, _, sc = stats.gamma.fit(x, floc=0); cases.append(case("gamma", x, [a, sc], True))
    x = rng.chisquare(4, N); df, _, _ = stats.chi2.fit(x, floc=0, fscale=1); cases.append(case("chisquare", x, [df], True))
    for a0, b0 in ((2, 5), (0.5, 0.5), (8, 1.5)):
        x = rng.beta(a0, b0, N); a, b, _, _ = stats.beta.fit(x, floc=0, fscale=1); cases.append(case("beta", x, [a, b], True))
    for c0 in (0.7, 1.5, 4):
        x = 2 * rng.weibull(c0, N); c, _, sc = stats.weibull_min.fit(x, floc=0); cases.append(case("weibull", x, [c, sc], True))
    x = rng.rayleigh(2, N); _, sc = stats.rayleigh.fit(x, floc=0); cases.append(case("rayleigh", x, [sc], True))
    x = (rng.pareto(3, N) + 1) * 2; b, _, sc = stats.pareto.fit(x, floc=0); cases.append(case("pareto", x, [b, sc], True))
    x = rng.laplace(1, 2, N); cases.append(case("laplace", x, stats.laplace.fit(x), True))
    # numerical fits in scipy too: compare the log-likelihood and the parameters loosely
    x = rng.logistic(1, 2, N); cases.append(case("logistic", x, stats.logistic.fit(x), False))
    x = rng.gumbel(1, 2, N); cases.append(case("gumbel", x, stats.gumbel_r.fit(x), False))
    x = 1 + 2 * rng.standard_cauchy(N); cases.append(case("cauchy", x, stats.cauchy.fit(x), False))
    x = 1 + 2 * rng.standard_t(4, N); cases.append(case("studentT", x, stats.t.fit(x), False))

    out = os.path.join(os.path.dirname(__file__), "..", "test", "fixtures", "fit.json")
    with open(out, "w") as fh:
        json.dump({"scipy": __import__("scipy").__version__, "cases": cases}, fh, allow_nan=False)
    print(f"wrote {len(cases)} cases to {out}")


if __name__ == "__main__":
    main()
