"""
Draws streams from the installed numpy for the numpy parity check
(scripts/check-numpy-parity.mjs, run by .github/workflows/numpy-parity.yml).

Usage:  python scripts/numpy_parity.py > parity.json
"""
import json
import sys

import numpy as np

SEEDS = [0, 1, 42, 12345, 2**40 + 7]
BIT_GENERATORS = {
    "pcg64": np.random.PCG64,
    "pcg64dxsm": np.random.PCG64DXSM,
    "sfc64": np.random.SFC64,
    "philox": np.random.Philox,
}

# (randlibjs method, args, numpy method, numpy args [+ trailing kwargs dict], comparison)
# "exact": bit-identical; "ulp": equal up to libm rounding (Math.log/exp/pow vs C);
# "ziggurat": bit-identical except draws from the ziggurat tail (|x| > 3.654), which
# go through log1p and can differ in the last bit between V8 and C's libm.
CASES = [
    ("random", [500], "random", [500], "exact"),
    ("integers", [0, 1000, 200], "integers", [0, 1000, 200], "exact"),
    ("integers", [-5, 5, 100], "integers", [-5, 5, 100], "exact"),
    ("integers", [0, 2**40, 100], "integers", [0, 2**40, 100], "exact"),
    ("integers", [1, 7, 100, True], "integers", [1, 7, 100, {"endpoint": True}], "exact"),
    ("standardNormal", [1000], "standard_normal", [1000], "ziggurat"),
    ("normal", [10, 2, 200], "normal", [10, 2, 200], "ziggurat"),
    ("binomial", [1000, 0.3, 200], "binomial", [1000, 0.3, 200], "exact"),
    ("binomial", [20, 0.2, 200], "binomial", [20, 0.2, 200], "exact"),
    ("binomial", [10**12, 0.6, 20], "binomial", [10**12, 0.6, 20], "exact"),
    ("poisson", [55, 200], "poisson", [55, 200], "exact"),
    ("poisson", [3, 200], "poisson", [3, 200], "exact"),
    ("standardExponential", [200], "standard_exponential", [200], "ulp"),
    ("standardGamma", [0.5, 200], "standard_gamma", [0.5, 200], "ulp"),
    ("standardGamma", [3.2, 200], "standard_gamma", [3.2, 200], "ulp"),
    ("beta", [2, 3, 100], "beta", [2, 3, 100], "ulp"),
    ("chisquare", [4, 100], "chisquare", [4, 100], "ulp"),
]


def main():
    out = {"numpy": np.__version__, "streams": []}
    for name, cls in BIT_GENERATORS.items():
        for seed in SEEDS:
            for method, args, np_method, np_args, mode in CASES:
                rng = np.random.Generator(cls(seed))
                kwargs = np_args[-1] if isinstance(np_args[-1], dict) else {}
                positional = np_args[:-1] if kwargs else np_args
                values = getattr(rng, np_method)(*positional, **kwargs)
                out["streams"].append({
                    "bitGenerator": name, "seed": seed, "method": method, "args": args,
                    "mode": mode, "values": [v.item() for v in values],
                })
    # legacy RandomState(seed) with the Mersenne Twister
    for seed in SEEDS[:4]:
        out["streams"].append({
            "bitGenerator": "mt19937", "seed": seed, "method": "random", "args": [500],
            "mode": "exact", "values": np.random.RandomState(seed).random_sample(500).tolist(),
        })
    json.dump(out, sys.stdout)


if __name__ == "__main__":
    main()
