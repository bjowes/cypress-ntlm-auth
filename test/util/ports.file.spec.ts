//const proxyquire = require('proxyquire').noCallThru();

import fse, { mkdirp } from 'fs-extra';
import { debug as debugInit } from 'debug';
const debug = debugInit('cypress:plugin:ntlm-auth');

import assert from 'assert';
import sinon from 'sinon';
import chai from 'chai';
import path from 'path';
import  url from 'url';
import appDataPath from 'appdata-path';
import { PortsFile } from '../../src/models/ports.file.model';
import { PortsFileHandler } from '../../src/util/ports.file';
import { isExportDeclaration, textChangeRangeIsUnchanged } from 'typescript';

const _portsFileName = 'cypress-ntlm-auth.port';
const _portsFileFolder = appDataPath('cypress-ntlm-auth');
const _portsFileWithPath = path.join(_portsFileFolder, _portsFileName);

describe('PortsFileHandler', function () {
  let existsStub = sinon.stub(fse, 'existsSync');

  describe('delete operations', function () {
    let unlinkStub = sinon.stub(fse, 'unlink');

    beforeEach(function () {
      if (unlinkStub) {
        unlinkStub.restore();
      }
      unlinkStub = sinon.stub(fse, 'unlink');
    });

    after(function () {
      if (unlinkStub) {
        unlinkStub.restore();
      }
    });

    it('Does return error if fse.unlink returns an error', async function () {
      // Arrange
      unlinkStub.throws('cannot delete');

      // Act & Assert
      try {
        await PortsFileHandler.delete();
        chai.assert.fail('should throw');
      } catch (err) {
        chai.expect(err).to.be.a('Error');
        let error = err as Error;
        chai.expect(err.name).to.be.equal('cannot delete');
        assert(unlinkStub.calledOnceWith(_portsFileWithPath));
      }
    });

    it('Does not return error when fs.unlink succeeds', async function () {
      // Arrange

      // Act
      await PortsFileHandler.delete();
      assert(unlinkStub.calledOnceWith(_portsFileWithPath));
    });
  });

  describe('save operations', function () {
    let mkdirpStub = sinon.stub(fse, 'mkdirp');
    let writeJsonStub = sinon.stub(fse, 'writeJson');

    beforeEach(function () {
      if (writeJsonStub) {
        writeJsonStub.restore();
      }
      writeJsonStub = sinon.stub(fse, 'writeJson');
      if (mkdirpStub) {
        mkdirpStub.restore();
      }
      mkdirpStub = sinon.stub(fse, 'mkdirp');
    });

    after(function () {
      if (writeJsonStub) {
        writeJsonStub.restore();
      }
      if (mkdirpStub) {
        mkdirpStub.restore();
      }
    });

    it('Does throw if mkdirp returns error', async function () {
      // Arrange
      mkdirpStub.throws('cannot create dir');
      let data = { configApiUrl: 'dummy', ntlmProxyUrl: 'dummy' } as PortsFile;

      // Act & Assert
      try {
        await PortsFileHandler.save(data);
        chai.assert.fail('should throw');
      } catch (err) {
        chai.expect(err).to.be.a('Error');
        chai.expect(err.name).to.be.equal('cannot create dir');
        chai.expect(mkdirpStub.getCall(0).args[0]).to.be.equal(_portsFileFolder);
        assert(writeJsonStub.notCalled);
      }
    });

    it('Does throw if fse.writeJsonFile returns error', async function () {
      // Arrange
      writeJsonStub.throws('cannot write file');
      let data = { configApiUrl: 'dummy', ntlmProxyUrl: 'dummy' } as PortsFile;

      // Act & Assert
      try {
        await PortsFileHandler.save(data);
        chai.assert.fail('should throw');
      } catch (err) {
        chai.expect(err).to.be.a('Error');
        chai.expect(err.name).to.be.equal('cannot write file');
        chai.expect(mkdirpStub.getCall(0).args[0]).to.be.equal(_portsFileFolder);
        chai.expect(writeJsonStub.getCall(0).args[0]).to.be.equal(_portsFileWithPath);
        chai.expect(writeJsonStub.getCall(0).args[1]).to.be.equal(data);
      }
    });

    it('Does not throw if fse.writeJsonFile succeeds', async function () {
      // Arrange
      let data = { configApiUrl: 'dummy', ntlmProxyUrl: 'dummy' } as PortsFile;

      // Act & Assert
      await PortsFileHandler.save(data);
      chai.expect(mkdirpStub.getCall(0).args[0]).to.be.equal(_portsFileFolder);
      chai.expect(writeJsonStub.getCall(0).args[0]).to.be.equal(_portsFileWithPath);
      chai.expect(writeJsonStub.getCall(0).args[1]).to.be.equal(data);
    });
  });

  describe('exists operations', function () {

    beforeEach(function () {
      if (existsStub) {
        existsStub.restore();
      }
      existsStub = sinon.stub(fse, 'existsSync');
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
      var exists = PortsFileHandler.exists();

      // Assert
      assert.equal(exists, false);
      chai.expect(existsStub.getCall(0).args[0]).to.be.equal(_portsFileWithPath);
    });

    it('Returns true if ports file exists', function () {
      // Arrange
      existsStub.returns(true);

      // Act
      var exists = PortsFileHandler.exists();

      // Assert
      assert.equal(exists, true);
      chai.expect(existsStub.getCall(0).args[0]).to.be.equal(_portsFileWithPath);
    });
  });

  describe('parsing operations', function ()
  {
    let readFileStub = sinon.stub(fse, 'readJsonSync');

    beforeEach(function () {
      if (existsStub) {
        existsStub.restore();
      }
      existsStub = sinon.stub(fse, 'existsSync');
      if (readFileStub) {
        readFileStub.restore();
      }
      readFileStub = sinon.stub(fse, 'readJsonSync');
    });

    after(function () {
      if (existsStub) {
        existsStub.restore();
      }
      if (readFileStub) {
        readFileStub.restore();
      }
    });

    it('Returns error if port file content is not JSON', function () {
      // Arrange
      existsStub.returns(true);
      readFileStub.returns('<this is not JSON>');

      // Act
      try {
        let ports = PortsFileHandler.parse();
        chai.assert.fail('should throw');
      } catch (err) {
        chai.expect(err).to.be.a('Error');
        chai.expect(err.message).to.be.equal('Cannot parse ports file ' + _portsFileWithPath);
        chai.expect(existsStub.getCall(0).args[0]).to.be.equal(_portsFileWithPath);
        chai.expect(readFileStub.getCall(0).args[0]).to.be.equal(_portsFileWithPath);

      }
    });

    it('Returns error if no file exists', function () {
      // Arrange
      existsStub.returns(false);

      // Act & Assert
      try {
        let ports = PortsFileHandler.parse();
        chai.assert.fail('should throw');
      } catch (err) {
        chai.expect(err).to.be.a('Error');
        chai.expect(err.message).to.be.equal('cypress-ntlm-auth proxy does not seem to be running. It must be started before cypress. Please see the docs.' + _portsFileWithPath);
        chai.expect(existsStub.getCall(0).args[0]).to.be.equal(_portsFileWithPath);
        chai.expect(readFileStub.notCalled);
      }
    });

    it('Returns error if port file content is invalid', function () {
      // Arrange
      existsStub.returns(true);
      readFileStub.returns({ dummy: 'dummy' });

      // Act & Assert
      try {
        let ports = PortsFileHandler.parse();
        chai.assert.fail('should throw');
      } catch (err) {
        chai.expect(err).to.be.a('Error');
        chai.expect(err.message).to.be.equal('Cannot parse ports file ' + _portsFileWithPath);
        chai.expect(existsStub.getCall(0).args[0]).to.be.equal(_portsFileWithPath);
        chai.expect(readFileStub.getCall(0).args[0]).to.be.equal(_portsFileWithPath);
      }
    });

    it('Returns error if port file content is missing configApiUrl', function () {
      // Arrange
      existsStub.returns(true);
      readFileStub.returns({ ntlmProxyUrl: 'dummy' });

      // Act & Assert
      try {
        let ports = PortsFileHandler.parse();
        chai.assert.fail('should throw');
      } catch (err) {
        chai.expect(err).to.be.a('Error');
        chai.expect(err.message).to.be.equal('Cannot parse ports file ' + _portsFileWithPath);
        chai.expect(existsStub.getCall(0).args[0]).to.be.equal(_portsFileWithPath);
        chai.expect(readFileStub.getCall(0).args[0]).to.be.equal(_portsFileWithPath);
      }
    });

    it('Returns error if port file content is missing ntlmProxyUrl', function () {
      // Arrange
      existsStub.returns(true);
      readFileStub.returns({ configApiUrl: 'dummy' });

      // Act & Assert
      try {
        let ports = PortsFileHandler.parse();
        chai.assert.fail('should throw');
      } catch (err) {
        chai.expect(err).to.be.a('Error');
        chai.expect(err.message).to.be.equal('Cannot parse ports file ' + _portsFileWithPath);
        chai.expect(existsStub.getCall(0).args[0]).to.be.equal(_portsFileWithPath);
        chai.expect(readFileStub.getCall(0).args[0]).to.be.equal(_portsFileWithPath);
      }
    });

    it('Returns error if ntlmProxyUrl cannot be parsed as an url', function () {
      // Arrange
      existsStub.returns(true);
      readFileStub.returns({ configApiUrl: 'http://localhost:1234', ntlmProxyUrl: 'dummy' });

      // Act & Assert
      try {
        let ports = PortsFileHandler.parse();
        chai.assert.fail('should throw');
      } catch (err) {
        chai.expect(err).to.be.a('Error');
        chai.expect(err.message).to.be.equal('Invalid ntlmProxyUrl in ports file '+ _portsFileWithPath);
        chai.expect(existsStub.getCall(0).args[0]).to.be.equal(_portsFileWithPath);
        chai.expect(readFileStub.getCall(0).args[0]).to.be.equal(_portsFileWithPath);
      }
    });

    it('Returns error if configApiUrl cannot be parsed as an url', function () {
      // Arrange
      existsStub.returns(true);
      readFileStub.returns({ configApiUrl: 'dummy', ntlmProxyUrl: 'http://localhost:1234' });

      // Act & Assert
      try {
        let ports = PortsFileHandler.parse();
        chai.assert.fail('should throw');
      } catch (err) {
        chai.expect(err).to.be.a('Error');
        chai.expect(err.message).to.be.equal('Invalid configApiUrl in ports file '+ _portsFileWithPath);
        chai.expect(existsStub.getCall(0).args[0]).to.be.equal(_portsFileWithPath);
        chai.expect(readFileStub.getCall(0).args[0]).to.be.equal(_portsFileWithPath);
      }
    });

    it('Returns object if file content is ok', function () {
      // Arrange
      existsStub.returns(true);
      readFileStub.returns({ configApiUrl: 'http://127.0.0.1:1235', ntlmProxyUrl: 'http://localhost:1234' });

      // Act & Assert
      let ports = PortsFileHandler.parse();
      chai.expect(existsStub.getCall(0).args[0]).to.be.equal(_portsFileWithPath);
      chai.expect(readFileStub.getCall(0).args[0]).to.be.equal(_portsFileWithPath);
      chai.expect(ports.ntlmProxyUrl).to.be.equal('http://localhost:1234');
      chai.expect(ports.configApiUrl).to.be.equal('http://127.0.0.1:1235');
    });
  });
});
