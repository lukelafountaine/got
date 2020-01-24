"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EventEmitter = require("events");
const stream_1 = require("stream");
const http = require("http");
const ava_1 = require("ava");
const is_1 = require("@sindresorhus/is");
const pEvent = require("p-event");
const source_1 = require("../source");
const with_server_1 = require("./helpers/with-server");
const retryAfterOn413 = 2;
const socketTimeout = 300;
const handler413 = (_request, response) => {
    response.writeHead(413, {
        'Retry-After': retryAfterOn413
    });
    response.end();
};
const createSocketTimeoutStream = () => {
    const stream = new stream_1.PassThrough();
    // @ts-ignore Mocking the behaviour of a ClientRequest
    stream.setTimeout = (ms, callback) => {
        callback();
    };
    // @ts-ignore Mocking the behaviour of a ClientRequest
    stream.abort = () => { };
    stream.resume();
    return stream;
};
ava_1.default('works on timeout', with_server_1.default, async (t, server, got) => {
    let knocks = 0;
    server.get('/', (_request, response) => {
        response.end('who`s there?');
    });
    t.is((await got({
        timeout: {
            socket: socketTimeout
        },
        request: (...args) => {
            if (knocks === 1) {
                // @ts-ignore Overload error
                return http.request(...args);
            }
            knocks++;
            return createSocketTimeoutStream();
        }
    })).body, 'who`s there?');
});
ava_1.default('retry function gets iteration count', with_server_1.default, async (t, server, got) => {
    let knocks = 0;
    server.get('/', (_request, response) => {
        if (knocks++ === 1) {
            response.end('who`s there?');
            return;
        }
        response.statusCode = 500;
        response.end();
    });
    await got({
        retry: {
            calculateDelay: ({ attemptCount }) => {
                t.true(is_1.default.number(attemptCount));
                return attemptCount < 2 ? 1 : 0;
            }
        }
    });
});
ava_1.default('setting to `0` disables retrying', async (t) => {
    await t.throwsAsync(source_1.default('https://example.com', {
        timeout: { socket: socketTimeout },
        retry: {
            calculateDelay: ({ attemptCount }) => {
                t.is(attemptCount, 1);
                return 0;
            }
        },
        request: () => {
            return createSocketTimeoutStream();
        }
    }), {
        instanceOf: source_1.default.TimeoutError,
        message: `Timeout awaiting 'socket' for ${socketTimeout}ms`
    });
});
ava_1.default('custom retries', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.statusCode = 500;
        response.end();
    });
    let tried = false;
    const error = await t.throwsAsync(got({
        throwHttpErrors: true,
        retry: {
            calculateDelay: ({ attemptCount }) => {
                if (attemptCount === 1) {
                    tried = true;
                    return 1;
                }
                return 0;
            }, methods: [
                'GET'
            ], statusCodes: [
                500
            ]
        }
    }));
    t.is(error.response.statusCode, 500);
    t.true(tried);
});
ava_1.default('custom error codes', async (t) => {
    const errorCode = 'OH_SNAP';
    const error = await t.throwsAsync(source_1.default('https://example.com', {
        request: () => {
            const emitter = new EventEmitter();
            emitter.end = () => { };
            const error = new Error('Snap!');
            error.code = errorCode;
            setTimeout(() => {
                emitter.emit('error', error);
            });
            return emitter;
        },
        retry: {
            calculateDelay: ({ error }) => {
                t.is(error.code, errorCode);
                return 0;
            },
            methods: [
                'GET'
            ],
            errorCodes: [
                errorCode
            ]
        }
    }));
    t.is(error.code, errorCode);
});
ava_1.default('respects 413 Retry-After', with_server_1.default, async (t, server, got) => {
    let lastTried413access = Date.now();
    server.get('/', (_request, response) => {
        response.writeHead(413, {
            'Retry-After': retryAfterOn413
        });
        response.end((Date.now() - lastTried413access).toString());
        lastTried413access = Date.now();
    });
    const { statusCode, body } = await got({
        throwHttpErrors: false,
        retry: 1
    });
    t.is(statusCode, 413);
    t.true(Number(body) >= retryAfterOn413 * 1000);
});
ava_1.default('respects 413 Retry-After with RFC-1123 timestamp', with_server_1.default, async (t, server, got) => {
    let lastTried413TimestampAccess;
    server.get('/', (_request, response) => {
        const date = (new Date(Date.now() + (retryAfterOn413 * 1000))).toUTCString();
        response.writeHead(413, {
            'Retry-After': date
        });
        response.end(lastTried413TimestampAccess);
        lastTried413TimestampAccess = date;
    });
    const { statusCode, body } = await got({
        throwHttpErrors: false,
        retry: 1
    });
    t.is(statusCode, 413);
    t.true(Date.now() >= Date.parse(body));
});
ava_1.default('doesn\'t retry on 413 with empty statusCodes and methods', with_server_1.default, async (t, server, got) => {
    server.get('/', handler413);
    const { statusCode, retryCount } = await got({
        throwHttpErrors: false,
        retry: {
            retries: 1,
            statusCodes: [],
            methods: []
        }
    });
    t.is(statusCode, 413);
    t.is(retryCount, 0);
});
ava_1.default('doesn\'t retry on 413 with empty methods', with_server_1.default, async (t, server, got) => {
    server.get('/', handler413);
    const { statusCode, retryCount } = await got({
        throwHttpErrors: false,
        retry: {
            retries: 1,
            statusCodes: [413],
            methods: []
        }
    });
    t.is(statusCode, 413);
    t.is(retryCount, 0);
});
ava_1.default('doesn\'t retry on 413 without Retry-After header', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.statusCode = 413;
        response.end();
    });
    const { retryCount } = await got({
        throwHttpErrors: false
    });
    t.is(retryCount, 0);
});
ava_1.default('retries on 503 without Retry-After header', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.statusCode = 503;
        response.end();
    });
    const { retryCount } = await got({
        throwHttpErrors: false,
        retry: 1
    });
    t.is(retryCount, 1);
});
ava_1.default('doesn\'t retry on streams', with_server_1.default, async (t, server, got) => {
    server.get('/', () => { });
    // @ts-ignore Error tests
    const stream = got.stream({
        timeout: 1,
        retry: {
            retries: () => {
                t.fail('Retries on streams');
            }
        }
    });
    await t.throwsAsync(pEvent(stream, 'response'));
});
ava_1.default('doesn\'t retry if Retry-After header is greater than maxRetryAfter', with_server_1.default, async (t, server, got) => {
    server.get('/', handler413);
    const { retryCount } = await got({
        retry: { maxRetryAfter: 1000 },
        throwHttpErrors: false
    });
    t.is(retryCount, 0);
});
ava_1.default('doesn\'t retry when set to 0', with_server_1.default, async (t, server, got) => {
    server.get('/', handler413);
    const { statusCode, retryCount } = await got({
        throwHttpErrors: false,
        retry: 0
    });
    t.is(statusCode, 413);
    t.is(retryCount, 0);
});
ava_1.default('works when defaults.options.retry is a number', with_server_1.default, async (t, server, got) => {
    server.get('/', handler413);
    const instance = got.extend({
        retry: 2
    });
    const { retryCount } = await instance({
        throwHttpErrors: false
    });
    t.is(retryCount, 2);
});
ava_1.default('retry function can throw', with_server_1.default, async (t, server, got) => {
    server.get('/', handler413);
    const error = 'Simple error';
    await t.throwsAsync(got({
        retry: {
            calculateDelay: () => {
                throw new Error(error);
            }
        }
    }), error);
});
ava_1.default('does not retry on POST', with_server_1.default, async (t, server, got) => {
    server.post('/', () => { });
    await t.throwsAsync(got.post({
        timeout: 200,
        hooks: {
            beforeRetry: [
                () => {
                    t.fail('Retries on POST requests');
                }
            ]
        }
    }), got.TimeoutError);
});
ava_1.default('does not break on redirect', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.statusCode = 500;
        response.end();
    });
    let tries = 0;
    server.get('/redirect', (_request, response) => {
        tries++;
        response.writeHead(302, {
            location: '/'
        });
        response.end();
    });
    await t.throwsAsync(got('redirect'), 'Response code 500 (Internal Server Error)');
    t.is(tries, 1);
});
