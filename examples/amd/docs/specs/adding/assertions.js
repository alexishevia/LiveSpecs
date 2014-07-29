/* -- assert result is correct --
 you can use whatever assertion mechanism you want, as long as:
  - you raise an error on failure
  - you call parent.postMessage('complete') on success
*/

var assert = require('chai').assert;
assert.equal(result, 7);

parent.postMessage('complete', '*');
