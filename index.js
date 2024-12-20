const { seed } = require('./src/functions/seed')
const randint = require('./src/functions/randint')
const uniform = require('./src/functions/uniform')
const normal = require('./src/functions/normal')
const cauchy = require('./src/functions/cauchy')
const exponential = require('./src/functions/exponential.js')
const shuffle = require('./src/functions/shuffle')


module.exports = {
    seed,
    randint,
    uniform,
    normal,
    cauchy,
    exponential,
    shuffle,
};
