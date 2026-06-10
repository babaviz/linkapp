"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Buffer = void 0;
// Polyfills for React Native
const buffer_1 = require("buffer");
Object.defineProperty(exports, "Buffer", { enumerable: true, get: function () { return buffer_1.Buffer; } });
// Make Buffer available globally
if (typeof global !== 'undefined') {
    global.Buffer = buffer_1.Buffer;
    // WebRTC polyfills
    global.process = global.process || {};
    global.process.nextTick = global.process.nextTick || setImmediate;
}
