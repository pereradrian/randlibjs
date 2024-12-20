const { seed, randint, uniform, normal, cauchy, exponential } = require('../index');

describe('Randint module tests', () => {
  it('Generates deterministic sequences with the same seed', () => {
    seed(12345);
    const firstSequence = [randint(0, 10), randint(0, 10), randint(0, 10)];
    seed(12345);
    const secondSequence = [randint(0, 10), randint(0, 10), randint(0, 10)];
    expect(firstSequence).toEqual(secondSequence);
  });
  it('Generates different sequences with different seeds', () => {
    seed(12345);
    const firstSequence = [randint(0, 10), randint(0, 10), randint(0, 10)];
    seed(67890);
    const secondSequence = [randint(0, 10), randint(0, 10), randint(0, 10)];
    expect(firstSequence).not.toEqual(secondSequence);
  });
  it('Generates numbers in the correct range', () => {
    seed(12345);
    const randomNumber = randint(5, 15);
    expect(randomNumber).toBeGreaterThanOrEqual(5);
    expect(randomNumber).toBeLessThan(15);
  });
  it('Generates arrays with correct shape', () => {
    seed(12345);
    const array = randint(0, 10, [2, 3]);
    expect(array).toHaveLength(2);
    expect(array[0]).toHaveLength(3);
    expect(array[1]).toHaveLength(3);
  });
});
describe('Uniform module tests', () => {
  it('Generates deterministic sequences with the same seed', () => {
    seed(12345);
    const firstSequence = [uniform(0, 10), uniform(0, 10), uniform(0, 10)];
    seed(12345);
    const secondSequence = [uniform(0, 10), uniform(0, 10), uniform(0, 10)];
    expect(firstSequence).toEqual(secondSequence);
  });
  it('Generates different sequences with different seeds', () => {
    seed(12345);
    const firstSequence = [uniform(0, 10), uniform(0, 10), uniform(0, 10)];
    seed(67890);
    const secondSequence = [uniform(0, 10), uniform(0, 10), uniform(0, 10)];
    expect(firstSequence).not.toEqual(secondSequence);
  });
  it('Generates numbers in the correct range', () => {
    seed(12345);
    const randomNumber = uniform(5, 15);
    expect(randomNumber).toBeGreaterThanOrEqual(5);
    expect(randomNumber).toBeLessThan(15);
  });
  it('Generates arrays with correct shape', () => {
    seed(12345);
    const array = uniform(0, 10, [2, 3]);
    expect(array).toHaveLength(2);
    expect(array[0]).toHaveLength(3);
    expect(array[1]).toHaveLength(3);
  });
});
describe('Normal module tests', () => {
  it('Generates deterministic sequences with the same seed', () => {
    seed(12345);
    const firstSequence = [normal(0, 10), normal(0, 10), normal(0, 10)];
    seed(12345);
    const secondSequence = [normal(0, 10), normal(0, 10), normal(0, 10)];
    expect(firstSequence).toEqual(secondSequence);
  });
  it('Generates different sequences with different seeds', () => {
    seed(12345);
    const firstSequence = [normal(0, 10), normal(0, 10), normal(0, 10)];
    seed(67890);
    const secondSequence = [normal(0, 10), normal(0, 10), normal(0, 10)];
    expect(firstSequence).not.toEqual(secondSequence);
  });
  describe('Cauchy module tests', () => {
    it('Generates deterministic sequences with the same seed', () => {
      seed(12345);
      const firstSequence = [cauchy(0, 10), cauchy(0, 10), cauchy(0, 10)];
      seed(12345);
      const secondSequence = [cauchy(0, 10), cauchy(0, 10), cauchy(0, 10)];
      expect(firstSequence).toEqual(secondSequence);
    });
    it('Generates different sequences with different seeds', () => {
      seed(12345);
      const firstSequence = [cauchy(0, 10), cauchy(0, 10), cauchy(0, 10)];
      seed(67890);
      const secondSequence = [cauchy(0, 10), cauchy(0, 10), cauchy(0, 10)];
      expect(firstSequence).not.toEqual(secondSequence);
    });
    it('Cauchy generator produces values in correct range', () => {
      const samples = cauchy(0, 1, 1000); // 1000 random values
      expect(samples).toBeInstanceOf(Array);
      expect(samples.length).toBe(1000);
      // Check that samples have a reasonable range (Cauchy has long tails, so wide bounds are expected)
      const finiteSamples = samples.filter(x => Math.abs(x) < 1000);
      expect(finiteSamples.length).toBeGreaterThan(900); // Most values should be finite
    });
  });
  describe('Exponential module tests', () => {
    it('Generates deterministic sequences with the same seed', () => {
      seed(12345);
      const firstSequence = [cauchy(0, 10), cauchy(0, 10), cauchy(0, 10)];
      seed(12345);
      const secondSequence = [cauchy(0, 10), cauchy(0, 10), cauchy(0, 10)];
      expect(firstSequence).toEqual(secondSequence);
    });
    it('Generates different sequences with different seeds', () => {
      seed(12345);
      const firstSequence = [cauchy(0, 10), cauchy(0, 10), cauchy(0, 10)];
      seed(67890);
      const secondSequence = [cauchy(0, 10), cauchy(0, 10), cauchy(0, 10)];
      expect(firstSequence).not.toEqual(secondSequence);
    });
      test('Exponential generator produces values in correct range', () => {
        const lambda = 2; // Rate parameter
        const samples = exponential(lambda, 1000); // 1000 random values
        expect(samples).toBeInstanceOf(Array);
        expect(samples.length).toBe(1000);
        expect(samples.every(x => x >= 0)).toBe(true); // All values must be non-negative
        // Check that the mean is close to 1/lambda
        const mean = samples.reduce((sum, x) => sum + x, 0) / samples.length;
        expect(mean).toBeCloseTo(1 / lambda, 1); // Allow small numerical error
    });
  });
});
