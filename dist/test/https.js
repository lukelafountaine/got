"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ava_1 = require("ava");
const source_1 = require("../source");
const with_server_1 = require("./helpers/with-server");
ava_1.default('https request without ca', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.end('ok');
    });
    t.truthy((await got({ rejectUnauthorized: false })).body);
});
ava_1.default('https request with ca', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.end('ok');
    });
    const { body } = await got({
        ca: server.caCert,
        headers: { host: 'sindresorhus.com' }
    });
    t.is(body, 'ok');
});
ava_1.default('http2', async (t) => {
    const promise = source_1.default('https://httpbin.org/anything', {
        http2: true
    });
    const { headers, body } = await promise;
    await promise.json();
    // @ts-ignore Pseudo headers may not be strings
    t.is(headers[':status'], 200);
    t.is(typeof body, 'string');
});
