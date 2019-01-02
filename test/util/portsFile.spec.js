const assert = require('assert');
const portsFile = require('../../src/util/portsFile');
const getPath = require('platform-folders');
const path = require('path');
const mockFs = require('mock-fs');
const fs = require('fs');

const portsFileName = 'cypress-ntlm-auth.port';
const notPortsFileName = 'dummy.port';
const portsFilePath = getPath.getDataHome();
const portsFileWithPath = path.join(getPath.getDataHome(), portsFileName);

function mockPortsFilePath() {
  let mockOptions = {};
  mockOptions[portsFilePath] = {};
  mockFs(mockOptions);
}

function mockPortsFile(content) {
  if (!content) { content = 'dummyPortsFile'; }

  let mockOptions = {};
  mockOptions[portsFilePath] = {};
  mockOptions[portsFilePath][portsFileName] = content;
  mockFs(mockOptions);
}

function mockDummyFile() {
  let mockOptions = {};
  mockOptions[portsFilePath] = {};
  mockOptions[portsFilePath][notPortsFileName] = 'dummyContent';
  mockFs(mockOptions);
}

function mockBadPath() {
  let mockOptions = {};
  mockOptions['anotherPath'] = {};
  mockOptions['anotherPath'][notPortsFileName] = 'dummyContent';
  mockFs(mockOptions);
}

describe('mock-fs validation', () => {
  beforeEach(() => {
    mockFs.restore(); // Removed fs mock
  });

  afterEach(() => {
    mockFs.restore(); // Removed fs mock
  });

  it('Mocked ports file exists', () => {
    // Arrange
    mockPortsFile();

    // Act
    var exists = fs.existsSync(portsFileWithPath);

    // Assert
    assert.equal(exists, true);
  });

  it('Not mocked ports file does not exist', () => {
    // Arrange
    mockDummyFile();

    // Act
    var exists = fs.existsSync(portsFileWithPath);

    // Assert
    assert.equal(exists, false);
  });

  it('Can delete mocked ports file', () => {
    // Arrange
    mockPortsFile();

    // Act
    fs.unlinkSync(portsFileWithPath);
    var exists = fs.existsSync(portsFileWithPath);

    // Assert
    assert.equal(exists, false);
  });

  it('Can write and read mocked ports file', () => {
    // Arrange
    mockPortsFilePath();

    // Act
    fs.writeFileSync(portsFileWithPath, 'dummy');
    var exists = fs.existsSync(portsFileWithPath);
    var content = fs.readFileSync(portsFileWithPath);

    // Assert
    assert.equal(exists, true);
    assert.equal(content, 'dummy');
  });

});

describe('portsFile delete operations', () => {
  beforeEach(() => {
    mockFs.restore(); // Removed fs mock
  });

  afterEach(() => {
    mockFs.restore(); // Removed fs mock
  });

  it('Does return error if the path to ports file does not exist', (done) => {
    // Arrange
    mockBadPath();

    // Act
    portsFile.deletePortsFile(function (err) {
      // Assert
      assert(err instanceof Error, 'We should get an Error.');
      assert.equal(err.message, 'Cannot delete ' + portsFileWithPath);
      done();
    });
  });

  it('Does return error if the ports file does not exist', (done) => {
    // Arrange
    mockDummyFile();

    // Act
    portsFile.deletePortsFile(function (err) {
      // Assert
      assert(err instanceof Error, 'We should get an Error.');
      assert.equal(err.message, 'Cannot delete ' + portsFileWithPath);
      done();
    });
  });

  it('Does delete ports file', (done) => {
    // Arrange
    mockPortsFile();

    // Act
    portsFile.deletePortsFile(function (err) {
      // Assert
      assert(!err, 'We should not get an Error.');
      assert.equal(fs.existsSync(portsFileWithPath), false, 'Cannot delete ' + portsFileWithPath);
      done();
    });
  });
});

describe('portsFile save operations', () => {
  beforeEach(() => {
    mockFs.restore(); // Removed fs mock
  });

  afterEach(() => {
    mockFs.restore(); // Removed fs mock
  });

  it('Does return error if the path to ports file does not exist', (done) => {
    // Arrange
    mockBadPath();

    // Act
    portsFile.savePortsFile({dummy: 'dummy'}, function (err) {
      // Assert
      assert(err instanceof Error, 'We should get an Error.');
      assert.equal(err.message, 'Cannot create ' + portsFileWithPath);
      done();
    });
  });

  it('Can save the ports file', (done) => {
    // Arrange
    mockPortsFilePath();

    // Act
    portsFile.savePortsFile({dummy: 'dummy'}, function (err) {
      // Assert
      assert(!err, 'We should not get an Error.');
      assert.equal(fs.existsSync(portsFileWithPath), true, 'Cannot save ' + portsFileWithPath);
      done();
    });
  });
});

describe('portsFile exists operations', () => {
  beforeEach(() => {
    mockFs.restore(); // Removed fs mock
  });

  afterEach(() => {
    mockFs.restore(); // Removed fs mock
  });

  it('Returns false if ports file does not exist', () => {
    // Arrange
    mockBadPath();

    // Act
    var exists = portsFile.portsFileExists();

    // Assert
    assert.equal(exists, false);
  });

  it('Returns true if ports file exists', () => {
    // Arrange
    mockPortsFile();

    // Act
    var exists = portsFile.portsFileExists();

    // Assert
    assert.equal(exists, true);
  });
});

describe('portsFile parsing operations', () => {
  beforeEach(() => {
    mockFs.restore(); // Removed fs mock
  });

  afterEach(() => {
    mockFs.restore(); // Removed fs mock
  });

  it('Returns error if port file content is not JSON', (done) => {
    // Arrange
    mockPortsFile();

    // Act
    portsFile.parsePortsFile(function (ports, err) {
      // Assert
      assert(err instanceof Error, 'We should get an Error.');
      assert.equal(err.message, 'Unexpected token d in JSON at position 0');
      done();
    });
  });

  it('Returns error if no file exists', (done) => {
    // Arrange
    mockPortsFilePath();
    
    // Act
    portsFile.parsePortsFile(function (ports, err) {
      // Assert
      assert(err instanceof Error, 'We should get an Error.');
      assert.equal(err.message, 'cypress-ntlm-auth proxy does not seem to be running. It must be started before cypress. Please see the docs.' +portsFileWithPath);
      done();
    });
  });

  it('Returns error if port file content is invalid', (done) => {
    // Arrange
    mockPortsFile(JSON.stringify({ dummy: 'dummy' }));

    // Act
    portsFile.parsePortsFile(function (ports, err) {
      // Assert
      assert(err instanceof Error, 'We should get an Error.');
      assert.equal(err.message, 'Cannot parse ' + portsFileWithPath);
      done();
    });
  });

  it('Returns error if port file content is missing configApiUrl', (done) => {
    // Arrange
    mockPortsFile(JSON.stringify({ ntlmProxyUrl: 'dummy' }));

    // Act
    portsFile.parsePortsFile(function (ports, err) {
      // Assert
      assert(err instanceof Error, 'We should get an Error.');
      assert.equal(err.message, 'Cannot parse ' + portsFileWithPath);
      done();
    });
  });

  it('Returns error if port file content is missing ntlmProxyUrl', (done) => {
    // Arrange
    mockPortsFile(JSON.stringify({ configApiUrl: 'dummy' }));

    // Act
    portsFile.parsePortsFile(function (ports, err) {
      // Assert
      assert(err instanceof Error, 'We should get an Error.');
      assert.equal(err.message, 'Cannot parse ' + portsFileWithPath);
      done();
    });
  });

  it('Returns error if ntlmProxyUrl cannot be parsed as an url', (done) => {
    // Arrange
    mockPortsFile(JSON.stringify({ configApiUrl: 'http://localhost:1234', ntlmProxyUrl: 'dummy' }));

    // Act
    portsFile.parsePortsFile(function (ports, err) {
      // Assert
      assert(err instanceof Error, 'We should get an Error.');
      assert.equal(err.message, 'Cannot parse ' + portsFileWithPath);
      done();
    });
  });

  it('Returns error if configApiUrl cannot be parsed as an url', (done) => {
    // Arrange
    mockPortsFile(JSON.stringify({ configApiUrl: 'dummy', ntlmProxyUrl: 'http://localhost:1234' }));

    // Act
    portsFile.parsePortsFile(function (ports, err) {
      // Assert
      assert(err instanceof Error, 'We should get an Error.');
      assert.equal(err.message, 'Cannot parse ' + portsFileWithPath);
      done();
    });
  });

  it('Returns object if file content is ok', (done) => {
    // Arrange
    mockPortsFile(JSON.stringify({ configApiUrl: 'http://127.0.0.1:1235', ntlmProxyUrl: 'http://localhost:1234' }));

    // Act
    portsFile.parsePortsFile(function (ports, err) {
      // Assert
      assert(!err, 'We should not get an Error.');
      assert.equal(ports.ntlmProxyUrl, 'http://localhost:1234');
      assert.equal(ports.configApiUrl, 'http://127.0.0.1:1235');
      done();
    });
  });
});
