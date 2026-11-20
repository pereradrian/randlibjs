"""
Generates test/fixtures/reference.json with scipy reference data used by
test/reference.test.js to check every sampler with a goodness-of-fit test.

Continuous cases store the 19 ventiles (5%, 10%, ..., 95% quantiles); discrete
cases store the probability mass function over the bulk of the support.

Usage:  python scripts/make_reference.py
"""
import json
import math
import os

from scipy import stats

E = math.e

# (randlibjs function, args, frozen scipy distribution)
CONTINUOUS = [
    ("uniform", [-1, 3], stats.uniform(-1, 4)),
    ("normal", [1, 2], stats.norm(1, 2)),
    ("standardNormal", [], stats.norm()),
    ("exponential", [2], stats.expon(scale=0.5)),
    ("standardExponential", [], stats.expon()),
    ("lognormal", [0.5, 0.8], stats.lognorm(0.8, scale=math.exp(0.5))),
    ("cauchy", [1, 2], stats.cauchy(1, 2)),
    ("standardCauchy", [], stats.cauchy()),
    ("chisquare", [3], stats.chi2(3)),
    ("chisquare", [0.7], stats.chi2(0.7)),
    ("pareto", [3, 2], stats.pareto(3, scale=2)),
    ("lomax", [2.5], stats.lomax(2.5)),
    ("triangular", [1, 5, 2], stats.triang(0.25, loc=1, scale=4)),
    ("standardGamma", [0.5], stats.gamma(0.5)),
    ("gamma", [2.5, 2], stats.gamma(2.5, scale=2)),
    ("gamma", [0.3, 1], stats.gamma(0.3)),
    ("gamma", [150, 0.1], stats.gamma(150, scale=0.1)),
    ("beta", [0.5, 0.5], stats.beta(0.5, 0.5)),
    ("beta", [2, 5], stats.beta(2, 5)),
    ("beta", [0.2, 3], stats.beta(0.2, 3)),
    ("f", [5, 10], stats.f(5, 10)),
    ("noncentralChisquare", [3, 2], stats.ncx2(3, 2)),
    ("noncentralChisquare", [0.6, 1.5], stats.ncx2(0.6, 1.5)),
    ("noncentralF", [4, 7, 1.5], stats.ncf(4, 7, 1.5)),
    ("standardT", [3], stats.t(3)),
    ("standardT", [0.8], stats.t(0.8)),
    ("studentT", [5, 1, 2], stats.t(5, loc=1, scale=2)),
    ("laplace", [1, 2], stats.laplace(1, 2)),
    ("logistic", [1, 2], stats.logistic(1, 2)),
    ("gumbel", [1, 2], stats.gumbel_r(1, 2)),
    ("weibull", [1.5], stats.weibull_min(1.5)),
    ("weibull", [0.5], stats.weibull_min(0.5)),
    ("rayleigh", [2], stats.rayleigh(scale=2)),
    ("power", [3], stats.powerlaw(3)),
    ("power", [0.4], stats.powerlaw(0.4)),
    ("wald", [2, 3], stats.invgauss(2 / 3, scale=3)),
    ("vonmises", [0.3, 2], stats.vonmises(2, loc=0.3)),
    ("vonmises", [-1, 50], stats.vonmises(50, loc=-1)),
    ("vonmises", [0, 0.5], stats.vonmises(0.5)),
]

DISCRETE = [
    ("poisson", [3.5], stats.poisson(3.5)),
    ("poisson", [120], stats.poisson(120)),
    ("binomial", [40, 0.3], stats.binom(40, 0.3)),
    ("binomial", [5000, 0.6], stats.binom(5000, 0.6)),
    ("geometric", [0.2], stats.geom(0.2)),
    ("randint", [-3, 7], stats.randint(-3, 7)),
    ("integers", [-3, 7], stats.randint(-3, 7)),
    ("bernoulli", [0.3], stats.bernoulli(0.3)),
    ("negativeBinomial", [3, 0.4], stats.nbinom(3, 0.4)),
    ("negativeBinomial", [0.5, 0.2], stats.nbinom(0.5, 0.2)),
    ("negativeBinomial", [200, 0.9], stats.nbinom(200, 0.9)),
    ("hypergeometric", [15, 25, 10], stats.hypergeom(40, 15, 10)),
    ("hypergeometric", [500, 700, 600], stats.hypergeom(1200, 500, 600)),
    ("hypergeometric", [3, 1000, 500], stats.hypergeom(1003, 3, 500)),
    ("hypergeometric", [900, 100, 950], stats.hypergeom(1000, 900, 950)),
    ("logseries", [0.6], stats.logser(0.6)),
    ("logseries", [0.99], stats.logser(0.99)),
    ("zipf", [2.0], stats.zipf(2.0)),
    ("zipf", [1.3], stats.zipf(1.3)),
]


def continuous_case(name, args, dist):
    q = [float(dist.ppf(i / 20)) for i in range(1, 20)]
    return {"fn": name, "args": args, "type": "continuous", "quantiles": q}


def discrete_case(name, args, dist):
    lo = int(dist.ppf(1e-10))
    cap = 3000
    hi = cap if dist.cdf(cap) < 1 - 1e-10 else int(dist.ppf(1 - 1e-10))
    lo = max(lo, int(dist.support()[0]))
    pmf = [float(dist.pmf(k)) for k in range(lo, hi + 1)]
    return {"fn": name, "args": args, "type": "discrete", "lo": lo, "pmf": pmf}


def main():
    cases = [continuous_case(*c) for c in CONTINUOUS] + [discrete_case(*c) for c in DISCRETE]
    out = os.path.join(os.path.dirname(__file__), "..", "test", "fixtures", "reference.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w") as fh:
        json.dump(cases, fh, indent=1)
    print(f"wrote {len(cases)} cases to {os.path.normpath(out)}")


if __name__ == "__main__":
    main()
