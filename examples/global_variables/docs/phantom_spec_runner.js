/*global phantom:false*/

'use strict';

var page = require('webpage').create();
var url = 'http://localhost:8000/amd/docs/spec_runner.html';

page.onConsoleMessage = function (msg) {
  try{
    msg = JSON.parse(msg);
  } catch(e) {
    console.log(e);
    return;
  }

  if(msg.info){
    console.log('\n' + msg.info);
  }
  if(msg.done){
    console.log('\n' + msg.totalCount + ' specs total. All specs passed.');
    return phantom.exit(0);
  }
  if(msg.error){
    console.log('\nERROR: One or more specs are failing.\n');
    console.log('File: ' + msg.error.id + '\n');
    console.log('Error: ' + msg.error.message + '\n');
    return phantom.exit(1);
  }
};

page.onError = function(err){
  console.log('\nERROR while executing specs\n\n' + err + '\n');
  return phantom.exit(1);
};

page.open(url, function(status){
  if(status === 'fail'){
    console.log('\nERROR: failed to open url ' + url + '\n');
    return phantom.exit(1);
  }
});
