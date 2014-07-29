# LiveSpecs as an AMD module
This is an example project that shows how to use LiveSpecs to document and test your JS code.

The code we'll be testing is [calc.js](https://github.com/alexishevia/LiveSpecs/blob/master/examples/amd/calc.js), a very basic calculator library.

## How to run
Start a local server and open the file [docs/index.html](https://github.com/alexishevia/LiveSpecs/blob/master/examples/amd/docs/index.html).

Click on the 'Try it out!' buttons to see the test output. You can also modify the code and click 'Try it out!' to see how the library would behave with different inputs.

## Running all specs
If you want to see all your specs running, open [docs/spec_runner.html](https://github.com/alexishevia/LiveSpecs/blob/master/examples/amd/docs/spec_runner.html).

## Running all specs in Phantom.js
I've included a sample [phantom_spec_runner.js](https://github.com/alexishevia/LiveSpecs/blob/master/examples/amd/docs/phantom_spec_runner.js) which you can use to run all your specs as part of a build process. You will need to have [phantomjs](http://phantomjs.org/) installed and the local server with the exmample code up and running. Then just run `phantom docs/phantom_spec_runner.js`. Note: you might have to modify the `url` value of phantom_spec_runner if your server is running on a port different than 8000.
