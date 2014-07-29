# LiveSpecs
Front end testing using live sample code.

LiveSpecs is based on 3 ideas:
- Every project needs good documentation and test coverage
- Documentation should never go out of date
- Code samples are the best type of documentation

With LiveSpecs you can write code samples that are be displayed on your documentation site, but also run as part of your test suite.

## Installation
Using bower:
```
bower install livespecs
```

Or you can just grab [livespecs.js](https://raw.githubusercontent.com/alexishevia/LiveSpecs/master/livespecs.js) and [livespecs.css](https://raw.githubusercontent.com/alexishevia/LiveSpecs/master/livespecs.css) and include them on your project.

** Live Specs is AMD compatible, but you can also use it as a global window variable.

## Dependencies
LiveSpecs depends on a bunch of libraries:
jquery, underscore, codemirror, easytabs, async

I'm currently working on reducing the amount of dependencies.

## Usage
First, create an index.json with all your specs
```
{
  "mySpecA": {
    "js": {
      "Example": "some_file_with_code.js",
      "Result": "some_file_with_assertions.js"
    }
  },
  "mySpecB": {
    "html": {
      "Markup": "some_html_file.html"
    },
    "js": {
      "Step 1": "file_with_code.js",
      "Step 2": "other_file_with_code.js",
      "Step 3": "file_with_more_code.js"
    }
  }
}
```

Then, create a template file for your specs.

This template file will be rendered inside an iFrame and must communicate with the test suite following this conventions:

1. When you're ready to receive content, call `parent.postMessage('ready', '*')`
1. The test suite will trigger a "message" event. The event object will contain a `data` property with the following content:
  - `evt.data.html` will have the content of all the HTML files you specified, concatenated as a single string
  - `evt.data.js` will have the content of all the JS files you specified, concatenated as a single string
1. If the spec failed, call `parent.postMessage({error: e}, '*')`
1. If the spec passed, call `parent.postMessage('complete', '*')`

This is a basic template file that you can use as a reference:
```
<script>
  // listen to parent's message for content
  window.addEventListener("message", function(e){
    var body = document.getElementsByTagName('body')[0];
    if(e.data.html){
      body.innerHTML += e.data.html;
    }
    if(e.data.js){
      var script = document.createElement('script');
      body.appendChild(script);
      script.innerHTML = e.data.js;
    }
  }, false);

  // notify parent of any error
  window.onerror = function(e){
    parent.postMessage({error: e}, '*');
  };

  // tell parent we're ready to receive content
  parent.postMessage('ready', '*');
</script>
```

On your documentation site, include one or more elements with a `data-spec-id` property. The value must match one of the keys you specified on the index.json file.
```
<p>Here I can explain how my library works.</p>
<div class="live-editor" data-spec-id="mySpecA"></div>
```

You can optionally define `data-hide-tabs` and `data-selected` attributes to control wether tabs should be hidden or not, and which tab should be selected by default.

```
<p>I want a LiveSpec with no tabs.</p>
<div class="live-editor" data-spec-id="mySpecA" data-hide-tabs="true"></div>

<p>And then a LiveSpec where the third tab is selected by default.</p>
<div class="live-editor" data-spec-id="mySpecA" data-selected="2"></div>
```

Convert them to LiveSpecs by running
```
new LiveSpecs({
  indexURL: '/path/to/index.json',
  templateURL: '/path/to/template'
})
  .toLiveEditor($(".live-editor"));
```

## Examples
Check out the [examples directory](https://github.com/alexishevia/LiveSpecs/tree/master/examples) for examples on how to use LiveSpecs, either as an AMD module or a global variable.

Or visit [http://livespecs.alexishevia.com/](http://livespecs.alexishevia.com) to see the examples running on the web.
