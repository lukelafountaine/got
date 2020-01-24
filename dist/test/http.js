"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ava_1 = require("ava");
const source_1 = require("../source");
const with_server_1 = require("./helpers/with-server");
ava_1.default('simple request', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.end('ok');
    });
    t.is((await got('')).body, 'ok');
});
ava_1.default('empty response', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.end();
    });
    t.is((await got('')).body, '');
});
ava_1.default('response has `requestUrl` property', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.end('ok');
    });
    server.get('/empty', (_request, response) => {
        response.end();
    });
    t.is((await got('')).requestUrl, `${server.url}/`);
    t.is((await got('empty')).requestUrl, `${server.url}/empty`);
});
ava_1.default('http errors have `response` property', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.statusCode = 404;
        response.end('not');
    });
    const error = await t.throwsAsync(got(''), source_1.HTTPError);
    t.is(error.response.statusCode, 404);
    t.is(error.response.body, 'not');
});
ava_1.default('status code 304 doesn\'t throw', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.statusCode = 304;
        response.end();
    });
    const promise = got('');
    await t.notThrowsAsync(promise);
    const { statusCode, body } = await promise;
    t.is(statusCode, 304);
    t.is(body, '');
});
ava_1.default('doesn\'t throw if `options.throwHttpErrors` is false', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.statusCode = 404;
        response.end('not');
    });
    t.is((await got({ throwHttpErrors: false })).body, 'not');
});
ava_1.default('invalid protocol throws', async (t) => {
    await t.throwsAsync(source_1.default('c:/nope.com').json(), {
        instanceOf: source_1.UnsupportedProtocolError,
        message: 'Unsupported protocol "c:"'
    });
});
ava_1.default('custom `options.encoding`', with_server_1.default, async (t, server, got) => {
    const string = 'ok';
    server.get('/', (_request, response) => {
        response.end(string);
    });
    const data = (await got({ encoding: 'base64' })).body;
    t.is(data, Buffer.from(string).toString('base64'));
});
ava_1.default('`searchParams` option', with_server_1.default, async (t, server, got) => {
    server.get('/', (request, response) => {
        t.is(request.query.recent, 'true');
        response.end('recent');
    });
    t.is((await got({ searchParams: { recent: true } })).body, 'recent');
    t.is((await got({ searchParams: 'recent=true' })).body, 'recent');
});
ava_1.default('response has `requestUrl` property even if `url` is an object', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.end('ok');
    });
    t.is((await got({ hostname: server.hostname, port: server.port })).requestUrl, `${server.url}/`);
    t.is((await got({ hostname: server.hostname, port: server.port, protocol: 'http:' })).requestUrl, `${server.url}/`);
});
ava_1.default('response contains url', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.end('ok');
    });
    t.is((await got('')).url, `${server.url}/`);
});
ava_1.default('response contains got options', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.end('ok');
    });
    const options = {
        username: 'foo'
    };
    t.is((await got(options)).request.options.username, options.username);
});
ava_1.default('socket destroyed by the server throws ECONNRESET', with_server_1.default, async (t, server, got) => {
    server.get('/', request => {
        request.socket.destroy();
    });
    await t.throwsAsync(got('', { retry: 0 }), {
        code: 'ECONNRESET'
    });
});
