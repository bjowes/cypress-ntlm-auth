let _cypress = undefined;

/**
 * Dynamically resolve cypress to verify that it is installed
 * @returns Resolved cypress module
 */
function cypress() {
  if (_cypress === undefined) {
    try {
      const canResolve = require.resolve("cypress");
      if (canResolve !== null && canResolve !== undefined) {
        _cypress = require("cypress");
      }
    } catch {
      _cypress = undefined;
    }
  }
  return _cypress;
}

module.exports = {
  cypress: cypress,
};
