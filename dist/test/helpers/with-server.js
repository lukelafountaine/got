"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const http = require("http");
const tempy = require("tempy");
const createTestServer = require("create-test-server");
const lolex = require("lolex");
const source_1 = require("../../source");
const generateHook = ({ install }) => async (t, run) => {
    const clock = install ? lolex.install() : lolex.createClock();
    const server = await createTestServer({
        bodyParser: {
            type: () => false
        }
    });
    const options = {
        // @ts-ignore Augmenting for test detection
        avaTest: t.title,
        handlers: [
            (options, next) => {
                const result = next(options);
                clock.tick(0);
                // @ts-ignore FIXME: Incompatible union type signatures
                result.on('response', () => {
                    clock.tick(0);
                });
                return result;
            }
        ]
    };
    const preparedGot = source_1.default.extend({ prefixUrl: server.url, ...options });
    preparedGot.secure = source_1.default.extend({ prefixUrl: server.sslUrl, ...options });
    server.hostname = (new URL(server.url)).hostname;
    server.sslHostname = (new URL(server.sslUrl)).hostname;
    try {
        await run(t, server, preparedGot, clock);
    }
    finally {
        await server.close();
    }
    if (install) {
        clock.uninstall();
    }
};
exports.default = generateHook({ install: false });
exports.withServerAndLolex = generateHook({ install: true });
// TODO: remove this when `create-test-server` supports custom listen
exports.withSocketServer = async (t, run) => {
    const socketPath = tempy.file({ extension: 'socket' });
    const server = http.createServer((request, response) => {
        server.emit(request.url, request, response);
    });
    server.socketPath = socketPath;
    await util_1.promisify(server.listen.bind(server))(socketPath);
    try {
        await run(t, server);
    }
    finally {
        await util_1.promisify(server.close.bind(server))();
    }
};
