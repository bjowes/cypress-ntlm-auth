// cSpell:ignore nisse, manpwr, mptest, testpc

const assert = require('assert');
const configValidator = require('../../src/util/configValidator');

describe('configValidator ntlmHost', function () {
  let config;

  beforeEach(function () {
    config = {
      ntlmHost: 'http://localhost:5000',
      username: 'nisse',
      password: 'manpwr'
    };
  });

  it('Valid ntlmHost succeeds', function() {
    // Act
    let result = configValidator.validate(config);

    // Assert
    assert.strictEqual(result.ok, true);
  });

  it('Does return error if ntlmHost contains path', function () {
    // Arrange
    config.ntlmHost = 'http://localhost:5000/search';

    // Act
    let result = configValidator.validate(config);

    // Assert
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.message, 'Invalid ntlmHost, must not contain any path or query (https://www.google.com is ok, https://www.google.com/search is not ok)');
  });

  it('Does return error if ntlmHost is incomplete', function () {
    // Arrange
    config.ntlmHost = 'localhost:5000';

    // Act
    let result = configValidator.validate(config);

    // Assert
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.message, 'Invalid ntlmHost, must be a valid URL (like https://www.google.com)');
  });
});

describe('configValidator username', function () {
  let config;

  beforeEach(function () {
    config = {
      ntlmHost: 'http://localhost:5000',
      username: 'nisse',
      password: 'manpwr'
    };
  });

  it('Valid username succeeds', function() {
    // Act
    let result = configValidator.validate(config);

    // Assert
    assert.strictEqual(result.ok, true);
  });

  it('Does return error if username is too long', function () {
    // Arrange
    config.username = 'a'.repeat(105);

    // Act
    let result = configValidator.validate(config);

    // Assert
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.message, 'Username contains invalid characters or is too long.');
  });

  it('Does return error if username contains invalid chars', function () {
    // Arrange
    config.username = 'a*a';

    // Act
    let result = configValidator.validate(config);

    // Assert
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.message, 'Username contains invalid characters or is too long.');
  });
});

describe('configValidator domain', function() {
  let config;

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
    let result = configValidator.validate(config);

    // Assert
    assert.strictEqual(result.ok, true);
  });

  it('Does return error if domain is too long', function () {
    // Arrange
    config.domain = 'a'.repeat(16);

    // Act
    let result = configValidator.validate(config);

    // Assert
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.message, 'Domain contains invalid characters or is too long.');
  });

  it('Does return error if domain contains invalid chars', function () {
    // Arrange
    config.domain = 'a*a';

    // Act
    let result = configValidator.validate(config);

    // Assert
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.message, 'Domain contains invalid characters or is too long.');
  });
});

describe('configValidator workstation', function() {
  let config;

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
    let result = configValidator.validate(config);

    // Assert
    assert.strictEqual(result.ok, true);
  });

  it('Does return error if workstation is too long', function () {
    // Arrange
    let workstation = 'a'.repeat(16);
    config.workstation = workstation;

    // Act
    let result = configValidator.validate(config);

    // Assert
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.message, 'Workstation contains invalid characters or is too long.');
  });

  it('Does return error if workstation contains invalid chars', function () {
    // Arrange
    let workstation = 'a*a';
    config.workstation = workstation;

    // Act
    let result = configValidator.validate(config);

    // Assert
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.message, 'Workstation contains invalid characters or is too long.');
  });

});

describe('configValidator required fields', function() {
  let config;

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
    let result = configValidator.validate(config);

    // Assert
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.message, 'Incomplete configuration. ntlmHost, username and password are required fields.');
  });

  it('Does return error if username is missing', function () {
    // Arrange
    delete config.username;

    // Act
    let result = configValidator.validate(config);

    // Assert
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.message, 'Incomplete configuration. ntlmHost, username and password are required fields.');
  });


  it('Does return error if password is missing', function () {
    // Arrange
    delete config.password;

    // Act
    let result = configValidator.validate(config);

    // Assert
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.message, 'Incomplete configuration. ntlmHost, username and password are required fields.');
  });
});
