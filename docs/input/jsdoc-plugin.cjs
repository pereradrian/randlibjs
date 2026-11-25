// JSDoc plugin: two things JSDoc 4 cannot handle in this code base.

// BigInt literals: JSDoc serializes every parsed value with JSON.stringify.
BigInt.prototype.toJSON = function () {
    return `${this}n`
}

exports.handlers = {
    // TypeScript import types, which tsc needs to emit the declarations: import('./x.js').Name -> Name
    beforeParse(e) {
        e.source = e.source
            .replace(/import\('[^']+'\)\.(\w+)/g, '$1')
            // intersection types: {F & { fit: ... }} -> {F}
            .replace(/(@returns \{F) & .*\}(?=\r?\n)/g, '$1}')
    },
}
