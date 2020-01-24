"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const http = require("http");
const stream = require("stream");
const ava_1 = require("ava");
const proxyquire = require("proxyquire");
const source_1 = require("../source");
const with_server_1 = require("./helpers/with-server");
const pStreamPipeline = util_1.promisify(stream.pipeline);
ava_1.default('properties', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.statusCode = 404;
        response.end('not');
    });
    const url = new URL(server.url);
    const error = await t.throwsAsync(got(''));
    t.truthy(error);
    t.truthy(error.response);
    t.truthy(error.options);
    t.false({}.propertyIsEnumerable.call(error, 'options'));
    t.false({}.propertyIsEnumerable.call(error, 'response'));
    // This fails because of TS 3.7.2 useDefineForClassFields
    // Class fields will always be initialized, even though they are undefined
    // A test to check for undefined is in place below
    // t.false({}.hasOwnProperty.call(error, 'code'));
    t.is(error.code, undefined);
    t.is(error.message, 'Response code 404 (Not Found)');
    t.deepEqual(error.options.url, url);
    t.is(error.response.headers.connection, 'close');
    t.is(error.response.body, 'not');
});
ava_1.default('catches dns errors', async (t) => {
    const error = await t.throwsAsync(source_1.default('http://doesntexist', { retry: 0 }));
    t.truthy(error);
    t.regex(error.message, /getaddrinfo ENOTFOUND/);
    t.is(error.options.url.host, 'doesntexist');
    t.is(error.options.method, 'GET');
});
ava_1.default('`options.body` form error message', async (t) => {
    // @ts-ignore Error tests
    await t.throwsAsync(source_1.default.post('https://example.com', { body: Buffer.from('test'), form: '' }), {
        message: 'The `body`, `json` and `form` options are mutually exclusive'
    });
});
ava_1.default('no plain object restriction on json body', with_server_1.default, async (t, server, got) => {
    server.post('/body', async (request, response) => {
        await pStreamPipeline(request, response);
    });
    class CustomObject {
        constructor() {
            this.a = 123;
        }
    }
    const body = await got.post('body', { json: new CustomObject() }).json();
    t.deepEqual(body, { a: 123 });
});
ava_1.default('default status message', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.statusCode = 400;
        response.end('body');
    });
    const error = await t.throwsAsync(got(''));
    t.is(error.response.statusCode, 400);
    t.is(error.response.statusMessage, 'Bad Request');
});
ava_1.default('custom status message', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.statusCode = 400;
        response.statusMessage = 'Something Exploded';
        response.end('body');
    });
    const error = await t.throwsAsync(got(''));
    t.is(error.response.statusCode, 400);
    t.is(error.response.statusMessage, 'Something Exploded');
});
ava_1.default('custom body', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.statusCode = 404;
        response.end('not');
    });
    const error = await t.throwsAsync(got(''));
    t.is(error.response.statusCode, 404);
    t.is(error.response.body, 'not');
});
ava_1.default('contains Got options', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.statusCode = 404;
        response.end();
    });
    const options = {
        agent: false
    };
    const error = await t.throwsAsync(got(options));
    t.is(error.options.agent, options.agent);
});
ava_1.default('empty status message is overriden by the default one', with_server_1.default, async (t, server, got) => {
    server.get('/', (_request, response) => {
        response.writeHead(400, '');
        response.end('body');
    });
    const error = await t.throwsAsync(got(''));
    t.is(error.response.statusCode, 400);
    t.is(error.response.statusMessage, http.STATUS_CODES[400]);
});
ava_1.default('`http.request` error', async (t) => {
    await t.throwsAsync(source_1.default('https://example.com', {
        request: () => {
            throw new TypeError('The header content contains invalid characters');
        }
    }), {
        instanceOf: source_1.default.RequestError,
        message: 'The header content contains invalid characters'
    });
});
ava_1.default('`http.request` pipe error', async (t) => {
    const message = 'snap!';
    // @ts-ignore Error tests
    await t.throwsAsync(source_1.default('https://example.com', {
        // @ts-ignore Error tests
        request: () => {
            const proxy = new stream.PassThrough();
            proxy.resume();
            proxy.once('pipe', () => {
                proxy.destroy(new Error(message));
            });
            return proxy;
        },
        throwHttpErrors: false
    }), {
        instanceOf: source_1.default.RequestError,
        message
    });
});
ava_1.default('`http.request` error through CacheableRequest', async (t) => {
    await t.throwsAsync(source_1.default('https://example.com', {
        request: () => {
            throw new TypeError('The header content contains invalid characters');
        },
        cache: new Map()
    }), {
        instanceOf: source_1.default.RequestError,
        message: 'The header content contains invalid characters'
    });
});
ava_1.default('catches error in mimicResponse', with_server_1.default, async (t, server) => {
    server.get('/', (_request, response) => {
        response.end('ok');
    });
    const mimicResponse = () => {
        throw new Error('Error in mimic-response');
    };
    mimicResponse['@global'] = true;
    const proxiedGot = proxyquire('../source', {
        'mimic-response': mimicResponse
    });
    await t.throwsAsync(proxiedGot(server.url), { message: 'Error in mimic-response' });
});
ava_1.default('errors are thrown directly when options.stream is true', t => {
    t.throws(() => {
        // @ts-ignore Error tests
        source_1.default('https://example.com', { isStream: true, hooks: false });
    }, {
        message: 'Parameter `hooks` must be an Object, not boolean'
    });
});
// Fails randomly on Node 10:
// Blocked by https://github.com/istanbuljs/nyc/issues/619
// eslint-disable-next-line ava/no-skip-test
ava_1.default.skip('the old stacktrace is recovered', async (t) => {
    const error = await t.throwsAsync(source_1.default('https://example.com', {
        request: () => {
            throw new Error('foobar');
        }
    }));
    t.true(error.stack.includes('at Object.request'));
    // The first `at get` points to where the error was wrapped,
    // the second `at get` points to the real cause.
    t.not(error.stack.indexOf('at get'), error.stack.lastIndexOf('at get'));
});
