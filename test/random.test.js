const { seed, randint, uniform, normal } = require('../index');

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
});
