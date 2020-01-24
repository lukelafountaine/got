"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const EventEmitter = require("events");
const stream_1 = require("stream");
const stream = require("stream");
const http = require("http");
const net = require("net");
const getStream = require("get-stream");
const ava_1 = require("ava");
const delay = require("delay");
const pEvent = require("p-event");
const source_1 = require("../source");
const timed_out_1 = require("../source/utils/timed-out");
const slow_data_stream_1 = require("./helpers/slow-data-stream");
const with_server_1 = require("./helpers/with-server");
const pStreamPipeline = util_1.promisify(stream.pipeline);
const requestDelay = 800;
const errorMatcher = {
    instanceOf: source_1.default.TimeoutError,
    code: 'ETIMEDOUT'
};
const keepAliveAgent = new http.Agent({
    keepAlive: true
});
const defaultHandler = (clock) => (request, response) => {
    request.resume();
    request.on('end', () => {
        clock.tick(requestDelay);
        response.end('OK');
    });
};
const downloadHandler = (clock) => (_request, response) => {
    response.writeHead(200, {
        'transfer-encoding': 'chunked'
    });
    response.flushHeaders();
    setImmediate(async () => {
        await pStreamPipeline(slow_data_stream_1.default(clock), response);
    });
};
ava_1.default.serial('timeout option', with_server_1.withServerAndLolex, async (t, server, got, clock) => {
    server.get('/', defaultHandler(clock));
    await t.throwsAsync(got({
        timeout: 1,
        retry: 0
    }), {
        ...errorMatcher,
        message: 'Timeout awaiting \'request\' for 1ms'
    });
});
ava_1.default.serial('timeout option as object', with_server_1.withServerAndLolex, async (t, server, got, clock) => {
    server.get('/', defaultHandler(clock));
    await t.throwsAsync(got({
        timeout: { request: 1 },
        retry: 0
    }), {
        ...errorMatcher,
        message: 'Timeout awaiting \'request\' for 1ms'
    });
});
ava_1.default.serial('socket timeout', async (t) => {
    await t.throwsAsync(source_1.default('https://example.com', {
        timeout: { socket: 1 },
        retry: 0,
        request: () => {
            const stream = new stream_1.PassThrough();
            // @ts-ignore Mocking the behaviour of a ClientRequest
            stream.setTimeout = (ms, callback) => {
                callback();
            };
            // @ts-ignore Mocking the behaviour of a ClientRequest
            stream.abort = () => { };
            stream.resume();
            return stream;
        }
    }), {
        instanceOf: source_1.default.TimeoutError,
        code: 'ETIMEDOUT',
        message: 'Timeout awaiting \'socket\' for 1ms'
    });
});
ava_1.default.serial('send timeout', with_server_1.withServerAndLolex, async (t, server, got, clock) => {
    server.post('/', defaultHandler(clock));
    await t.throwsAsync(got.post({
        timeout: { send: 1 },
        body: new stream.PassThrough(),
        retry: 0
    }).on('request', request => {
        request.once('socket', socket => {
            socket.once('connect', () => {
                clock.tick(10);
            });
        });
    }), {
        ...errorMatcher,
        message: 'Timeout awaiting \'send\' for 1ms'
    });
});
ava_1.default.serial('send timeout (keepalive)', with_server_1.withServerAndLolex, async (t, server, got, clock) => {
    server.post('/', defaultHandler(clock));
    server.get('/prime', (_request, response) => {
        response.end('ok');
    });
    await got('prime', { agent: keepAliveAgent });
    await t.throwsAsync(got.post({
        agent: keepAliveAgent,
        timeout: { send: 1 },
        retry: 0,
        body: slow_data_stream_1.default(clock)
    }).on('request', (request) => {
        request.once('socket', socket => {
            t.false(socket.connecting);
            socket.once('connect', () => {
                t.fail('\'connect\' event fired, invalidating test');
            });
        });
    }), {
        ...errorMatcher,
        message: 'Timeout awaiting \'send\' for 1ms'
    });
});
ava_1.default.serial('response timeout', with_server_1.withServerAndLolex, async (t, server, got, clock) => {
    server.get('/', defaultHandler(clock));
    await t.throwsAsync(got({
        timeout: { response: 1 },
        retry: 0
    }), {
        ...errorMatcher,
        message: 'Timeout awaiting \'response\' for 1ms'
    });
});
ava_1.default.serial('response timeout unaffected by slow upload', with_server_1.withServerAndLolex, async (t, server, got, clock) => {
    server.post('/', defaultHandler(clock));
    await t.notThrowsAsync(got.post({
        retry: 0,
        body: slow_data_stream_1.default(clock)
    }));
});
ava_1.default.serial('response timeout unaffected by slow download', with_server_1.withServerAndLolex, async (t, server, got, clock) => {
    server.get('/', downloadHandler(clock));
    await t.notThrowsAsync(got({
        timeout: { response: 200 },
        retry: 0
    }));
    clock.tick(100);
});
ava_1.default.serial('response timeout (keepalive)', with_server_1.withServerAndLolex, async (t, server, got, clock) => {
    server.get('/', defaultHandler(clock));
    server.get('/prime', (_request, response) => {
        response.end('ok');
    });
    await got('prime', { agent: keepAliveAgent });
    const request = got({
        agent: keepAliveAgent,
        timeout: { response: 1 },
        retry: 0
    }).on('request', (request) => {
        request.once('socket', socket => {
            t.false(socket.connecting);
            socket.once('connect', () => {
                t.fail('\'connect\' event fired, invalidating test');
            });
        });
    });
    await t.throwsAsync(request, {
        ...errorMatcher,
        message: 'Timeout awaiting \'response\' for 1ms'
    });
});
ava_1.default.serial('connect timeout', with_server_1.withServerAndLolex, async (t, _server, got, clock) => {
    await t.throwsAsync(got({
        createConnection: options => {
            const socket = new net.Socket(options);
            // @ts-ignore We know that it is readonly, but we have to test it
            socket.connecting = true;
            setImmediate(() => {
                socket.emit('lookup', null, '127.0.0.1', 4, 'localhost');
            });
            return socket;
        },
        timeout: { connect: 1 },
        retry: 0
    }).on('request', (request) => {
        request.on('socket', () => {
            clock.runAll();
        });
    }), {
        ...errorMatcher,
        message: 'Timeout awaiting \'connect\' for 1ms'
    });
});
ava_1.default.serial('connect timeout (ip address)', with_server_1.withServerAndLolex, async (t, _server, got, clock) => {
    await t.throwsAsync(got({
        hostname: '127.0.0.1',
        createConnection: options => {
            const socket = new net.Socket(options);
            // @ts-ignore We know that it is readonly, but we have to test it
            socket.connecting = true;
            return socket;
        },
        timeout: { connect: 1 },
        retry: 0
    }).on('request', (request) => {
        request.on('socket', () => {
            clock.runAll();
        });
    }), {
        ...errorMatcher,
        message: 'Timeout awaiting \'connect\' for 1ms'
    });
});
ava_1.default.serial('secureConnect timeout', with_server_1.withServerAndLolex, async (t, _server, got, clock) => {
    await t.throwsAsync(got.secure({
        createConnection: options => {
            const socket = new net.Socket(options);
            // @ts-ignore We know that it is readonly, but we have to test it
            socket.connecting = true;
            setImmediate(() => {
                socket.emit('lookup', null, '127.0.0.1', 4, 'localhost');
                setImmediate(() => {
                    socket.emit('connect');
                });
            });
            return socket;
        },
        timeout: { secureConnect: 0 },
        retry: 0
    }).on('request', (request) => {
        request.on('socket', () => {
            clock.runAll();
        });
    }), {
        ...errorMatcher,
        message: 'Timeout awaiting \'secureConnect\' for 0ms'
    });
});
ava_1.default('secureConnect timeout not breached', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.end('ok');
    });
    await t.notThrowsAsync(got({
        timeout: { secureConnect: 200 },
        retry: 0,
        rejectUnauthorized: false
    }));
});
ava_1.default.serial('lookup timeout', with_server_1.withServerAndLolex, async (t, server, got, clock) => {
    server.get('/', defaultHandler(clock));
    await t.throwsAsync(got({
        // @ts-ignore Manual tests
        lookup: () => { },
        timeout: { lookup: 1 },
        retry: 0
    }).on('request', (request) => {
        request.on('socket', () => {
            clock.runAll();
        });
    }), {
        ...errorMatcher,
        message: 'Timeout awaiting \'lookup\' for 1ms'
    });
});
ava_1.default.serial('lookup timeout no error (ip address)', with_server_1.withServerAndLolex, async (t, server, got, clock) => {
    server.get('/', defaultHandler(clock));
    await t.notThrowsAsync(got({
        hostname: '127.0.0.1',
        timeout: { lookup: 1 },
        retry: 0
    }));
});
ava_1.default.serial('lookup timeout no error (keepalive)', with_server_1.withServerAndLolex, async (t, server, got, clock) => {
    server.get('/', defaultHandler(clock));
    server.get('/prime', (_request, response) => {
        response.end('ok');
    });
    await got('prime', { agent: keepAliveAgent });
    await t.notThrowsAsync(got({
        agent: keepAliveAgent,
        timeout: { lookup: 1 },
        retry: 0
    }).on('request', (request) => {
        request.once('connect', () => {
            t.fail('connect event fired, invalidating test');
        });
    }));
});
ava_1.default.serial('retries on timeout', with_server_1.withServerAndLolex, async (t, server, got, clock) => {
    server.get('/', defaultHandler(clock));
    let tried = false;
    await t.throwsAsync(got({
        timeout: 1,
        retry: {
            calculateDelay: () => {
                if (tried) {
                    return 0;
                }
                tried = true;
                return 1;
            }
        }
    }), {
        ...errorMatcher,
        message: 'Timeout awaiting \'request\' for 1ms'
    });
    t.true(tried);
});
ava_1.default.serial('timeout with streams', with_server_1.withServerAndLolex, async (t, server, got, clock) => {
    server.get('/', defaultHandler(clock));
    const stream = got.stream({
        timeout: 0,
        retry: 0
    });
    await t.throwsAsync(pEvent(stream, 'response'), { code: 'ETIMEDOUT' });
});
ava_1.default.serial('no error emitted when timeout is not breached (stream)', with_server_1.withServerAndLolex, async (t, server, got, clock) => {
    server.get('/', defaultHandler(clock));
    const stream = got.stream({
        retry: 0,
        timeout: {
            request: requestDelay * 2
        }
    });
    await t.notThrowsAsync(getStream(stream));
});
ava_1.default.serial('no error emitted when timeout is not breached (promise)', with_server_1.withServerAndLolex, async (t, server, got, clock) => {
    server.get('/', defaultHandler(clock));
    await t.notThrowsAsync(got({
        retry: 0,
        timeout: {
            request: requestDelay * 2
        }
    }));
});
ava_1.default.serial('no unhandled `socket hung up` errors', with_server_1.withServerAndLolex, async (t, server, got, clock) => {
    server.get('/', defaultHandler(clock));
    await t.throwsAsync(got({ retry: 0, timeout: requestDelay / 2 }), { instanceOf: got.TimeoutError });
});
// TODO: use lolex here
ava_1.default.serial('no unhandled timeout errors', with_server_1.default, async (t, _server, got) => {
    await t.throwsAsync(got({
        retry: 0,
        timeout: 100,
        request: (...args) => {
            // @ts-ignore
            const result = http.request(...args);
            result.once('socket', () => {
                result.socket.destroy();
            });
            return result;
        }
    }), 'socket hang up');
    await delay(200);
});
ava_1.default.serial('no more timeouts after an error', with_server_1.default, async (t, _server, got) => {
    const { setTimeout } = global;
    const { clearTimeout } = global;
    // @ts-ignore
    global.setTimeout = (callback, _ms, ...args) => {
        const timeout = {
            isCleared: false
        };
        process.nextTick(() => {
            if (timeout.isCleared) {
                return;
            }
            callback(...args);
        });
        return timeout;
    };
    // @ts-ignore
    global.clearTimeout = timeout => {
        if (timeout) {
            // @ts-ignore
            timeout.isCleared = true;
        }
    };
    await t.throwsAsync(got(`http://${Date.now()}.dev`, {
        retry: 1,
        timeout: {
            lookup: 1,
            connect: 1,
            secureConnect: 1,
            socket: 1,
            response: 1,
            send: 1,
            request: 1
        }
    }), { instanceOf: got.TimeoutError });
    await delay(100);
    global.setTimeout = setTimeout;
    global.clearTimeout = clearTimeout;
});
ava_1.default.serial('socket timeout is canceled on error', with_server_1.withServerAndLolex, async (t, _server, got, clock) => {
    const message = 'oh, snap!';
    const promise = got({
        timeout: { socket: 50 },
        retry: 0
    }).on('request', (request) => {
        request.abort();
        request.emit('error', new Error(message));
    });
    await t.throwsAsync(promise, { message });
    // Wait a bit more to check if there are any unhandled errors
    clock.tick(100);
});
ava_1.default.serial('no memory leak when using socket timeout and keepalive agent', with_server_1.withServerAndLolex, async (t, server, got, clock) => {
    server.get('/', defaultHandler(clock));
    const promise = got({
        agent: keepAliveAgent,
        timeout: { socket: requestDelay * 2 }
    });
    let socket;
    promise.on('request', (request) => {
        request.on('socket', () => {
            socket = request.socket;
        });
    });
    await promise;
    t.is(socket.listenerCount('timeout'), 0);
});
ava_1.default('ensure there are no new timeouts after cancelation', t => {
    const emitter = new EventEmitter();
    const socket = new EventEmitter();
    socket.connecting = true;
    timed_out_1.default(emitter, {
        connect: 1
    }, {
        hostname: '127.0.0.1'
    })();
    emitter.emit('socket', socket);
    socket.emit('lookup', null);
    t.is(socket.listenerCount('connect'), 0);
});
ava_1.default('double calling timedOut has no effect', t => {
    const emitter = new EventEmitter();
    const attach = () => timed_out_1.default(emitter, {
        connect: 1
    }, {
        hostname: '127.0.0.1'
    });
    attach();
    attach();
    t.is(emitter.listenerCount('socket'), 1);
});
ava_1.default.serial('doesn\'t throw on early lookup', with_server_1.withServerAndLolex, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.end('ok');
    });
    // @ts-ignore
    await t.notThrowsAsync(got('', {
        timeout: {
            lookup: 1
        },
        retry: 0,
        lookup: (...[_hostname, options, callback]) => {
            if (typeof options === 'function') {
                callback = options;
            }
            // @ts-ignore This should be fixed in upstream
            callback(null, '127.0.0.1', 4);
        }
    }));
});
// TODO: use lolex here
ava_1.default.serial('no unhandled `Premature close` error', with_server_1.default, async (t, server, got) => {
    server.get('/', async (_request, response) => {
        response.write('hello');
    });
    await t.throwsAsync(got({
        timeout: 10,
        retry: 0
    }), 'Timeout awaiting \'request\' for 10ms');
    await delay(20);
});
// TODO: use lolex here
ava_1.default.serial('cancelling the request removes timeouts', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.write('hello');
    });
    const promise = got({
        timeout: 500,
        retry: 0
    }).on('downloadProgress', () => {
        promise.cancel();
    }).on('request', request => {
        request.on('error', error => {
            if (error.message === 'Timeout awaiting \'request\' for 500ms') {
                t.fail(error.message);
            }
        });
    });
    await t.throwsAsync(promise, 'Promise was canceled');
    await delay(1000);
});
ava_1.default('timeouts are emitted ASAP', async (t) => {
    const timeout = 500;
    const marginOfError = 100;
    const error = await t.throwsAsync(source_1.default('http://192.0.2.1/test', {
        retry: 0,
        timeout
    }), source_1.TimeoutError);
    t.true(error.timings.phases.total < (timeout + marginOfError));
});
