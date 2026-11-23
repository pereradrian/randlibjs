"""
Derives numpy's ziggurat multiplier tables (wi for the normal, we for the exponential) as exact
doubles, and checks that generating them in high precision with mpmath reproduces them.

On the fast path numpy returns x = rabs * w[idx] (one rounding), so every (rabs, x) pair
constrains w[idx] to an interval; intersecting thousands of them pins down the exact double.

Usage: python scripts/derive_ziggurat.py   (prints whether mpmath tables match)
"""
import math
import numpy as np
import mpmath as mp

mp.mp.dps = 60
N = 3_000_000


def mp_tables_normal():
    r = mp.mpf('3.6541528853610087963519472518')
    v = r * mp.e ** (-r * r / 2) + mp.sqrt(mp.pi / 2) * mp.erfc(r / mp.sqrt(2))
    dn = r; tn = dn
    q = v / mp.e ** (-dn * dn / 2)
    wi = [None] * 256; ki = [None] * 256; fi = [None] * 256
    ki[0] = int(mp.floor(dn / q * 2 ** 52)); ki[1] = 0
    wi[0] = q / 2 ** 52; wi[255] = dn / 2 ** 52
    fi[0] = mp.mpf(1); fi[255] = mp.e ** (-dn * dn / 2)
    for i in range(254, 0, -1):
        dn = mp.sqrt(-2 * mp.log(v / dn + mp.e ** (-dn * dn / 2)))
        ki[i + 1] = int(mp.floor(dn / tn * 2 ** 52)); tn = dn
        fi[i] = mp.e ** (-dn * dn / 2); wi[i] = dn / 2 ** 52
    return [float(w) for w in wi], ki, [float(f) for f in fi]


def mp_tables_exp():
    r = mp.mpf('7.69711747013104972')
    v = mp.mpf('0.0039496598225815571993')
    de = r; te = de
    q = v / mp.e ** (-de)
    we = [None] * 256; ke = [None] * 256; fe = [None] * 256
    ke[0] = int(mp.floor(de / q * 2 ** 53)); ke[1] = 0
    we[0] = q / 2 ** 53; we[255] = de / 2 ** 53
    fe[0] = mp.mpf(1); fe[255] = mp.e ** (-de)
    for i in range(254, 0, -1):
        de = -mp.log(v / de + mp.e ** (-de))
        ke[i + 1] = int(mp.floor(de / te * 2 ** 53)); te = de
        fe[i] = mp.e ** (-de); we[i] = de / 2 ** 53
    return [float(w) for w in we], ke, [float(f) for f in fe]


def derive_normal_wi(seed=11, n=4_000_000):
    """Exact numpy wi_double values, recovered from numpy's own output."""
    w, k, f = mp_tables_normal()
    raw = np.random.PCG64(seed).random_raw(3 * n).tolist()
    out = np.random.default_rng(seed).standard_normal(n).tolist()
    samples = [[] for _ in range(256)]
    pos = 0

    def next_double():
        nonlocal pos
        v = raw[pos]
        pos += 1
        return (v >> 11) * 2.0 ** -53

    for x in out:
        while True:
            r = raw[pos]
            pos += 1
            idx = r & 0xff
            sign = (r >> 8) & 1
            rabs = (r >> 9) & 0xfffffffffffff
            y = rabs * w[idx]
            if sign:
                y = -y
            if rabs < k[idx]:
                samples[idx].append((rabs, abs(x)))
                break
            if idx == 0:
                rinv = 1 / 3.6541528853610088
                while True:
                    xx = -rinv * math.log1p(-next_double())
                    yy = -math.log1p(-next_double())
                    if yy + yy > xx * xx:
                        break
                break
            if (f[idx - 1] - f[idx]) * next_double() + f[idx] < math.exp(-0.5 * y * y):
                # accepted on the slow path: the output is still rabs * wi[idx] (the only
                # source of samples for layer 1, whose fast path threshold is 0)
                samples[idx].append((rabs, abs(x)))
                break
    exact = []
    for idx in range(256):
        pts = samples[idx]
        if not pts:
            raise SystemExit(f'no samples for layer {idx}')
        rabs, x = max(pts)
        cand = x / rabs
        found = None
        for step in range(0, 200):
            for c in (cand, ):
                pass
            for s in (step, -step):
                c = cand
                for _ in range(abs(s)):
                    c = math.nextafter(c, math.inf if s > 0 else -math.inf)
                if all(a * c == b for a, b in pts):
                    found = c
                    break
            if found is not None:
                break
        if found is None:
            raise SystemExit(f'no exact wi for layer {idx}')
        exact.append(found)
    return exact, sum(len(s) for s in samples), min(len(s) for s in samples)


def derive_exponential_we(seed=13, n=4_000_000):
    """Exact numpy we_double values, recovered from numpy's own output."""
    w, k, f = mp_tables_exp()
    raw = np.random.PCG64(seed).random_raw(3 * n).tolist()
    out = np.random.default_rng(seed).standard_exponential(n).tolist()
    samples = [[] for _ in range(256)]
    pos = 0
    for x in out:
        while True:
            ri = raw[pos] >> 3
            pos += 1
            idx = ri & 0xff
            r = ri >> 8
            y = r * w[idx]
            if r < k[idx]:
                samples[idx].append((r, x))
                break
            if idx == 0:
                pos += 1  # tail: one next_double, output not of the form r * we
                break
            u = (raw[pos] >> 11) * 2.0 ** -53
            pos += 1
            if (f[idx - 1] - f[idx]) * u + f[idx] < math.exp(-y):
                samples[idx].append((r, x))
                break
    exact = []
    for idx in range(256):
        pts = samples[idx]
        if not pts:
            raise SystemExit(f'no samples for exponential layer {idx}')
        r, x = max(pts)
        found = None
        c0 = x / r
        for step in range(400):
            for sgn in (1, -1):
                c = c0
                for _ in range(step):
                    c = math.nextafter(c, math.inf if sgn > 0 else -math.inf)
                if all(a * c == b for a, b in pts):
                    found = c
                    break
            if found is not None:
                break
        if found is None:
            raise SystemExit(f'no exact we for layer {idx}')
        exact.append(found)
    return exact


if __name__ == '__main__':
    wi, total, least = derive_normal_wi()
    mpw, _, _ = mp_tables_normal()
    diff = sum(1 for a, b in zip(wi, mpw) if a != b)
    print('samples', total, 'min per layer', least, 'layers differing from mpmath', diff)
    we = derive_exponential_we()
    mpe, _, _ = mp_tables_exp()
    print('exponential layers differing from mpmath', sum(1 for a, b in zip(we, mpe) if a != b))

    def fmt(a):
        rows = [', '.join(repr(v) for v in a[i:i + 4]) for i in range(0, 256, 4)]
        return '[\n    ' + (','+'\n    ').join(rows) + ',\n]'

    header = (
        "// Ziggurat multiplier tables with the exact values used by numpy's Generator:\n"
        "// WI (standard normal) was recovered bit for bit from numpy's output, WE (standard"
        " exponential) generated with 60-digit arithmetic.\n"
        "// Regenerate with: python scripts/derive_ziggurat.py\n"
    )
    with open('src/core/ziggurat-tables.js', 'w') as fh:
        fh.write(header + 'export const WI = ' + fmt(wi) + '\n\nexport const WE = ' + fmt(we) + '\n')
    print('wrote src/core/ziggurat-tables.js')
