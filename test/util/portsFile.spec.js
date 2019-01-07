const assert = require('assert');
const portsFile = require('../../src/util/portsFile');
const path = require('path');
const fs = require('fs');
const sinon = require('sinon');

const appDataPath = require('appdata-path');
const portsFileName = 'cypress-ntlm-auth.port';
const portsFileWithPath = path.join(appDataPath('cypress-ntlm-auth'), portsFileName);

describe('portsFile delete operations', function () {

  let unlinkStub;

  beforeEach(function () {
    if (unlinkStub) {
      unlinkStub.restore();
    }
    unlinkStub = sinon.stub(fs, 'unlink');
  });

  after(function () {
    if (unlinkStub) {
      unlinkStub.restore();
    }
  });

  it('Does return error if fs.unlink returns an error', function (done) {
    // Arrange
    unlinkStub.callsFake(function (portsFile, callback) {
      return callback(new Error('test'));
    });

    // Act
    portsFile.delete(function (err) {
      // Assert
      assert(unlinkStub.calledOnceWith(portsFileWithPath));
      assert(err instanceof Error, 'We should get an Error.');
      assert.equal(err.message, 'Cannot delete ' + portsFileWithPath);
      done();
    });
  });

  it('Does not return error when fs.unlink succeeds', function (done) {
    // Arrange
    unlinkStub.callsFake(function (portsFile, callback) {
      return callback();
    });

    // Act
    portsFile.delete(function (err) {
      // Assert
      assert(unlinkStub.calledOnceWith(portsFileWithPath));
      assert(!err, 'We should not get an Error.');
      done();
    });
  });
});

describe('portsFile save operations', function () {
  let writeStub;

  beforeEach(function () {
    if (writeStub) {
      writeStub.restore();
    }
    writeStub = sinon.stub(fs, 'writeFile');
  });

  after(function () {
    if (writeStub) {
      writeStub.restore();
    }
  });

  it('Does return error if fs.writeFile returns error', function (done) {
    // Arrange
    writeStub.callsFake(function (portsFile, data, callback) {
      return callback(new Error('test'));
    });
    let data = { dummy: 'dummy' };

    // Act
    portsFile.save(data, function (err) {
      // Assert
      assert(writeStub.calledOnceWith(portsFileWithPath));
      assert(err instanceof Error, 'We should get an Error.');
      assert.equal(err.message, 'Cannot create ' + portsFileWithPath);
      done();
    });
  });

  it('Does not return error if fs.writeFile succeeds', function (done) {
    // Arrange
    writeStub.callsFake(function (portsFile, data, callback) {
      return callback();
    });
    let data = { dummy: 'dummy' };

    // Act
    portsFile.save(data, function (err) {
      // Assert
      assert(writeStub.calledOnceWith(portsFileWithPath, JSON.stringify(data)));
      assert(!err, 'We should not get an Error.');
      done();
    });
  });
});

describe('portsFile exists operations', function () {
  let existsStub;

  beforeEach(function () {
    if (existsStub) {
      existsStub.restore();
    }
    existsStub = sinon.stub(fs, 'existsSync');
  });

  after(function () {
    if (existsStub) {
      existsStub.restore();
    }
  });

  it('Returns false if ports file does not exist', function () {
    // Arrange
    existsStub.returns(false);

    // Act
    var exists = portsFile.exists();

    // Assert
    assert.equal(exists, false);
    assert(existsStub.calledOnceWith(portsFileWithPath));
  });

  it('Returns true if ports file exists', function () {
    // Arrange
    existsStub.returns(true);

    // Act
    var exists = portsFile.exists();

    // Assert
    assert.equal(exists, true);
    assert(existsStub.calledOnceWith(portsFileWithPath));
  });
});

describe('portsFile parsing operations', function () {
  let existsStub;
  let readFileStub;

  beforeEach(function () {
    if (existsStub) {
      existsStub.restore();
    }
    existsStub = sinon.stub(fs, 'existsSync');
    if (readFileStub) {
      readFileStub.restore();
    }
    readFileStub = sinon.stub(fs, 'readFileSync');
  });

  after(function () {
    if (existsStub) {
      existsStub.restore();
    }
    if (readFileStub) {
      readFileStub.restore();
    }
  });

  it('Returns error if port file content is not JSON', function (done) {
    // Arrange
    existsStub.returns(true);
    readFileStub.callsFake(function () {
      return '<this is not JSON>';
    });

    // Act
    portsFile.parse(function (ports, err) {
      // Assert
      assert(err instanceof Error, 'We should get an Error.');
      assert.equal(err.message, 'Unexpected token < in JSON at position 0');
      assert(existsStub.calledOnceWith(portsFileWithPath));
      assert(readFileStub.calledOnceWith(portsFileWithPath));
      done();
    });
  });

  it('Returns error if no file exists', function (done) {
    // Arrange
    existsStub.returns(false);

    // Act
    portsFile.parse(function (ports, err) {
      // Assert
      assert(err instanceof Error, 'We should get an Error.');
      assert.equal(err.message, 'cypress-ntlm-auth proxy does not seem to be running. It must be started before cypress. Please see the docs.' + portsFileWithPath);
      assert(existsStub.calledOnceWith(portsFileWithPath));
      assert(readFileStub.notCalled);
      done();
    });
  });

  it('Returns error if port file content is invalid', function (done) {
    // Arrange
    existsStub.returns(true);
    readFileStub.callsFake(function () {
      return JSON.stringify({ dummy: 'dummy' });
    });

    // Act
    portsFile.parse(function (ports, err) {
      // Assert
      assert(err instanceof Error, 'We should get an Error.');
      assert.equal(err.message, 'Cannot parse ' + portsFileWithPath);
      assert(existsStub.calledOnceWith(portsFileWithPath));
      assert(readFileStub.calledOnceWith(portsFileWithPath));
      done();
    });
  });

  it('Returns error if port file content is missing configApiUrl', function (done) {
    // Arrange
    existsStub.returns(true);
    readFileStub.callsFake(function () {
      return JSON.stringify({ ntlmProxyUrl: 'dummy' });
    });

    // Act
    portsFile.parse(function (ports, err) {
      // Assert
      assert(err instanceof Error, 'We should get an Error.');
      assert.equal(err.message, 'Cannot parse ' + portsFileWithPath);
      assert(existsStub.calledOnceWith(portsFileWithPath));
      assert(readFileStub.calledOnceWith(portsFileWithPath));
      done();
    });
  });

  it('Returns error if port file content is missing ntlmProxyUrl', function (done) {
    // Arrange
    existsStub.returns(true);
    readFileStub.callsFake(function () {
      return JSON.stringify({ configApiUrl: 'dummy' });
    });

    // Act
    portsFile.parse(function (ports, err) {
      // Assert
      assert(err instanceof Error, 'We should get an Error.');
      assert.equal(err.message, 'Cannot parse ' + portsFileWithPath);
      assert(existsStub.calledOnceWith(portsFileWithPath));
      assert(readFileStub.calledOnceWith(portsFileWithPath));
      done();
    });
  });

  it('Returns error if ntlmProxyUrl cannot be parsed as an url', function (done) {
    // Arrange
    existsStub.returns(true);
    readFileStub.callsFake(function () {
      return JSON.stringify({ configApiUrl: 'http://localhost:1234', ntlmProxyUrl: 'dummy' });
    });

    // Act
    portsFile.parse(function (ports, err) {
      // Assert
      assert(err instanceof Error, 'We should get an Error.');
      assert.equal(err.message, 'Cannot parse ' + portsFileWithPath);
      assert(existsStub.calledOnceWith(portsFileWithPath));
      assert(readFileStub.calledOnceWith(portsFileWithPath));
      done();
    });
  });

  it('Returns error if configApiUrl cannot be parsed as an url', function (done) {
    // Arrange
    existsStub.returns(true);
    readFileStub.callsFake(function () {
      return JSON.stringify({ configApiUrl: 'dummy', ntlmProxyUrl: 'http://localhost:1234' });
    });

    // Act
    portsFile.parse(function (ports, err) {
      // Assert
      assert(err instanceof Error, 'We should get an Error.');
      assert.equal(err.message, 'Cannot parse ' + portsFileWithPath);
      assert(existsStub.calledOnceWith(portsFileWithPath));
      assert(readFileStub.calledOnceWith(portsFileWithPath));
      done();
    });
  });

  it('Returns object if file content is ok', function (done) {
    // Arrange
    existsStub.returns(true);
    readFileStub.callsFake(function () {
      return JSON.stringify({ configApiUrl: 'http://127.0.0.1:1235', ntlmProxyUrl: 'http://localhost:1234' });
    });

    // Act
    portsFile.parse(function (ports, err) {
      // Assert
      assert(!err, 'We should not get an Error.');
      assert.equal(ports.ntlmProxyUrl, 'http://localhost:1234');
      assert.equal(ports.configApiUrl, 'http://127.0.0.1:1235');
      assert(existsStub.calledOnceWith(portsFileWithPath));
      assert(readFileStub.calledOnceWith(portsFileWithPath));
      done();
    });
  });
});
