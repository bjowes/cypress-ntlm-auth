import assert from 'assert';
import { UpstreamProxyManager } from '../../../src/proxy/upstream.proxy.manager';
import Substitute, { Arg, SubstituteOf } from '@fluffy-spoon/substitute';
import { IDebugLogger } from '../../../src/util/interfaces/i.debug.logger';
import { DebugLogger } from '../../../src/util/debug.logger';

describe('Upstream proxy manager', function () {
    let debugMock: SubstituteOf<IDebugLogger>;
    let debugLogger = new DebugLogger();
    let manager: UpstreamProxyManager;

    before(function () {
        debugMock = Substitute.for<IDebugLogger>();
        debugMock.log(Arg.all()).mimicks(debugLogger.log);
        manager = new UpstreamProxyManager(debugMock);
    });

    describe('hasHttpsUpstreamProxy', function () {
        it('shall return false when no proxy is set', function () {
            let res = manager.hasHttpsUpstreamProxy(new URL('http://localhost'));
            assert.equal(res, false);
        });

        it('shall return true when HTTP_PROXY is set', function () {
            manager.init('http://localhost:8080', undefined, undefined);
            let res = manager.hasHttpsUpstreamProxy(new URL('http://localhost'));
            assert.equal(res, true);
        });

        it('shall return true when HTTPS_PROXY is set', function () {
            manager.init(undefined, 'http://localhost:8080', undefined);
            let res = manager.hasHttpsUpstreamProxy(new URL('http://localhost'));
            assert.equal(res, true);
        });

        it('shall return false when target matches NO_PROXY', function () {
            manager.init('http://localhost:8080', undefined, 'localhost');
            let res = manager.hasHttpsUpstreamProxy(new URL('http://localhost'));
            assert.equal(res, false);
        });

        it('shall return true when target does not match NO_PROXY', function () {
            manager.init('http://localhost:8080', undefined, 'localhost');
            let res = manager.hasHttpsUpstreamProxy(new URL('http://akami.nu'));
            assert.equal(res, true);
        });

        it('shall handle ::1 in NO_PROXY', function () {
            manager.init('http://localhost:8080', undefined, 'localhost,::1');
            let res = manager.hasHttpsUpstreamProxy(new URL('http://akami.nu'));
            assert.equal(res, true);
        });

        it('shall return false when match on ::1 in NO_PROXY', function () {
            manager.init('http://localhost:8080', undefined, 'localhost,::1');
            let res = manager.hasHttpsUpstreamProxy(new URL('http://[::1]:9002'));
            assert.equal(res, false);
        });
    });

    describe('init', function () {
        it('shall throw on invalid url (format) in NO_PROXY', function () {            
            const expextedErrorMessage = "Invalid NO_PROXY argument part 'local:::host'. " +
                "It must be a comma separated list of: valid IP, hostname[:port] or a wildcard prefixed hostname. Protocol shall not be included. IPv6 addresses must be quoted in []. Examples: localhost,127.0.0.1,[::1],noproxy.acme.com:8080,*.noproxy.com";
    
            assert.throws(() => manager.init('http://localhost:8080', undefined, 'localhost,local:::host,::1'),
                { message: expextedErrorMessage});
        });

        it('shall throw on invalid url (protocol) in NO_PROXY', function () {            
            const expextedErrorMessage = "Invalid NO_PROXY argument part 'http://localhost'. " +
                "It must be a comma separated list of: valid IP, hostname[:port] or a wildcard prefixed hostname. Protocol shall not be included. IPv6 addresses must be quoted in []. Examples: localhost,127.0.0.1,[::1],noproxy.acme.com:8080,*.noproxy.com";
    
            assert.throws(() => manager.init('http://localhost:8080', undefined, 'localhost,http://localhost,::1'),
                { message: expextedErrorMessage});
        });

        it('shall throw on invalid url in HTTP_PROXY', function () {            
            const expextedErrorMessage = "Invalid HTTP_PROXY argument 'http://local:::host:8080'. It must be a complete URL without path. Example: http://proxy.acme.com:8080";
            assert.throws(() => manager.init('http://local:::host:8080', undefined, 'localhost,::1'),
                { message: expextedErrorMessage});
        });

        it('shall throw on invalid url in HTTPS_PROXY', function () {            
            const expextedErrorMessage = "Invalid HTTPS_PROXY argument 'http://local:::host:8080'. It must be a complete URL without path. Example: http://proxy.acme.com:8080";
    
            assert.throws(() => manager.init('http://localhost:8080', 'http://local:::host:8080', 'localhost,::1'),
                { message: expextedErrorMessage});
        });
    });
});