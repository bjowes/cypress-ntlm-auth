// cSpell:ignore nisse, manpwr, mptest, testpc

import chai from 'chai';
import { ConfigValidator } from '../../src/util/config.validator';
import { NtlmConfig } from '../../src/models/ntlm.config.model';

describe('ConfigValidator', function() {
  describe('ntlmHost', function () {
    let config: NtlmConfig;

    beforeEach(function () {
      config = {
        ntlmHost: 'http://localhost:5000',
        username: 'nisse',
        password: 'manpwr',
      };
    });

    it('Valid ntlmHost succeeds', function() {
      // Act
      let result = ConfigValidator.validate(config);

      // Assert
      chai.expect(result.ok).to.be.true;
    });

    it('Does return error if ntlmHost contains path', function () {
      // Arrange
      config.ntlmHost = 'http://localhost:5000/search';

      // Act
      let result = ConfigValidator.validate(config);

      // Assert
      chai.expect(result.ok).to.be.false;
      chai.expect(result.message).to.be.equal('Invalid ntlmHost, must not contain any path or query (https://www.google.com is ok, https://www.google.com/search is not ok)');
    });

    it('Does return error if ntlmHost is incomplete', function () {
      // Arrange
      config.ntlmHost = 'localhost:5000';

      // Act
      let result = ConfigValidator.validate(config);

      // Assert
      chai.expect(result.ok).to.be.false;
      chai.expect(result.message).to.be.equal('Invalid ntlmHost, must be a valid URL (like https://www.google.com)');
    });
  });

  describe('username', function () {
    let config: NtlmConfig;

    beforeEach(function () {
      config = {
        ntlmHost: 'http://localhost:5000',
        username: 'nisse',
        password: 'manpwr'
      };
    });

    it('Valid username succeeds', function() {
      // Act
      let result = ConfigValidator.validate(config);

      // Assert
      chai.expect(result.ok).to.be.true;
    });

    it('Does return error if username is too long', function () {
      // Arrange
      config.username = 'a'.repeat(105);

      // Act
      let result = ConfigValidator.validate(config);

      // Assert
      chai.expect(result.ok).to.be.false;
      chai.expect(result.message).to.be.equal('Username contains invalid characters or is too long.');
    });

    it('Does return error if username contains invalid chars', function () {
      // Arrange
      config.username = 'a*a';

      // Act
      let result = ConfigValidator.validate(config);

      // Assert
      chai.expect(result.ok).to.be.false;
      chai.expect(result.message).to.be.equal('Username contains invalid characters or is too long.');
    });
  });

  describe('configValidator domain', function() {
    let config: NtlmConfig;

    beforeEach(function () {
      config = {
        ntlmHost: 'http://localhost:5000',
        username: 'nisse',
        password: 'manpwr'
      };
    });

    it('Valid domain succeeds', function() {
      // Arrange
      config.domain = 'mptest';

      // Act
      let result = ConfigValidator.validate(config);

      // Assert
      chai.expect(result.ok).to.be.true;
    });

    it('Does return error if domain is too long', function () {
      // Arrange
      config.domain = 'a'.repeat(16);

      // Act
      let result = ConfigValidator.validate(config);

      // Assert
      chai.expect(result.ok).to.be.false;
      chai.expect(result.message).to.be.equal('Domain contains invalid characters or is too long.');
    });

    it('Does return error if domain contains invalid chars', function () {
      // Arrange
      config.domain = 'a*a';

      // Act
      let result = ConfigValidator.validate(config);

      // Assert
      chai.expect(result.ok).to.be.false;
      chai.expect(result.message).to.be.equal('Domain contains invalid characters or is too long.');
    });
  });

  describe('workstation', function() {
    let config: NtlmConfig;

    beforeEach(function () {
      config = {
        ntlmHost: 'http://localhost:5000',
        username: 'nisse',
        password: 'manpwr'
      };
    });

    it('Valid workstation succeeds', function() {
      // Arrange
      config.workstation = 'testpc';

      // Act
      let result = ConfigValidator.validate(config);

      // Assert
      chai.expect(result.ok).to.be.true;
    });

    it('Does return error if workstation is too long', function () {
      // Arrange
      let workstation = 'a'.repeat(16);
      config.workstation = workstation;

      // Act
      let result = ConfigValidator.validate(config);

      // Assert
      chai.expect(result.ok).to.be.false;
      chai.expect(result.message).to.be.equal('Workstation contains invalid characters or is too long.');
    });

    it('Does return error if workstation contains invalid chars', function () {
      // Arrange
      let workstation = 'a*a';
      config.workstation = workstation;

      // Act
      let result = ConfigValidator.validate(config);

      // Assert
      chai.expect(result.ok).to.be.false;
      chai.expect(result.message).to.be.equal('Workstation contains invalid characters or is too long.');
    });

  });

  describe('required fields', function() {
    let config: NtlmConfig;

    beforeEach(function () {
      config = {
        ntlmHost: 'http://localhost:5000',
        username: 'nisse',
        password: 'manpwr'
      };
    });

    it('Does return error if ntlmHost is missing', function () {
      // Arrange
      delete config.ntlmHost;

      // Act
      let result = ConfigValidator.validate(config);

      // Assert
      chai.expect(result.ok).to.be.false;
      chai.expect(result.message).to.be.equal('Incomplete configuration. ntlmHost, username and password are required fields.');
    });

    it('Does return error if username is missing', function () {
      // Arrange
      delete config.username;

      // Act
      let result = ConfigValidator.validate(config);

      // Assert
      chai.expect(result.ok).to.be.false;
      chai.expect(result.message).to.be.equal('Incomplete configuration. ntlmHost, username and password are required fields.');
    });


    it('Does return error if password is missing', function () {
      // Arrange
      delete config.password;

      // Act
      let result = ConfigValidator.validate(config);

      // Assert
      chai.expect(result.ok).to.be.false;
      chai.expect(result.message).to.be.equal('Incomplete configuration. ntlmHost, username and password are required fields.');
    });
  });
});
