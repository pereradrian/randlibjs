# Randlibjs

A lightweight JavaScript library for generating random numbers with various probability distributions.

[![npm version](https://img.shields.io/npm/v/randlibjs.svg)](https://www.npmjs.com/package/randlibjs)
[![License](https://img.shields.io/npm/l/randlibjs.svg)](https://github.com/pereradrian/randlibjs/blob/main/LICENSE)
[![Downloads](https://img.shields.io/npm/dm/randlibjs.svg)](https://www.npmjs.com/package/randlibjs)

## Features

- **Multiple Distributions**: Generate random numbers from various probability distributions including normal, uniform, exponential, and more
- **Reproducible Results**: Set seeds to generate reproducible sequences of random numbers for testing and validation
- **Lightweight**: Minimal dependencies and optimized code for fast performance in both browser and Node.js environments
- **Easy to Use**: Simple and intuitive API with comprehensive documentation and examples

## Installation

### npm

```bash
npm install randlibjs
```

### CDN

```html
<script src="https://cdn.jsdelivr.net/npm/randlibjs@latest/dist/randlib.min.js"></script>
```

## Quick Start

### ES Modules

```javascript
// Import specific functions
import { normal, uniform, seed } from 'randlibjs';

// Set a seed for reproducibility
seed(12345);

// Generate 10 numbers from normal distribution
const normalSample = normal(0, 1, 10);
console.log(normalSample);

// Generate 5 uniformly distributed numbers
const uniformSample = uniform(0, 10, 5);
console.log(uniformSample);
```

### Browser

```html
<script src="https://cdn.jsdelivr.net/npm/randlibjs@latest/dist/randlib.min.js"></script>
<script>
  // Set a seed
  randlib.seed(12345);
  
  // Generate random numbers
  const normalSample = randlib.normal(0, 1, 10);
  console.log(normalSample);
</script>
```

## Available Distributions

### Continuous Distributions

| Function | Description | Parameters |
|----------|-------------|------------|
| `uniform(low, high, size)` | Uniform distribution | `low`: Lower bound (default: 0)<br>`high`: Upper bound (default: 1)<br>`size`: Sample size (default: 1) |
| `normal(mean, std, size)` | Normal (Gaussian) distribution | `mean`: Mean (default: 0)<br>`std`: Standard deviation (default: 1)<br>`size`: Sample size (default: 1) |
| `exponential(lambda, size)` | Exponential distribution | `lambda`: Rate parameter (default: 1)<br>`size`: Sample size (default: 1) |
| `cauchy(loc, scale, size)` | Cauchy distribution | `loc`: Location parameter (default: 0)<br>`scale`: Scale parameter (default: 1)<br>`size`: Sample size (default: 1) |
| `lognormal(mean, sigma, size)` | Lognormal distribution | `mean`: Mean of logarithm (default: 0)<br>`sigma`: Standard deviation of logarithm (default: 1)<br>`size`: Sample size (default: 1) |
| `pareto(alpha, size)` | Pareto distribution | `alpha`: Shape parameter (default: 1)<br>`size`: Sample size (default: 1) |
| `triangular(low, high, mode, size)` | Triangular distribution | `low`: Lower bound (default: 0)<br>`high`: Upper bound (default: 1)<br>`mode`: Mode (default: 0.5)<br>`size`: Sample size (default: 1) |

### Discrete Distributions

| Function | Description | Parameters |
|----------|-------------|------------|
| `randint(low, high, size)` | Discrete uniform distribution | `low`: Lower bound (included, default: 0)<br>`high`: Upper bound (excluded)<br>`size`: Sample size (default: 1) |
| `poisson(lambda, size)` | Poisson distribution | `lambda`: Rate parameter (default: 1)<br>`size`: Sample size (default: 1) |
| `binomial(n, p, size)` | Binomial distribution | `n`: Number of trials<br>`p`: Success probability<br>`size`: Sample size (default: 1) |
| `geometric(p, size)` | Geometric distribution | `p`: Success probability<br>`size`: Sample size (default: 1) |
| `chisquare(df, size)` | Chi-square distribution | `df`: Degrees of freedom<br>`size`: Sample size (default: 1) |

### Multivariate Distributions

| Function | Description | Parameters |
|----------|-------------|------------|
| `multivariateNormal(mean, cov, size)` | Multivariate normal distribution | `mean`: Mean vector<br>`cov`: Covariance matrix<br>`size`: Sample size (default: 1) |

### Utilities

| Function | Description | Parameters |
|----------|-------------|------------|
| `seed(value)` | Set random seed | `value`: Seed value |
| `shuffle(array)` | Randomly shuffle array | `array`: Array to shuffle |
| `permutation(n)` | Random permutation of integers | `n`: Number of elements |
| `mixture(distributions, weights, size)` | Mixture of distributions | `distributions`: Array of distribution functions<br>`weights`: Array of weights<br>`size`: Sample size (default: 1) |

## Examples

### Monte Carlo Simulation

```javascript
import { uniform } from 'randlibjs';

function estimatePi(samples = 1000) {
  let insideCircle = 0;
  
  for (let i = 0; i < samples; i++) {
    const x = uniform(-1, 1);
    const y = uniform(-1, 1);
    
    if (x*x + y*y <= 1) {
      insideCircle++;
    }
  }
  
  return 4 * insideCircle / samples;
}

// Estimate π with 10,000 samples
console.log(estimatePi(10000));
```

### Random Walk Simulation

```javascript
import { randint } from 'randlibjs';

function randomWalk(steps = 100, p = 0.5) {
  let position = 0;
  const positions = [position];
  
  for (let i = 0; i < steps; i++) {
    // Movement: +1 with probability p, -1 with probability 1-p
    const step = Math.random() < p ? 1 : -1;
    position += step;
    positions.push(position);
  }
  
  return positions;
}

// Perform a random walk of 100 steps
const walk = randomWalk(100);
console.log(walk);
```

## Documentation

For detailed documentation and more examples, visit:

- [Official Website](https://pereradrian.github.io/randlibjs/)
- [API Documentation](https://pereradrian.github.io/randlibjs/docs/)
- [GitHub Repository](https://github.com/pereradrian/randlibjs)

## License

BSD-3-Clause License

## Author

[Adrián Muñoz Perera](https://pereradrian.github.io/)
