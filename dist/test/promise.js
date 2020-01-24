"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const stream_1 = require("stream");
const ava_1 = require("ava");
const with_server_1 = require("./helpers/with-server");
ava_1.default('emits request event as promise', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.statusCode = 200;
        response.end('null');
    });
    await got('').json().on('request', (request) => {
        t.true(request instanceof http_1.ClientRequest);
    });
});
ava_1.default('emits response event as promise', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.statusCode = 200;
        response.end('null');
    });
    await got('').json().on('response', (response) => {
        t.true(response instanceof stream_1.Transform);
        t.true(response.readable);
        t.is(response.statusCode, 200);
        t.is(response.ip, '127.0.0.1');
    });
});
