"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ava_1 = require("ava");
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
