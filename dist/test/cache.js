"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ava_1 = require("ava");
const pEvent = require("p-event");
const getStream = require("get-stream");
const with_server_1 = require("./helpers/with-server");
const cacheEndpoint = (_request, response) => {
    response.setHeader('Cache-Control', 'public, max-age=60');
    response.end(Date.now().toString());
};
ava_1.default('non-cacheable responses are not cached', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.setHeader('Cache-Control', 'public, no-cache, no-store');
        response.end(Date.now().toString());
    });
    const cache = new Map();
    const firstResponseInt = Number((await got({ cache })).body);
    const secondResponseInt = Number((await got({ cache })).body);
    t.is(cache.size, 0);
    t.true(firstResponseInt < secondResponseInt);
});
ava_1.default('cacheable responses are cached', with_server_1.default, async (t, server, got) => {
    server.get('/', cacheEndpoint);
    const cache = new Map();
    const firstResponse = await got({ cache });
    const secondResponse = await got({ cache });
    t.is(cache.size, 1);
    t.is(firstResponse.body, secondResponse.body);
});
ava_1.default('cached response is re-encoded to current encoding option', with_server_1.default, async (t, server, got) => {
    server.get('/', cacheEndpoint);
    const cache = new Map();
    const firstEncoding = 'base64';
    const secondEncoding = 'hex';
    const firstResponse = await got({ cache, encoding: firstEncoding });
    const secondResponse = await got({ cache, encoding: secondEncoding });
    const expectedSecondResponseBody = Buffer.from(firstResponse.body, firstEncoding).toString(secondEncoding);
    t.is(cache.size, 1);
    t.is(secondResponse.body, expectedSecondResponseBody);
});
ava_1.default('redirects are cached and re-used internally', with_server_1.default, async (t, server, got) => {
    let status301Index = 0;
    server.get('/301', (_request, response) => {
        if (status301Index === 0) {
            response.setHeader('Cache-Control', 'public, max-age=60');
            response.setHeader('Location', '/');
            response.statusCode = 301;
        }
        response.end();
        status301Index++;
    });
    let status302Index = 0;
    server.get('/302', (_request, response) => {
        if (status302Index === 0) {
            response.setHeader('Cache-Control', 'public, max-age=60');
            response.setHeader('Location', '/');
            response.statusCode = 302;
        }
        response.end();
        status302Index++;
    });
    server.get('/', cacheEndpoint);
    const cache = new Map();
    const firstResponse = await got('301', { cache });
    const secondResponse = await got('302', { cache });
    t.is(cache.size, 3);
    t.is(firstResponse.body, secondResponse.body);
});
ava_1.default('cached response has got options', with_server_1.default, async (t, server, got) => {
    server.get('/', cacheEndpoint);
    const cache = new Map();
    const options = {
        username: 'foo',
        cache
    };
    await got(options);
    const secondResponse = await got(options);
    t.is(secondResponse.request.options.username, options.username);
});
ava_1.default('cache error throws `got.CacheError`', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.end('ok');
    });
    const cache = {};
    // @ts-ignore Error tests
    await t.throwsAsync(got({ cache }), got.CacheError);
});
ava_1.default('doesn\'t cache response when received HTTP error', with_server_1.default, async (t, server, got) => {
    let calledFirstError = false;
    server.get('/', (_request, response) => {
        if (!calledFirstError) {
            response.end('ok');
            return;
        }
        calledFirstError = true;
        response.statusCode = 502;
        response.end('received 502');
    });
    const cache = new Map();
    const { statusCode, body } = await got({ url: '', cache, throwHttpErrors: false });
    t.is(statusCode, 200);
    t.is(body, 'ok');
});
ava_1.default('DNS cache works', with_server_1.default, async (t, _server, got) => {
    const map = new Map();
    await t.notThrowsAsync(got('https://example.com', { dnsCache: map, prefixUrl: '' }));
    t.is(map.size, 1);
});
ava_1.default('`isFromCache` stream property is undefined before the `response` event', with_server_1.default, async (t, server, got) => {
    server.get('/', cacheEndpoint);
    const cache = new Map();
    const stream = got.stream({ cache });
    t.is(stream.isFromCache, undefined);
    await getStream(stream);
});
ava_1.default('`isFromCache` stream property is false after the `response` event', with_server_1.default, async (t, server, got) => {
    server.get('/', cacheEndpoint);
    const cache = new Map();
    const stream = got.stream({ cache });
    const response = await pEvent(stream, 'response');
    t.is(response.isFromCache, false);
    t.is(stream.isFromCache, false);
    await getStream(stream);
});
ava_1.default('`isFromCache` stream property is true if the response was cached', with_server_1.default, async (t, server, got) => {
    server.get('/', cacheEndpoint);
    const cache = new Map();
    await getStream(got.stream({ cache }));
    const stream = got.stream({ cache });
    const response = await pEvent(stream, 'response');
    t.is(response.isFromCache, true);
    t.is(stream.isFromCache, true);
    await getStream(stream);
});
