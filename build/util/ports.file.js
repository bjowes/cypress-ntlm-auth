"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = __importDefault(require("fs-extra"));
const debug_1 = require("debug");
const deb = debug_1.debug('cypress:plugin:ntlm-auth');
const path_1 = __importDefault(require("path"));
const url_1 = __importDefault(require("url"));
const appdata_path_1 = __importDefault(require("appdata-path"));
class PortsFileHandler {
    constructor() {
        this._portsFileName = 'cypress-ntlm-auth.port';
        this._portsFileFolder = appdata_path_1.default('cypress-ntlm-auth');
        this._portsFileWithPath = path_1.default.join(this._portsFileFolder, this._portsFileName);
    }
    delete() {
        return __awaiter(this, void 0, void 0, function* () {
            yield fs_extra_1.default.unlink(this._portsFileWithPath);
        });
    }
    save(ports) {
        return __awaiter(this, void 0, void 0, function* () {
            yield fs_extra_1.default.mkdirp(this._portsFileFolder);
            yield fs_extra_1.default.writeJson(this._portsFileWithPath, ports);
            debug_1.debug('wrote ' + this._portsFileWithPath);
        });
    }
    exists() {
        return fs_extra_1.default.existsSync(this._portsFileWithPath);
    }
    parse() {
        if (this.exists()) {
            let data = fs_extra_1.default.readJsonSync(this._portsFileWithPath);
            return this.validatePortsFile(data);
        }
        else {
            throw new Error('cypress-ntlm-auth proxy does not seem to be running. ' +
                'It must be started before cypress. Please see the docs.' + this._portsFileWithPath);
        }
    }
    validatePortsFile(data) {
        let ports = data;
        if (!ports || !ports.configApiUrl || !ports.ntlmProxyUrl) {
            throw new Error('Cannot parse ports file');
        }
        let urlTest = url_1.default.parse(ports.configApiUrl);
        if (!urlTest.protocol || !urlTest.hostname ||
            !urlTest.port || !urlTest.slashes) {
            throw new Error('Invalid configApiUrl in ports file');
        }
        urlTest = url_1.default.parse(ports.ntlmProxyUrl);
        if (!urlTest.protocol || !urlTest.hostname ||
            !urlTest.port || !urlTest.slashes) {
            throw new Error('Invalid ntlmProxyUrl in ports file');
        }
        return ports;
    }
}
exports.PortsFileHandler = PortsFileHandler;
