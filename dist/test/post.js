"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const stream = require("stream");
const ava_1 = require("ava");
const toReadableStream = require("to-readable-stream");
const source_1 = require("../source");
const with_server_1 = require("./helpers/with-server");
const pStreamPipeline = util_1.promisify(stream.pipeline);
const defaultEndpoint = async (request, response) => {
    response.setHeader('method', request.method);
    await pStreamPipeline(request, response);
};
const echoHeaders = (request, response) => {
    response.end(JSON.stringify(request.headers));
};
ava_1.default('GET cannot have body', with_server_1.default, async (t, server, got) => {
    server.post('/', defaultEndpoint);
    await t.throwsAsync(got.get({ body: 'hi' }), 'The `GET` method cannot be used with a body');
});
ava_1.default('invalid body', async (t) => {
    await t.throwsAsync(
    // @ts-ignore Error tests
    source_1.default.post('https://example.com', { body: {} }), {
        instanceOf: TypeError,
        message: 'The `body` option must be a stream.Readable, string or Buffer'
    });
});
ava_1.default('sends strings', with_server_1.default, async (t, server, got) => {
    server.post('/', defaultEndpoint);
    const { body } = await got.post({ body: 'wow' });
    t.is(body, 'wow');
});
ava_1.default('sends Buffers', with_server_1.default, async (t, server, got) => {
    server.post('/', defaultEndpoint);
    const { body } = await got.post({ body: Buffer.from('wow') });
    t.is(body, 'wow');
});
ava_1.default('sends Streams', with_server_1.default, async (t, server, got) => {
    server.post('/', defaultEndpoint);
    const { body } = await got.post({ body: toReadableStream('wow') });
    t.is(body, 'wow');
});
ava_1.default('sends plain objects as forms', with_server_1.default, async (t, server, got) => {
    server.post('/', defaultEndpoint);
    const { body } = await got.post({
        form: { such: 'wow' }
    });
    t.is(body, 'such=wow');
});
ava_1.default('does NOT support sending arrays as forms', with_server_1.default, async (t, server, got) => {
    server.post('/', defaultEndpoint);
    await t.throwsAsync(got.post({
        form: ['such', 'wow']
    }), {
        instanceOf: TypeError,
        message: 'Each query pair must be an iterable [name, value] tuple'
    });
});
ava_1.default('sends plain objects as JSON', with_server_1.default, async (t, server, got) => {
    server.post('/', defaultEndpoint);
    const { body } = await got.post({
        json: { such: 'wow' },
        responseType: 'json'
    });
    t.deepEqual(body, { such: 'wow' });
});
ava_1.default('sends arrays as JSON', with_server_1.default, async (t, server, got) => {
    server.post('/', defaultEndpoint);
    const { body } = await got.post({
        json: ['such', 'wow'],
        responseType: 'json'
    });
    t.deepEqual(body, ['such', 'wow']);
});
ava_1.default('works with empty post response', with_server_1.default, async (t, server, got) => {
    server.post('/empty', (_request, response) => {
        response.end();
    });
    const { body } = await got.post('empty', { body: 'wow' });
    t.is(body, '');
});
ava_1.default('`content-length` header with string body', with_server_1.default, async (t, server, got) => {
    server.post('/', echoHeaders);
    const { body } = await got.post({ body: 'wow' });
    const headers = JSON.parse(body);
    t.is(headers['content-length'], '3');
});
ava_1.default('`content-length` header with json body', with_server_1.default, async (t, server, got) => {
    server.post('/', echoHeaders);
    const { body } = await got.post({ json: { foo: 'bar' } });
    const headers = JSON.parse(body);
    t.is(headers['content-length'], '13');
});
ava_1.default('`content-length` header with form body', with_server_1.default, async (t, server, got) => {
    server.post('/', echoHeaders);
    const { body } = await got.post({ form: { foo: 'bar' } });
    const headers = JSON.parse(body);
    t.is(headers['content-length'], '7');
});
ava_1.default('`content-length` header with Buffer body', with_server_1.default, async (t, server, got) => {
    server.post('/', echoHeaders);
    const { body } = await got.post({ body: Buffer.from('wow') });
    const headers = JSON.parse(body);
    t.is(headers['content-length'], '3');
});
ava_1.default('`content-length` header with Stream body', with_server_1.default, async (t, server, got) => {
    server.post('/', echoHeaders);
    const { body } = await got.post({ body: toReadableStream('wow') });
    const headers = JSON.parse(body);
    t.is(headers['transfer-encoding'], 'chunked', 'likely failed to get headers at all');
    t.is(headers['content-length'], undefined);
});
ava_1.default('`content-length` header is not overriden', with_server_1.default, async (t, server, got) => {
    server.post('/', echoHeaders);
    const { body } = await got.post({
        body: 'wow',
        headers: {
            'content-length': '10'
        }
    });
    const headers = JSON.parse(body);
    t.is(headers['content-length'], '10');
});
ava_1.default('`content-length` header is present when using custom content-type', with_server_1.default, async (t, server, got) => {
    server.post('/', echoHeaders);
    const { body } = await got.post({
        json: { foo: 'bar' },
        headers: {
            'content-type': 'custom'
        }
    });
    const headers = JSON.parse(body);
    t.is(headers['content-length'], '13');
});
ava_1.default('`content-length` header disabled for chunked transfer-encoding', with_server_1.default, async (t, server, got) => {
    server.post('/', echoHeaders);
    const { body } = await got.post({
        body: '3\r\nwow\r\n0\r\n',
        headers: {
            'transfer-encoding': 'chunked'
        }
    });
    const headers = JSON.parse(body);
    t.is(headers['transfer-encoding'], 'chunked', 'likely failed to get headers at all');
    t.is(headers['content-length'], undefined);
});
ava_1.default('`content-type` header is not overriden when object in `options.body`', with_server_1.default, async (t, server, got) => {
    server.post('/', echoHeaders);
    const { body: headers } = await got.post({
        headers: {
            'content-type': 'doge'
        },
        json: {
            such: 'wow'
        },
        responseType: 'json'
    });
    t.is(headers['content-type'], 'doge');
});
ava_1.default('throws when form body is not a plain object or array', async (t) => {
    // @ts-ignore Manual test
    await t.throwsAsync(source_1.default.post('https://example.com', { form: 'such=wow' }), {
        instanceOf: TypeError,
        message: 'The `form` option must be an Object'
    });
});
// See https://github.com/sindresorhus/got/issues/897
ava_1.default('the `json` payload is not touched', with_server_1.default, async (t, server, got) => {
    server.post('/', defaultEndpoint);
    const { body } = await got.post({
        json: {
            context: {
                foo: true
            }
        },
        responseType: 'json'
    });
    t.true('context' in body);
    t.true(body.context.foo);
});
ava_1.default('the `body` payload is not touched', with_server_1.default, async (t, server, got) => {
    server.post('/', defaultEndpoint);
    const buffer = Buffer.from('Hello, Got!');
    await got.post({
        body: buffer,
        hooks: {
            beforeRequest: [
                options => {
                    t.is(options.body, buffer);
                }
            ]
        }
    });
});
ava_1.default('the `form` payload is not touched', with_server_1.default, async (t, server, got) => {
    server.post('/', defaultEndpoint);
    const object = {
        foo: 'bar'
    };
    await got.post({
        form: object,
        hooks: {
            beforeRequest: [
                options => {
                    t.is(options.form, object);
                }
            ]
        }
    });
});
