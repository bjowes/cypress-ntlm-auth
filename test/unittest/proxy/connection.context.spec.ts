import assert from 'assert';
import { NtlmStateEnum } from '../../../src/models/ntlm.state.enum';
import { ConnectionContext } from '../../../src/proxy/connection.context';

describe('ConnectionContext', () => {
    describe('matchHostOrNew', () => {
        it('should return true for unused NTLM ', () => {
            let context = new ConnectionContext();
            let ntlmHost = new URL('http://localhost:8787');
            let result = context.matchHostOrNew(ntlmHost, false);
            assert.equal(result, true);
        });

        it('should return false for used NTLM ', () => {
            let context = new ConnectionContext();
            let oldNtlmHost = new URL('http://localhost:8878');
            context.setState(oldNtlmHost, NtlmStateEnum.Authenticated);
            let ntlmHost = new URL('http://localhost:8787');
            let result = context.matchHostOrNew(ntlmHost, false);
            assert.equal(result, false);
        });

        it('should return true for used NTLM on match', () => {
            let context = new ConnectionContext();
            let ntlmHost = new URL('http://localhost:8787');
            context.setState(ntlmHost, NtlmStateEnum.NotAuthenticated);
            let result = context.matchHostOrNew(ntlmHost, false);
            assert.equal(result, true);
        });

        it('should return false on protocol change http to https for NTLM', () => {
            let context = new ConnectionContext();
            let ntlmHost = new URL('localhost:8787');
            context.setState(ntlmHost, NtlmStateEnum.NotAuthenticated);
            let result = context.matchHostOrNew(ntlmHost, true);
            assert.equal(result, false);
        });

        it('should return false on protocol change https to http for NTLM', () => {
            let context = new ConnectionContext();
            let ntlmHost = new URL('localhost:8787');
            context.setState(ntlmHost, NtlmStateEnum.NotAuthenticated);
            context.isSSL = true;
            let result = context.matchHostOrNew(ntlmHost, false);
            assert.equal(result, false);
        });

        it('should return false on protocol change http to https for non NTLM', () => {
            let context = new ConnectionContext();
            let newNtlmHost = new URL('https://localhost:8787');
            let result = context.matchHostOrNew(newNtlmHost, true);
            assert.equal(result, false);
        });

        it('should return false on protocol change https to http for non NTLM', () => {
            let context = new ConnectionContext();
            context.isSSL = true;
            let newNtlmHost = new URL('http://localhost:8787');
            let result = context.matchHostOrNew(newNtlmHost, false);
            assert.equal(result, false);
        });
    });
});