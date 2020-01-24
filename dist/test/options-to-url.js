"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ava_1 = require("ava");
const is_1 = require("@sindresorhus/is");
const options_to_url_1 = require("../source/utils/options-to-url");
const origin = 'https://google.com';
ava_1.default('`path` and `pathname` are mutually exclusive', t => {
    t.throws(() => {
        // @ts-ignore Error tests
        options_to_url_1.default({ path: 'a', pathname: 'a' });
    }, 'Parameters `path` and `pathname` are mutually exclusive.');
});
ava_1.default('`path` and `search` are mutually exclusive', t => {
    t.throws(() => {
        // @ts-ignore Error tests
        options_to_url_1.default({ path: 'a', search: 'a' });
    }, 'Parameters `path` and `search` are mutually exclusive.');
});
ava_1.default('`path` and `searchParams` are mutually exclusive', t => {
    t.throws(() => {
        // @ts-ignore Error tests
        options_to_url_1.default({ path: 'a', searchParams: {} });
    }, 'Parameters `path` and `searchParams` are mutually exclusive.');
});
ava_1.default('`path` option', t => {
    {
        const url = options_to_url_1.default({ origin, path: '/x?a=1' });
        t.is(url.href, `${origin}/x?a=1`);
        t.true(is_1.default.urlInstance(url));
    }
    {
        const url = options_to_url_1.default({ origin, path: '/foobar' });
        t.is(url.href, `${origin}/foobar`);
        t.true(is_1.default.urlInstance(url));
    }
});
ava_1.default('`auth` is deprecated', t => {
    t.throws(() => {
        // @ts-ignore Error tests
        options_to_url_1.default({ auth: '' });
    }, 'Parameter `auth` is deprecated. Use `username` / `password` instead.');
});
ava_1.default('`search` and `searchParams` are mutually exclusive', t => {
    t.throws(() => {
        // @ts-ignore Error tests
        options_to_url_1.default({ search: 'a', searchParams: {} });
    }, 'Parameters `search` and `searchParams` are mutually exclusive.');
});
ava_1.default('`href` option', t => {
    const url = options_to_url_1.default({ href: origin });
    t.is(url.href, `${origin}/`);
    t.true(is_1.default.urlInstance(url));
});
ava_1.default('`origin` option', t => {
    const url = options_to_url_1.default({ origin });
    t.is(url.href, `${origin}/`);
    t.true(is_1.default.urlInstance(url));
});
ava_1.default('throws if no protocol specified', t => {
    t.throws(() => {
        options_to_url_1.default({});
    }, 'No URL protocol specified');
});
ava_1.default('`port` option', t => {
    const url = options_to_url_1.default({ origin, port: 8888 });
    t.is(url.href, `${origin}:8888/`);
    t.true(is_1.default.urlInstance(url));
});
ava_1.default('`protocol` option', t => {
    const url = options_to_url_1.default({ origin, protocol: 'http:' });
    t.is(url.href, 'http://google.com/');
    t.true(is_1.default.urlInstance(url));
});
ava_1.default('`username` option', t => {
    const url = options_to_url_1.default({ origin, username: 'username' });
    t.is(url.href, 'https://username@google.com/');
    t.true(is_1.default.urlInstance(url));
});
ava_1.default('`password` option', t => {
    const url = options_to_url_1.default({ origin, password: 'password' });
    t.is(url.href, 'https://:password@google.com/');
    t.true(is_1.default.urlInstance(url));
});
ava_1.default('`username` option combined with `password` option', t => {
    const url = options_to_url_1.default({ origin, username: 'username', password: 'password' });
    t.is(url.href, 'https://username:password@google.com/');
    t.true(is_1.default.urlInstance(url));
});
ava_1.default('`host` option', t => {
    const url = options_to_url_1.default({ protocol: 'https:', host: 'google.com' });
    t.is(url.href, 'https://google.com/');
    t.true(is_1.default.urlInstance(url));
});
ava_1.default('`hostname` option', t => {
    const url = options_to_url_1.default({ protocol: 'https:', hostname: 'google.com' });
    t.is(url.href, 'https://google.com/');
    t.true(is_1.default.urlInstance(url));
});
ava_1.default('`pathname` option', t => {
    const url = options_to_url_1.default({ protocol: 'https:', hostname: 'google.com', pathname: '/foobar' });
    t.is(url.href, 'https://google.com/foobar');
    t.true(is_1.default.urlInstance(url));
});
ava_1.default('`search` option', t => {
    const url = options_to_url_1.default({ protocol: 'https:', hostname: 'google.com', search: '?a=1' });
    t.is(url.href, 'https://google.com/?a=1');
    t.true(is_1.default.urlInstance(url));
});
ava_1.default('`hash` option', t => {
    const url = options_to_url_1.default({ protocol: 'https:', hostname: 'google.com', hash: 'foobar' });
    t.is(url.href, 'https://google.com/#foobar');
    t.true(is_1.default.urlInstance(url));
});
ava_1.default('merges provided `searchParams`', t => {
    const url = options_to_url_1.default({ origin: 'https://google.com/?a=1', searchParams: { b: 2 } });
    t.is(url.href, 'https://google.com/?a=1&b=2');
    t.true(is_1.default.urlInstance(url));
});
