"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const url_1 = require("url");
const ava_1 = require("ava");
const nock = require("nock");
const get_stream_1 = require("get-stream");
const delay = require("delay");
const Responselike = require("responselike");
const source_1 = require("../source");
const with_server_1 = require("./helpers/with-server");
const errorString = 'oops';
const error = new Error(errorString);
const echoHeaders = (request, response) => {
    response.end(JSON.stringify(request.headers));
};
const echoUrl = (request, response) => {
    response.end(request.url);
};
const retryEndpoint = (request, response) => {
    if (request.headers.foo) {
        response.statusCode = 302;
        response.setHeader('location', '/');
        response.end();
    }
    response.statusCode = 500;
    response.end();
};
const redirectEndpoint = (_request, response) => {
    response.statusCode = 302;
    response.setHeader('location', '/');
    response.end();
};
ava_1.default('async hooks', with_server_1.default, async (t, server, got) => {
    server.get('/', echoHeaders);
    const { body } = await got({
        responseType: 'json',
        hooks: {
            beforeRequest: [
                async (options) => {
                    await delay(100);
                    options.headers.foo = 'bar';
                }
            ]
        }
    });
    t.is(body.foo, 'bar');
});
ava_1.default('catches init thrown errors', async (t) => {
    await t.throwsAsync(source_1.default('https://example.com', {
        hooks: {
            init: [() => {
                    throw error;
                }]
        }
    }), {
        instanceOf: source_1.RequestError,
        message: errorString
    });
});
ava_1.default('passes init thrown errors to beforeError hooks (promise-only)', async (t) => {
    t.plan(2);
    await t.throwsAsync(source_1.default('https://example.com', {
        hooks: {
            init: [() => {
                    throw error;
                }],
            beforeError: [error => {
                    t.is(error.message, errorString);
                    return error;
                }]
        }
    }), {
        instanceOf: source_1.RequestError,
        message: errorString
    });
});
ava_1.default('passes init thrown errors to beforeError hooks (promise-only) - beforeError rejection', async (t) => {
    const message = 'foo, bar!';
    await t.throwsAsync(source_1.default('https://example.com', {
        hooks: {
            init: [() => {
                    throw error;
                }],
            beforeError: [() => {
                    throw new Error(message);
                }]
        }
    }), { message });
});
ava_1.default('catches beforeRequest thrown errors', async (t) => {
    await t.throwsAsync(source_1.default('https://example.com', {
        hooks: {
            beforeRequest: [() => {
                    throw error;
                }]
        }
    }), {
        instanceOf: source_1.RequestError,
        message: errorString
    });
});
ava_1.default('catches beforeRedirect thrown errors', with_server_1.default, async (t, server, got) => {
    server.get('/', echoHeaders);
    server.get('/redirect', redirectEndpoint);
    await t.throwsAsync(got('redirect', {
        hooks: {
            beforeRedirect: [() => {
                    throw error;
                }]
        }
    }), {
        instanceOf: source_1.RequestError,
        message: errorString
    });
});
ava_1.default('catches beforeRetry thrown errors', with_server_1.default, async (t, server, got) => {
    server.get('/', echoHeaders);
    server.get('/retry', retryEndpoint);
    await t.throwsAsync(got('retry', {
        hooks: {
            beforeRetry: [() => {
                    throw error;
                }]
        }
    }), {
        instanceOf: source_1.RequestError,
        message: errorString
    });
});
ava_1.default('catches afterResponse thrown errors', with_server_1.default, async (t, server, got) => {
    server.get('/', echoHeaders);
    await t.throwsAsync(got({
        hooks: {
            afterResponse: [() => {
                    throw error;
                }]
        }
    }), {
        instanceOf: source_1.RequestError,
        message: errorString
    });
});
ava_1.default('accepts an async function as init hook', async (t) => {
    await source_1.default('https://example.com', {
        hooks: {
            init: [
                async () => {
                    t.pass();
                }
            ]
        }
    });
});
ava_1.default('catches beforeRequest promise rejections', async (t) => {
    await t.throwsAsync(source_1.default('https://example.com', {
        hooks: {
            beforeRequest: [
                async () => {
                    throw error;
                }
            ]
        }
    }), {
        instanceOf: source_1.RequestError,
        message: errorString
    });
});
ava_1.default('catches beforeRedirect promise rejections', with_server_1.default, async (t, server, got) => {
    server.get('/', redirectEndpoint);
    await t.throwsAsync(got({
        hooks: {
            beforeRedirect: [
                async () => {
                    throw error;
                }
            ]
        }
    }), {
        instanceOf: source_1.RequestError,
        message: errorString
    });
});
ava_1.default('catches beforeRetry promise rejections', with_server_1.default, async (t, server, got) => {
    server.get('/retry', retryEndpoint);
    await t.throwsAsync(got('retry', {
        hooks: {
            beforeRetry: [
                async () => {
                    throw error;
                }
            ]
        }
    }), {
        instanceOf: source_1.RequestError,
        message: errorString
    });
});
ava_1.default('catches afterResponse promise rejections', with_server_1.default, async (t, server, got) => {
    server.get('/', echoHeaders);
    await t.throwsAsync(got({
        hooks: {
            afterResponse: [
                async () => {
                    throw error;
                }
            ]
        }
    }), { message: errorString });
});
ava_1.default('catches beforeError errors', async (t) => {
    // @ts-ignore Error tests
    await t.throwsAsync(source_1.default('https://example.com', {
        // @ts-ignore Error tests
        request: () => {
            throw new Error('No way');
        },
        hooks: {
            beforeError: [
                async () => {
                    throw error;
                }
            ]
        }
    }), { message: errorString });
});
ava_1.default('init is called with options', with_server_1.default, async (t, server, got) => {
    server.get('/', echoHeaders);
    const context = {};
    await got({
        hooks: {
            init: [
                options => {
                    t.is(options.context, context);
                }
            ]
        },
        context
    });
});
ava_1.default('init from defaults is called with options', with_server_1.default, async (t, server, got) => {
    server.get('/', echoHeaders);
    const context = {};
    const instance = got.extend({
        hooks: {
            init: [
                options => {
                    t.is(options.context, context);
                }
            ]
        }
    });
    await instance({ context });
});
ava_1.default('init allows modifications', with_server_1.default, async (t, server, got) => {
    server.get('/', (request, response) => {
        response.end(request.headers.foo);
    });
    const { body } = await got('', {
        headers: {},
        hooks: {
            init: [
                options => {
                    options.headers.foo = 'bar';
                }
            ]
        }
    });
    t.is(body, 'bar');
});
ava_1.default('beforeRequest is called with options', with_server_1.default, async (t, server, got) => {
    server.get('/', echoHeaders);
    await got({
        responseType: 'json',
        hooks: {
            beforeRequest: [
                options => {
                    t.is(options.url.pathname, '/');
                    t.is(options.url.hostname, 'localhost');
                }
            ]
        }
    });
});
ava_1.default('beforeRequest allows modifications', with_server_1.default, async (t, server, got) => {
    server.get('/', echoHeaders);
    const { body } = await got({
        responseType: 'json',
        hooks: {
            beforeRequest: [
                options => {
                    options.headers.foo = 'bar';
                }
            ]
        }
    });
    t.is(body.foo, 'bar');
});
ava_1.default('returning HTTP response from a beforeRequest hook', with_server_1.default, async (t, server, got) => {
    server.get('/', echoUrl);
    const { statusCode, headers, body } = await got({
        hooks: {
            beforeRequest: [
                () => {
                    return new Responselike(200, { foo: 'bar' }, Buffer.from('Hi!'), '');
                }
            ]
        }
    });
    t.is(statusCode, 200);
    t.is(headers.foo, 'bar');
    t.is(body, 'Hi!');
});
ava_1.default('beforeRedirect is called with options and response', with_server_1.default, async (t, server, got) => {
    server.get('/', echoHeaders);
    server.get('/redirect', redirectEndpoint);
    await got('redirect', {
        responseType: 'json',
        hooks: {
            beforeRedirect: [
                (options, response) => {
                    t.is(options.url.pathname, '/');
                    t.is(options.url.hostname, 'localhost');
                    t.is(response.statusCode, 302);
                    t.is(new url_1.URL(response.url).pathname, '/redirect');
                    t.is(response.redirectUrls.length, 1);
                }
            ]
        }
    });
});
ava_1.default('beforeRedirect allows modifications', with_server_1.default, async (t, server, got) => {
    server.get('/', echoHeaders);
    server.get('/redirect', redirectEndpoint);
    const { body } = await got('redirect', {
        responseType: 'json',
        hooks: {
            beforeRedirect: [
                options => {
                    options.headers.foo = 'bar';
                }
            ]
        }
    });
    t.is(body.foo, 'bar');
});
ava_1.default('beforeRetry is called with options', with_server_1.default, async (t, server, got) => {
    server.get('/', echoHeaders);
    server.get('/retry', retryEndpoint);
    const context = {};
    await got('retry', {
        responseType: 'json',
        retry: 1,
        throwHttpErrors: false,
        context,
        hooks: {
            beforeRetry: [
                (options, error, retryCount) => {
                    t.is(options.url.hostname, 'localhost');
                    t.is(options.context, context);
                    t.truthy(error);
                    t.true(retryCount >= 1);
                }
            ]
        }
    });
});
ava_1.default('beforeRetry allows modifications', with_server_1.default, async (t, server, got) => {
    server.get('/', echoHeaders);
    server.get('/retry', retryEndpoint);
    const { body } = await got('retry', {
        responseType: 'json',
        hooks: {
            beforeRetry: [
                options => {
                    options.headers.foo = 'bar';
                }
            ]
        }
    });
    t.is(body.foo, 'bar');
});
ava_1.default('afterResponse is called with response', with_server_1.default, async (t, server, got) => {
    server.get('/', echoHeaders);
    await got({
        responseType: 'json',
        hooks: {
            afterResponse: [
                response => {
                    t.is(typeof response.body, 'object');
                    return response;
                }
            ]
        }
    });
});
ava_1.default('afterResponse allows modifications', with_server_1.default, async (t, server, got) => {
    server.get('/', echoHeaders);
    const { body } = await got({
        responseType: 'json',
        hooks: {
            afterResponse: [
                response => {
                    response.body = { hello: 'world' };
                    return response;
                }
            ]
        }
    });
    t.is(body.hello, 'world');
});
ava_1.default('afterResponse allows to retry', with_server_1.default, async (t, server, got) => {
    server.get('/', (request, response) => {
        if (request.headers.token !== 'unicorn') {
            response.statusCode = 401;
        }
        response.end();
    });
    const { statusCode } = await got({
        hooks: {
            afterResponse: [
                (response, retryWithMergedOptions) => {
                    if (response.statusCode === 401) {
                        return retryWithMergedOptions({
                            headers: {
                                token: 'unicorn'
                            }
                        });
                    }
                    return response;
                }
            ]
        }
    });
    t.is(statusCode, 200);
});
ava_1.default('cancelling the request after retrying in a afterResponse hook', with_server_1.default, async (t, server, got) => {
    let requests = 0;
    server.get('/', (_request, response) => {
        requests++;
        response.end();
    });
    const gotPromise = got({
        hooks: {
            afterResponse: [
                (_response, retryWithMergedOptions) => {
                    const promise = retryWithMergedOptions({
                        headers: {
                            token: 'unicorn'
                        }
                    });
                    gotPromise.cancel();
                    return promise;
                }
            ]
        },
        retry: {
            calculateDelay: () => 1
        }
    });
    await t.throwsAsync(gotPromise);
    await delay(100);
    t.is(requests, 1);
});
ava_1.default('afterResponse allows to retry - `beforeRetry` hook', with_server_1.default, async (t, server, got) => {
    server.get('/', (request, response) => {
        if (request.headers.token !== 'unicorn') {
            response.statusCode = 401;
        }
        response.end();
    });
    let isCalled = false;
    const { statusCode } = await got({
        hooks: {
            afterResponse: [
                (response, retryWithMergedOptions) => {
                    if (response.statusCode === 401) {
                        return retryWithMergedOptions({
                            headers: {
                                token: 'unicorn'
                            }
                        });
                    }
                    return response;
                }
            ],
            beforeRetry: [
                options => {
                    t.truthy(options);
                    isCalled = true;
                }
            ]
        }
    });
    t.is(statusCode, 200);
    t.true(isCalled);
});
ava_1.default('no infinity loop when retrying on afterResponse', with_server_1.default, async (t, server, got) => {
    server.get('/', (request, response) => {
        if (request.headers.token !== 'unicorn') {
            response.statusCode = 401;
        }
        response.end();
    });
    await t.throwsAsync(got({
        retry: 0,
        hooks: {
            afterResponse: [
                (_response, retryWithMergedOptions) => {
                    return retryWithMergedOptions({
                        headers: {
                            token: 'invalid'
                        }
                    });
                }
            ]
        }
    }), { instanceOf: got.HTTPError, message: 'Response code 401 (Unauthorized)' });
});
ava_1.default('throws on afterResponse retry failure', with_server_1.default, async (t, server, got) => {
    let didVisit401then500;
    server.get('/', (_request, response) => {
        if (didVisit401then500) {
            response.statusCode = 500;
        }
        else {
            didVisit401then500 = true;
            response.statusCode = 401;
        }
        response.end();
    });
    await t.throwsAsync(got({
        retry: 1,
        hooks: {
            afterResponse: [
                (response, retryWithMergedOptions) => {
                    if (response.statusCode === 401) {
                        return retryWithMergedOptions({
                            headers: {
                                token: 'unicorn'
                            }
                        });
                    }
                    return response;
                }
            ]
        }
    }), { instanceOf: got.HTTPError, message: 'Response code 500 (Internal Server Error)' });
});
ava_1.default('doesn\'t throw on afterResponse retry HTTP failure if throwHttpErrors is false', with_server_1.default, async (t, server, got) => {
    let didVisit401then500;
    server.get('/', (_request, response) => {
        if (didVisit401then500) {
            response.statusCode = 500;
        }
        else {
            didVisit401then500 = true;
            response.statusCode = 401;
        }
        response.end();
    });
    const { statusCode } = await got({
        throwHttpErrors: false,
        retry: 1,
        hooks: {
            afterResponse: [
                (response, retryWithMergedOptions) => {
                    if (response.statusCode === 401) {
                        return retryWithMergedOptions({
                            headers: {
                                token: 'unicorn'
                            }
                        });
                    }
                    return response;
                }
            ]
        }
    });
    t.is(statusCode, 500);
});
ava_1.default('throwing in a beforeError hook - promise', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.end('ok');
    });
    await t.throwsAsync(got({
        hooks: {
            afterResponse: [
                () => {
                    throw error;
                }
            ],
            beforeError: [
                () => {
                    throw new Error('foobar');
                },
                () => {
                    throw new Error('This shouldn\'t be called at all');
                }
            ]
        }
    }), { message: 'foobar' });
});
ava_1.default('throwing in a beforeError hook - stream', with_server_1.default, async (t, _server, got) => {
    await t.throwsAsync(get_stream_1.default(got.stream({
        hooks: {
            beforeError: [
                () => {
                    throw new Error('foobar');
                },
                () => {
                    throw new Error('This shouldn\'t be called at all');
                }
            ]
        }
    })), { message: 'foobar' });
});
ava_1.default('beforeError is called with an error - promise', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.end('ok');
    });
    await t.throwsAsync(got({
        hooks: {
            afterResponse: [
                () => {
                    throw error;
                }
            ],
            beforeError: [error2 => {
                    t.true(error2 instanceof Error);
                    return error2;
                }]
        }
    }), { message: errorString });
});
ava_1.default('beforeError is called with an error - stream', with_server_1.default, async (t, _server, got) => {
    await t.throwsAsync(get_stream_1.default(got.stream({
        hooks: {
            beforeError: [error2 => {
                    t.true(error2 instanceof Error);
                    return error2;
                }]
        }
    })), { message: 'Response code 404 (Not Found)' });
});
ava_1.default('beforeError allows modifications', async (t) => {
    const errorString2 = 'foobar';
    await t.throwsAsync(source_1.default('https://example.com', {
        request: () => {
            throw error;
        },
        hooks: {
            beforeError: [
                error => {
                    const newError = new Error(errorString2);
                    return new source_1.RequestError(newError.message, newError, error.options);
                }
            ]
        }
    }), { message: errorString2 });
});
ava_1.default('does not break on `afterResponse` hook with JSON mode', with_server_1.default, async (t, server, got) => {
    server.get('/foobar', echoHeaders);
    await t.notThrowsAsync(got('', {
        hooks: {
            afterResponse: [
                (response, retryWithMergedOptions) => {
                    if (response.statusCode === 404) {
                        const url = new url_1.URL('/foobar', response.url);
                        return retryWithMergedOptions({ url });
                    }
                    return response;
                }
            ]
        },
        responseType: 'json'
    }));
});
ava_1.default('catches HTTPErrors', with_server_1.default, async (t, _server, got) => {
    t.plan(2);
    await t.throwsAsync(got({
        hooks: {
            beforeError: [
                error => {
                    t.true(error instanceof got.HTTPError);
                    return error;
                }
            ]
        }
    }));
});
ava_1.default('timeout can be modified using a hook', with_server_1.default, async (t, server, got) => {
    server.get('/', () => { });
    await t.throwsAsync(got({
        timeout: 1000,
        hooks: {
            beforeRequest: [
                options => {
                    options.timeout.request = 500;
                }
            ]
        },
        retry: 0
    }), { message: 'Timeout awaiting \'request\' for 500ms' });
});
ava_1.default('beforeRequest hook is called before each request', with_server_1.default, async (t, server, got) => {
    server.post('/', echoUrl);
    server.post('/redirect', redirectEndpoint);
    const buffer = Buffer.from('Hello, Got!');
    let counts = 0;
    await got.post('redirect', {
        body: buffer,
        hooks: {
            beforeRequest: [
                options => {
                    counts++;
                    t.is(options.headers['content-length'], String(buffer.length));
                }
            ]
        }
    });
    t.is(counts, 2);
});
ava_1.default('beforeError emits valid promise `HTTPError`s', async (t) => {
    t.plan(3);
    nock('https://ValidHTTPErrors.com').get('/').reply(() => [422, 'no']);
    const instance = source_1.default.extend({
        hooks: {
            beforeError: [
                error => {
                    t.true(error instanceof source_1.HTTPError);
                    t.truthy(error.response.body);
                    return error;
                }
            ]
        },
        retry: 0
    });
    await t.throwsAsync(instance('https://ValidHTTPErrors.com'));
});
ava_1.default('hooks are not duplicated', with_server_1.default, async (t, _server, got) => {
    let calls = 0;
    await t.throwsAsync(got({
        hooks: {
            beforeError: [
                error => {
                    calls++;
                    return error;
                }
            ]
        },
        retry: 0
    }), { message: 'Response code 404 (Not Found)' });
    t.is(calls, 1);
});
ava_1.default('async afterResponse allows to retry with allowGetBody and json payload', with_server_1.default, async (t, server, got) => {
    server.get('/', (request, response) => {
        if (request.headers.token !== 'unicorn') {
            response.statusCode = 401;
        }
        response.end();
    });
    const { statusCode } = await got({
        allowGetBody: true,
        json: { hello: 'world' },
        hooks: {
            afterResponse: [
                (response, retryWithMergedOptions) => {
                    if (response.statusCode === 401) {
                        return retryWithMergedOptions({ headers: { token: 'unicorn' } });
                    }
                    return response;
                }
            ]
        },
        retry: 0,
        throwHttpErrors: false
    });
    t.is(statusCode, 200);
});
