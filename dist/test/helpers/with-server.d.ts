import * as test from 'ava';
import { ExtendedGot, ExtendedHttpServer, ExtendedTestServer, GlobalClock } from './types';
export declare type RunTestWithServer = (t: test.ExecutionContext, server: ExtendedTestServer, got: ExtendedGot, clock: GlobalClock) => Promise<void> | void;
export declare type RunTestWithSocket = (t: test.ExecutionContext, server: ExtendedHttpServer) => Promise<void> | void;
declare const _default: test.Macro<[RunTestWithServer], unknown>;
export default _default;
export declare const withServerAndLolex: test.Macro<[RunTestWithServer], unknown>;
export declare const withSocketServer: test.Macro<[RunTestWithSocket]>;
