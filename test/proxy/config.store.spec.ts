// cSpell:ignore nisse, mnpwr, mptest
import 'mocha';

import { expect } from 'chai';
import { toCompleteUrl } from '../../src/util/url.converter';
import { IConfigStore } from '../../src/proxy/interfaces/i.config.store';
import { NtlmConfig } from '../../src/models/ntlm.config.model';
import { NtlmSsoConfig } from '../../src/models/ntlm.sso.config.model';
import { ConfigStore } from '../../src/proxy/config.store';

describe('ConfigStore', () => {
  let configStore: IConfigStore;
  let hostConfig: NtlmConfig;
  let ssoConfig: NtlmSsoConfig;

  beforeEach(function () {
    configStore = new ConfigStore();
  });

  describe('existsOrUseSso', function() {
    it('should return true if exact match of host exists in ntlmHosts', function () {
      // Arrange
      hostConfig = {
        ntlmHost: 'http://localhost:5000',
        username: 'nisse\\nisse',
        password: 'dummy',
        domain: 'mptest',
        ntlmVersion: 2
      };
      configStore.updateConfig(hostConfig);

      // Act
      let res = configStore.existsOrUseSso(toCompleteUrl('http://localhost:5000', false));

      // Assert
      expect(res).to.be.true;
    });

    it('should return false if protocol mismatch of host in ntlmHosts', function () {
      // Arrange
      hostConfig = {
        ntlmHost: 'http://localhost:5000',
        username: 'nisse\\nisse',
        password: 'dummy',
        domain: 'mptest',
        ntlmVersion: 2
      };
      configStore.updateConfig(hostConfig);

      // Act
      let res = configStore.existsOrUseSso(toCompleteUrl('https://localhost:5000', false));

      // Assert
      expect(res).to.be.false;
    });

    it('should return false if port mismatch of host in ntlmHosts', function () {
      // Arrange
      hostConfig = {
        ntlmHost: 'http://localhost:5000',
        username: 'nisse\\nisse',
        password: 'dummy',
        domain: 'mptest',
        ntlmVersion: 2
      };
      configStore.updateConfig(hostConfig);

      // Act
      let res = configStore.existsOrUseSso(toCompleteUrl('http://localhost:5001', false));

      // Assert
      expect(res).to.be.false;
    });

    it('should return false if hostname mismatch of host in ntlmHosts', function () {
      // Arrange
      hostConfig = {
        ntlmHost: 'http://localhost:5000',
        username: 'nisse\\nisse',
        password: 'dummy',
        domain: 'mptest',
        ntlmVersion: 2
      };
      configStore.updateConfig(hostConfig);

      // Act
      let res = configStore.existsOrUseSso(toCompleteUrl('http://localhosty:5000', false));

      // Assert
      expect(res).to.be.false;
    });

    it('should return true if hostname exists in ntlmSso', function () {
      // Arrange
      ssoConfig = {
        ntlmHosts: ['localhost', 'google.com']
      };
      configStore.setSsoConfig(ssoConfig);

      // Act
      let res = configStore.existsOrUseSso(toCompleteUrl('http://localhost:5000', false));

      // Assert
      expect(res).to.be.true;
    });

    it('should return false if hostname does not exist in ntlmSso', function () {
      // Arrange
      ssoConfig = {
        ntlmHosts: ['localhost', 'google.com']
      };
      configStore.setSsoConfig(ssoConfig);

      // Act
      let res = configStore.existsOrUseSso(toCompleteUrl('http://localhostt:5000', false));

      // Assert
      expect(res).to.be.false;
    });

    it('should return true if hostname matches single wildcard in ntlmSso', function () {
      // Arrange
      ssoConfig = {
        ntlmHosts: ['localhost', '*.google.com']
      };
      configStore.setSsoConfig(ssoConfig);

      // Act
      let res = configStore.existsOrUseSso(toCompleteUrl('http://api.google.com', false));

      // Assert
      expect(res).to.be.true;
    });

    it('should return true if hostname matches multiple wildcard in ntlmSso', function () {
      // Arrange
      ssoConfig = {
        ntlmHosts: ['localhost', '*.google.com', 'a.*.b.*.com']
      };
      configStore.setSsoConfig(ssoConfig);

      // Act
      let res = configStore.existsOrUseSso(toCompleteUrl('http://a.google.more.b.nothing.com', false));

      // Assert
      expect(res).to.be.true;
    });

    it('should return false if hostname does not match multiple wildcard in ntlmSso', function () {
      // Arrange
      ssoConfig = {
        ntlmHosts: ['localhost', '*.google.com', 'a.*.b.*.com']
      };
      configStore.setSsoConfig(ssoConfig);

      // Act
      let res = configStore.existsOrUseSso(toCompleteUrl('http://a.google.more.b.com', false));

      // Assert
      expect(res).to.be.false;
    });

  });

  describe('useSso', function() {
    it('should return false if exact match of host exists in ntlmHosts', function () {
      // Arrange
      hostConfig = {
        ntlmHost: 'http://localhost:5000',
        username: 'nisse\\nisse',
        password: 'dummy',
        domain: 'mptest',
        ntlmVersion: 2
      };
      configStore.updateConfig(hostConfig);

      // Act
      let res = configStore.useSso(toCompleteUrl('http://localhost:5000', false));

      // Assert
      expect(res).to.be.false;
    });

    it('should return false if exact match of host exists in ntlmHosts and ntlmSsoHosts', function () {
      // Arrange
      hostConfig = {
        ntlmHost: 'http://localhost:5000',
        username: 'nisse\\nisse',
        password: 'dummy',
        domain: 'mptest',
        ntlmVersion: 2
      };
      configStore.updateConfig(hostConfig);
      ssoConfig = {
        ntlmHosts: ['localhost', '*.google.com']
      };
      configStore.setSsoConfig(ssoConfig);

      // Act
      let res = configStore.useSso(toCompleteUrl('http://localhost:5000', false));

      // Assert
      expect(res).to.be.false;
    });

    it('should return true if exact match of host exists in ntlmSsoHosts but not in ntlmHosts', function () {
      // Arrange
      hostConfig = {
        ntlmHost: 'http://localhosty:5000',
        username: 'nisse\\nisse',
        password: 'dummy',
        domain: 'mptest',
        ntlmVersion: 2
      };
      configStore.updateConfig(hostConfig);
      ssoConfig = {
        ntlmHosts: ['localhost', '*.google.com']
      };
      configStore.setSsoConfig(ssoConfig);

      // Act
      let res = configStore.useSso(toCompleteUrl('http://localhost:5000', false));

      // Assert
      expect(res).to.be.true;
    });

    it('should return true if wildcard match of host exists in ntlmSsoHosts but no exact match in ntlmHosts', function () {
      // Arrange
      hostConfig = {
        ntlmHost: 'http://localhost:5000',
        username: 'nisse\\nisse',
        password: 'dummy',
        domain: 'mptest',
        ntlmVersion: 2
      };
      configStore.updateConfig(hostConfig);
      ssoConfig = {
        ntlmHosts: ['localhost', '*.google.com']
      };
      configStore.setSsoConfig(ssoConfig);

      // Act
      let res = configStore.useSso(toCompleteUrl('http://api.google.com:5000', false));

      // Assert
      expect(res).to.be.true;
    });
  });
});
