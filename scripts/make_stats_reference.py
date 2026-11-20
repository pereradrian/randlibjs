"""
Generates test/fixtures/stats.json: scipy.stats values (pdf/pmf, cdf, sf, ppf, isf,
mean, variance) used by test/stats.test.js to validate the randlibjs `stats` objects.

Usage:  python scripts/make_stats_reference.py
"""
import json
import math
import os

import numpy as np
from scipy import stats

Q = [1e-12, 1e-6, 0.001, 0.025, 0.1, 0.3, 0.5, 0.7, 0.9, 0.975, 0.999, 1 - 1e-9]

CONTINUOUS = [
    ("normal", [1, 2], stats.norm(1, 2)),
    ("uniform", [-1, 3], stats.uniform(-1, 4)),
    ("exponential", [2], stats.expon(scale=0.5)),
    ("gamma", [2.5, 2], stats.gamma(2.5, scale=2)),
    ("gamma", [0.3, 1], stats.gamma(0.3)),
    ("gamma", [80, 0.5], stats.gamma(80, scale=0.5)),
    ("chisquare", [3], stats.chi2(3)),
    ("beta", [2, 5], stats.beta(2, 5)),
    ("beta", [0.5, 0.5], stats.beta(0.5, 0.5)),
    ("beta", [0.2, 3], stats.beta(0.2, 3)),
    ("studentT", [3], stats.t(3)),
    ("studentT", [0.8, 1, 2], stats.t(0.8, loc=1, scale=2)),
    ("studentT", [30], stats.t(30)),
    ("f", [5, 10], stats.f(5, 10)),
    ("f", [2, 1.5], stats.f(2, 1.5)),
    ("lognormal", [0.5, 0.8], stats.lognorm(0.8, scale=math.exp(0.5))),
    ("cauchy", [1, 2], stats.cauchy(1, 2)),
    ("laplace", [1, 2], stats.laplace(1, 2)),
    ("logistic", [1, 2], stats.logistic(1, 2)),
    ("gumbel", [1, 2], stats.gumbel_r(1, 2)),
    ("weibull", [1.5, 2], stats.weibull_min(1.5, scale=2)),
    ("pareto", [3, 2], stats.pareto(3, scale=2)),
    ("triangular", [1, 5, 2], stats.triang(0.25, loc=1, scale=4)),
    ("rayleigh", [2], stats.rayleigh(scale=2)),
    ("truncatedNormal", [1, 2, -1, 4], stats.truncnorm(-1, 1.5, loc=1, scale=2)),
    ("truncatedNormal", [0, 1, 5, 7], stats.truncnorm(5, 7)),
]

DISCRETE = [
    ("binomial", [40, 0.3], stats.binom(40, 0.3)),
    ("binomial", [1000, 0.01], stats.binom(1000, 0.01)),
    ("poisson", [3.5], stats.poisson(3.5)),
    ("poisson", [250], stats.poisson(250)),
    ("geometric", [0.2], stats.geom(0.2)),
    ("negativeBinomial", [3, 0.4], stats.nbinom(3, 0.4)),
    ("hypergeometric", [15, 25, 10], stats.hypergeom(40, 15, 10)),
    ("bernoulli", [0.3], stats.bernoulli(0.3)),
    ("randint", [-3, 7], stats.randint(-3, 7)),
]


def finite(v):
    v = float(v)
    if math.isnan(v):
        return "NaN"
    if math.isinf(v):
        return "Infinity" if v > 0 else "-Infinity"
    return v


def case(name, args, dist, discrete):
    lo, hi = dist.ppf(0.001), dist.ppf(0.999)
    if discrete:
        xs = sorted(set(int(v) for v in np.linspace(lo - 1, hi + 1, 12)))
    else:
        xs = [float(v) for v in np.linspace(lo, hi, 9)]
    out = {
        "fn": name, "args": args, "discrete": discrete, "x": xs,
        "density": [finite(dist.pmf(x) if discrete else dist.pdf(x)) for x in xs],
        "cdf": [finite(dist.cdf(x)) for x in xs],
        "sf": [finite(dist.sf(x)) for x in xs],
        "q": Q,
        "ppf": [finite(dist.ppf(q)) for q in Q],
        "isf": [finite(dist.isf(q)) for q in Q],
        "mean": finite(dist.mean()),
        "variance": finite(dist.var()),
        "median": finite(dist.median()),
    }
    return out


def main():
    cases = [case(*c, False) for c in CONTINUOUS] + [case(*c, True) for c in DISCRETE]
    out = os.path.join(os.path.dirname(__file__), "..", "test", "fixtures", "stats.json")
    with open(out, "w") as fh:
        json.dump(cases, fh, indent=1, allow_nan=False)
    print(f"wrote {len(cases)} cases to {os.path.normpath(out)}")


if __name__ == "__main__":
    main()
