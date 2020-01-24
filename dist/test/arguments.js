"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable node/no-deprecated-api */
const url_1 = require("url");
const ava_1 = require("ava");
const pEvent = require("p-event");
const source_1 = require("../source");
const with_server_1 = require("./helpers/with-server");
const echoUrl = (request, response) => {
    response.end(request.url);
};
ava_1.default('`url` is required', async (t) => {
    await t.throwsAsync(
    // @ts-ignore Error tests
    source_1.default(''), {
        instanceOf: TypeError,
        message: 'No URL protocol specified'
    });
});
ava_1.default('`url` should be utf-8 encoded', async (t) => {
    await t.throwsAsync(source_1.default('https://example.com/%D2%E0%EB%EB%E8%ED'), {
        message: 'URI malformed'
    });
});
ava_1.default('throws if no arguments provided', async (t) => {
    // @ts-ignore Error tests
    await t.throwsAsync(source_1.default(), {
        instanceOf: TypeError,
        message: 'Missing `url` argument'
    });
});
ava_1.default('throws an error if the protocol is not specified', async (t) => {
    await t.throwsAsync(source_1.default('example.com'), {
        instanceOf: TypeError,
        message: 'Invalid URL: example.com'
    });
    await t.throwsAsync(source_1.default({}), {
        instanceOf: TypeError,
        message: 'No URL protocol specified'
    });
    await t.throwsAsync(source_1.default({}), {
        instanceOf: TypeError,
        message: 'No URL protocol specified'
    });
});
ava_1.default('string url with searchParams is preserved', with_server_1.default, async (t, server, got) => {
    server.get('/', echoUrl);
    const path = '?test=http://example.com?foo=bar';
    const { body } = await got(path);
    t.is(body, `/${path}`);
});
ava_1.default('options are optional', with_server_1.default, async (t, server, got) => {
    server.get('/test', echoUrl);
    t.is((await got('test')).body, '/test');
});
ava_1.default('methods are normalized', with_server_1.default, async (t, server, got) => {
    server.post('/test', echoUrl);
    const instance = got.extend({
        handlers: [
            (options, next) => {
                if (options.method === options.method.toUpperCase()) {
                    t.pass();
                }
                else {
                    t.fail();
                }
                return next(options);
            }
        ]
    });
    await instance('test', { method: 'post' });
});
ava_1.default('throws an error when legacy URL is passed', with_server_1.default, async (t, server, got) => {
    server.get('/test', echoUrl);
    await t.throwsAsync(
    // @ts-ignore Error tests
    got(url_1.parse(`${server.url}/test`)), 'The legacy `url.Url` is deprecated. Use `URL` instead.');
});
ava_1.default('overrides `searchParams` from options', with_server_1.default, async (t, server, got) => {
    server.get('/', echoUrl);
    const { body } = await got('?drop=this', {
        searchParams: {
            test: 'wow'
        },
        cache: {
            get(key) {
                t.is(key, `cacheable-request:GET:${server.url}/?test=wow`);
            },
            set(key) {
                t.is(key, `cacheable-request:GET:${server.url}/?test=wow`);
            },
            delete() {
                return true;
            },
            clear() {
                return undefined;
            }
        }
    });
    t.is(body, '/?test=wow');
});
ava_1.default('escapes `searchParams` parameter values', with_server_1.default, async (t, server, got) => {
    server.get('/', echoUrl);
    const { body } = await got({
        searchParams: {
            test: 'it’s ok'
        }
    });
    t.is(body, '/?test=it%E2%80%99s+ok');
});
ava_1.default('the `searchParams` option can be a URLSearchParams', with_server_1.default, async (t, server, got) => {
    server.get('/', echoUrl);
    const searchParams = new url_1.URLSearchParams({ test: 'wow' });
    const { body } = await got({ searchParams });
    t.is(body, '/?test=wow');
});
ava_1.default('ignores empty searchParams object', with_server_1.default, async (t, server, got) => {
    server.get('/test', echoUrl);
    t.is((await got('test', { searchParams: {} })).requestUrl, `${server.url}/test`);
});
ava_1.default('throws when passing body with a non payload method', async (t) => {
    // @ts-ignore Error tests
    await t.throwsAsync(source_1.default('https://example.com', { body: 'asdf' }), {
        instanceOf: TypeError,
        message: 'The `GET` method cannot be used with a body'
    });
});
ava_1.default('WHATWG URL support', with_server_1.default, async (t, server, got) => {
    server.get('/test', echoUrl);
    const wURL = new url_1.URL(`${server.url}/test`);
    await t.notThrowsAsync(got(wURL));
});
ava_1.default('returns streams when using `isStream` option', with_server_1.default, async (t, server, got) => {
    server.get('/stream', (_request, response) => {
        response.end('ok');
    });
    const data = await pEvent(got('stream', { isStream: true }), 'data');
    t.is(data.toString(), 'ok');
});
ava_1.default('accepts `url` as an option', with_server_1.default, async (t, server, got) => {
    server.get('/test', echoUrl);
    await t.notThrowsAsync(got({ url: 'test' }));
});
ava_1.default('can omit `url` option if using `prefixUrl`', with_server_1.default, async (t, server, got) => {
    server.get('/', echoUrl);
    await t.notThrowsAsync(got({}));
});
ava_1.default('throws TypeError when `options.hooks` is not an object', async (t) => {
    await t.throwsAsync(
    // @ts-ignore Error tests
    source_1.default('https://example.com', { hooks: 'not object' }), {
        instanceOf: TypeError,
        message: 'Parameter `hooks` must be an Object, not string'
    });
});
ava_1.default('throws TypeError when known `options.hooks` value is not an array', async (t) => {
    await t.throwsAsync(
    // @ts-ignore Error tests
    source_1.default('https://example.com', { hooks: { beforeRequest: {} } }), {
        instanceOf: TypeError,
        message: 'Parameter `beforeRequest` must be an Array, not Object'
    });
});
ava_1.default('throws TypeError when known `options.hooks` array item is not a function', async (t) => {
    // @ts-ignore Error tests
    await t.throwsAsync(
    // @ts-ignore Error tests
    source_1.default('https://example.com', { hooks: { beforeRequest: [{}] } }), {
        instanceOf: TypeError,
        message: 'hook is not a function'
    });
});
ava_1.default('allows extra keys in `options.hooks`', with_server_1.default, async (t, server, got) => {
    server.get('/test', echoUrl);
    // @ts-ignore We do not allow extra keys in hooks but this won't throw
    await t.notThrowsAsync(got('test', { hooks: { extra: [] } }));
});
ava_1.default('`prefixUrl` option works', with_server_1.default, async (t, server, got) => {
    server.get('/test/foobar', echoUrl);
    const instanceA = got.extend({ prefixUrl: `${server.url}/test` });
    const { body } = await instanceA('foobar');
    t.is(body, '/test/foobar');
});
ava_1.default('accepts WHATWG URL as the `prefixUrl` option', with_server_1.default, async (t, server, got) => {
    server.get('/test/foobar', echoUrl);
    const instanceA = got.extend({ prefixUrl: new url_1.URL(`${server.url}/test`) });
    const { body } = await instanceA('foobar');
    t.is(body, '/test/foobar');
});
ava_1.default('backslash in the end of `prefixUrl` option is optional', with_server_1.default, async (t, server) => {
    server.get('/test/foobar', echoUrl);
    const instanceA = source_1.default.extend({ prefixUrl: `${server.url}/test/` });
    const { body } = await instanceA('foobar');
    t.is(body, '/test/foobar');
});
ava_1.default('`prefixUrl` can be changed if the URL contains the old one', with_server_1.default, async (t, server) => {
    server.get('/', echoUrl);
    const instanceA = source_1.default.extend({
        prefixUrl: `${server.url}/meh`,
        handlers: [
            (options, next) => {
                options.prefixUrl = server.url;
                return next(options);
            }
        ]
    });
    const { body } = await instanceA('');
    t.is(body, '/');
});
ava_1.default('throws if cannot change `prefixUrl`', async (t) => {
    const instanceA = source_1.default.extend({
        prefixUrl: 'https://example.com',
        handlers: [
            (options, next) => {
                options.url = new url_1.URL('https://google.pl');
                options.prefixUrl = 'https://example.com';
                return next(options);
            }
        ]
    });
    await t.throwsAsync(instanceA(''), 'Cannot change `prefixUrl` from https://example.com/ to https://example.com: https://google.pl/');
});
ava_1.default('throws if the `searchParams` value is invalid', async (t) => {
    // @ts-ignore Error tests
    await t.throwsAsync(source_1.default('https://example.com', {
        // @ts-ignore Error tests
        searchParams: {
            foo: []
        }
    }), {
        instanceOf: TypeError,
        message: 'The `searchParams` value \'\' must be a string, number, boolean or null'
    });
});
ava_1.default('`context` option is not enumerable', with_server_1.default, async (t, server, got) => {
    server.get('/', echoUrl);
    const context = {
        foo: 'bar'
    };
    await got({
        context,
        hooks: {
            beforeRequest: [
                options => {
                    t.is(options.context, context);
                    t.false({}.propertyIsEnumerable.call(options, 'context'));
                }
            ]
        }
    });
});
ava_1.default('`context` option is accessible when using hooks', with_server_1.default, async (t, server, got) => {
    server.get('/', echoUrl);
    const context = {
        foo: 'bar'
    };
    await got({
        context,
        hooks: {
            init: [
                options => {
                    t.is(options.context, context);
                    t.false({}.propertyIsEnumerable.call(options, 'context'));
                }
            ]
        }
    });
});
ava_1.default('`context` option is accessible when extending instances', t => {
    const context = {
        foo: 'bar'
    };
    const instance = source_1.default.extend({ context });
    t.is(instance.defaults.options.context, context);
    t.false({}.propertyIsEnumerable.call(instance.defaults.options, 'context'));
});
ava_1.default('throws if `options.encoding` is `null`', async (t) => {
    // @ts-ignore Error tests
    await t.throwsAsync(source_1.default('https://example.com', {
        encoding: null
    }), 'To get a Buffer, set `options.responseType` to `buffer` instead');
});
ava_1.default('`url` option and input argument are mutually exclusive', async (t) => {
    await t.throwsAsync(source_1.default('https://example.com', {
        url: 'https://example.com'
    }), 'The `url` option cannot be used if the input is a valid URL.');
});
