"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const ava_1 = require("ava");
const nock = require("nock");
const getStream = require("get-stream");
const pEvent = require("p-event");
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
    const error = await t.throwsAsync(got(''), { instanceOf: source_1.HTTPError });
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
ava_1.default('`options.encoding` doesn\'t affect streams', with_server_1.default, async (t, server, got) => {
    const string = 'ok';
    server.get('/', (_request, response) => {
        response.end(string);
    });
    const data = await getStream(got.stream({ encoding: 'base64' }));
    t.is(data, string);
});
ava_1.default('`got.stream(...).setEncoding(...)` works', with_server_1.default, async (t, server, got) => {
    const string = 'ok';
    server.get('/', (_request, response) => {
        response.end(string);
    });
    const data = await getStream(got.stream('').setEncoding('base64'));
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
    {
        const options = {
            username: 'foo',
            password: 'bar'
        };
        const { options: normalizedOptions } = (await got(options)).request;
        t.is(normalizedOptions.username, options.username);
        t.is(normalizedOptions.password, options.password);
    }
    {
        const options = {
            username: 'foo'
        };
        const { options: normalizedOptions } = (await got(options)).request;
        t.is(normalizedOptions.username, options.username);
        t.is(normalizedOptions.password, '');
    }
    {
        const options = {
            password: 'bar'
        };
        const { options: normalizedOptions } = (await got(options)).request;
        t.is(normalizedOptions.username, '');
        t.is(normalizedOptions.password, options.password);
    }
});
ava_1.default('socket destroyed by the server throws ECONNRESET', with_server_1.default, async (t, server, got) => {
    server.get('/', request => {
        request.socket.destroy();
    });
    await t.throwsAsync(got('', { retry: 0 }), {
        code: 'ECONNRESET'
    });
});
ava_1.default('the response contains timings property', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.end('ok');
    });
    const { timings } = await got('');
    t.truthy(timings);
    t.true(timings.phases.total >= 0);
});
ava_1.default('throws an error if the server aborted the request', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.writeHead(200, {
            'content-type': 'text/plain'
        });
        response.write('chunk 1');
        setImmediate(() => {
            response.write('chunk 2');
            setImmediate(() => {
                response.destroy();
            });
        });
    });
    await t.throwsAsync(got(''), {
        message: 'The server aborted the pending request'
    });
});
ava_1.default('statusMessage fallback', async (t) => {
    nock('http://statusMessageFallback').get('/').reply(503);
    const { statusMessage } = await source_1.default('http://statusMessageFallback', {
        throwHttpErrors: false,
        retry: 0
    });
    t.is(statusMessage, http_1.STATUS_CODES[503]);
});
ava_1.default('does not destroy completed requests', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.setHeader('content-encoding', 'gzip');
        response.end('');
    });
    const options = {
        agent: {
            http: new http_1.Agent({ keepAlive: true })
        },
        retry: 0
    };
    const stream = got.stream(options);
    stream.resume();
    const endPromise = pEvent(stream, 'end');
    const socket = await pEvent(stream, 'socket');
    const closeListener = () => {
        t.fail('Socket has been destroyed');
    };
    socket.once('close', closeListener);
    await new Promise(resolve => setTimeout(resolve, 10));
    socket.off('close', closeListener);
    await endPromise;
    options.agent.http.destroy();
    t.pass();
});
