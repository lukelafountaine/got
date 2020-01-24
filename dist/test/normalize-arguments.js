"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ava_1 = require("ava");
const source_1 = require("../source");
ava_1.default('should merge options replacing responseType', t => {
    const responseType = 'json';
    const options = source_1.default.mergeOptions(source_1.default.defaults.options, {
        responseType
    });
    t.is(options.responseType, responseType);
});
