"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
;
global.WebSocket = require('ws');
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = __importDefault(require("util"));
const glob_1 = __importDefault(require("glob"));
const core = __importStar(require("@actions/core"));
const textile_1 = require("@textile/textile");
const threads_id_1 = require("@textile/threads-id");
const readFile = util_1.default.promisify(fs_1.default.readFile);
const globDir = util_1.default.promisify(glob_1.default);
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const key = core.getInput('key');
            const secret = core.getInput('secret');
            if (!key || key === '' || !secret || secret === '') {
                core.setFailed('Invalid credentials');
                return;
            }
            // let host = core.getInput('host')
            // host = !host || host === '' ? 'https://api.staging.textile.io:3447' : host
            const ctx = new textile_1.Context('https://api.staging.textile.io:3447');
            yield ctx.withUserKey({
                key,
                secret,
                type: 0
            });
            const thread = core.getInput('thread');
            const threadID = threads_id_1.ThreadID.fromString(thread);
            ctx.withThread(threadID);
            try {
                const buckets = new textile_1.Buckets(ctx);
                const roots = yield buckets.list();
                const name = core.getInput('bucket');
                const existing = roots.find(bucket => bucket.name === name);
                let bucketKey = '';
                if (existing) {
                    bucketKey = existing.key;
                }
                else {
                    const created = yield buckets.init(name);
                    if (!created.root) {
                        core.setFailed('Failed to create bucket');
                        return;
                    }
                    bucketKey = created.root.key;
                }
                const pattern = core.getInput('pattern');
                const target = core.getInput('path');
                // const debug = core.getInput('debug') === 'true'
                const cwd = path_1.default.join('./', target);
                const options = {
                    cwd,
                    nodir: true
                };
                // path = path === '' ? '.' : path
                if (true == true) {
                    const files = yield globDir(pattern, {
                        cwd: '/home/runner/work/',
                        nodir: true
                    });
                    core.setFailed(`No files found: ${files.join(', ')}`);
                    return;
                }
                const files = yield globDir(pattern, options);
                if (files.length === 0) {
                    core.setFailed(`No files found: ${cwd} ${pattern}`);
                    return;
                }
                let raw;
                for (let file of files) {
                    const filePath = `${cwd}/${file}`;
                    const buffer = yield readFile(filePath);
                    const upload = {
                        path: `/${file}`,
                        content: buffer
                    };
                    raw = yield buckets.pushPath(bucketKey, `/${file}`, upload);
                }
                const ipfs = raw ? raw.root.replace('/ipfs/', '') : '';
                core.setOutput('ipfs', ipfs);
                core.setOutput('ipfsLink', `https://ipfs.io${ipfs}`);
                core.setOutput('ipns', `${bucketKey}`);
                core.setOutput('ipnsLink', `https://${bucketKey}.ipns.hub.textile.io`);
                core.setOutput('threadLink', `https://${thread}.thread.hub.textile.io/${bucketKey}`);
                core.setOutput('http', `https://${bucketKey}.textile.space`);
            }
            catch (error) {
                core.setFailed(error.message);
            }
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
run();
