var CalcJS = require('calcjs');
var $ = require('jquery');

var result = CalcJS.add(4,3);

$('body').append('Result is: ' + result);
