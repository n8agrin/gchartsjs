/*
Copyright (c) <2008> <Nate Agrin: n8agrin@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

// ...on to the code!
(function(){

// Simplified Inheritance,
// Courtesy of http://phrogz.net/js/classes/OOPinJS2.html
Function.prototype.inheritsFrom = function(parentClassOrObject) { 
  if (parentClassOrObject.constructor == Function) { 
    //Normal Inheritance 
    this.prototype = new parentClassOrObject;
    this.prototype.constructor = this;
    this.prototype.parent = parentClassOrObject.prototype;
  } 
  else { 
    //Pure Virtual Inheritance 
    this.prototype = parentClassOrObject;
    this.prototype.constructor = this;
    this.prototype.parent = parentClassOrObject;
  } 
  return this;
}
  
  
//
// gchartjs, a Javascript dynamo for the Google Charts API
// **js syntax largely inspired by jQuery and Prototype
//
// @author: Nate Agrin
// @date: 4-16-08
// @version: 0.1
// @license: MIT
// 

//
// Notes:
//

// Types of charts to be supported:
// Bar chart
// Line chart
// Sparkline
// Radar chart
// Scatter plot
// Venn diagram
// Pie chart
// Google-o-meter
// Maps

//
// Basic requirements
// Need a base class to handle some url encoding
// base api url is:
// http://chart.apis.google.com/chart?
// required elements are
// chart_size
// chart_data
// chart_type
//

// parameters
// Data           chd=t:,s:,e:
// Data scaling   chds=
// Chart size     chs=
// Chart type     cht=

// Chart virtual object
var Chart = {
  VERSION:     '0.1',
  BASE_URL:    'http://chart.apis.google.com/chart?',
  CHART_TYPES: ['lc',    // line chart
                'lxy',   // line chart xy
                'ls',    // sparkline
                'bhs',   // bar chart horizontal (single)
                'bvs',   // bar chart vertical (single)
                'bhg',   // bar chart horizontal (grouped)
                'bvg',   // bar chart vertical (grouped)
                'p',     // pie chart (2d)
                'p3',    // pie chart (3d)
                'v',     // Venn diagram
                's',     // scatter plots
                'r',     // radar chart (straight lines)
                'rs',    // radar chart (splines)
                't',     // map
                'gom'],  // Google-o-meter!
  
  height:      0,
  width:       0,
  urlParts:    [],
  type:        '',
  dataSets:    [],
  
  // Google Charts have three requirements:
  // chart type, chart size, and data.
  // If any of these are missing GChart will throw an exception.
  
  //
  // Chart type methods
  //
  
  // Check to make sure the type is valid. This should never really be an
  // issue because the subclasses should generally implement the type.
  checkType: function() {
    for (i in this.CHART_TYPES) {
      if (this.CHART_TYPES[i] == this.type) return true;
    }
    throw "Chart type '" + this.type + "' is not currently supported.";
  },
  
  // Return the type in a Google Chart formated way.
  getType: function() {
    if (this.checkType()) return 'cht=' + this.type;
  },
  
  //
  // Chart size methods
  //
  
  // Ensure the area of the chart is no larger than 300,000 pixels and no
  // smaller than 0 pixels.
  checkSize: function() {
    if (this.height * this.width > 300000 ||
        this.height * this.width == 0) {
      throw "Chart cannot be larger than 300,000 pixels or 0 pixels";
    }
    return true;
  },
  
  // Returns chart size in a Google Chart formated way.
  getSize: function() {
    if (this.checkSize()) return 'chs=' + this.width + 'x' + this.height;
  },
  
  //
  // Chart data methods
  //
  
  // Add a data set object to the dataSet array
  addData: function(data) {
    this.dataSets.push(data);
  },
  
  // data can really only have line coloring and the labeling
  getDataColors: function() {
    var chco = [];
    
    // first go through and handle the base cases
    for (var i in this.dataSets) {
      if (this.dataSets[i].options['color'] != undefined) {
        chco.push(this.dataSets[i].options['color']);
      }
      // add in a blank space in case other dataSets have colors
      else if (chco.length > 0) {
        chco.push('');
      }
    }

    // handle the colors as 2d arrays and single strings
    if (chco.length > 0 && chco[0].constructor == Array) {
      return 'chco=' + chco.join('|');
    }
    else if (chco.length > 0){
      return 'chco=' + chco.join(',');
    }
    return '';
  },
  
  getDataLabels: function() {
    var chdl = [];
    
    for (var i in this.dataSets) {    
      if (this.dataSets[i].options['label'] != undefined) {
       chdl.push(this.dataSets[i].options['label']); 
      }
      // if they've added a label, add something as a spacer
      else if (chdl.length > 0) {
        chdl.push('');
      }
    }
    
    if (chdl.length > 0) {
      return 'chdl=' + chdl.join(',');
    }
    return '';
  },

  // Data encoding  
  noEncoding: function() {
    var flattenedArray = [];
    for (var i in this.dataSets) {
      flattenedArray.push(this.dataSets[i].data.join(','));
    }
    return 'chd=t:' + flattenedArray.join('|');
  },
  
  simpleEncoding: function() {},
  
  enhancedEncoding: function() {},

  //
  // Output methods
  //
  
  // Return the url in an html safe (&amp;) or unsafe (&) format.
  // @encoding can receive null, simple, or enhanced to encode the data
  // in one of the three formats.
  toUrl: function(encoding, safe) {
    encoding = encoding || null;
    safe     = safe     || false;
    
    // set the base url
    var url = [this.BASE_URL];
    
    // handle the type
    url.push(this.getType());
    
    // handle the data
    if (encoding == null) {
      url.push(this.noEncoding());
    }
    
    // get data styling
    url.push(this.getDataColors());
    
    // handle the labels
    url.push(this.getDataLabels());
    
    // handle the chart styling
    // TODO
    
    // get the size of the chart
    url.push(this.getSize());

    return safe ? url.join('&amp;') : url.join('&');
  },
  
  // Return an img DOM element
  toImg: function() {
    throw "Not yet implemented";
  }
};

// GChart parent object
var GChart = window.GChart = function(options) {
  options = options || {};
  this.height = options['height'] || this.height;
  this.width  = options['width']  || this.width;
  this.type   = options['type']   || this.type;
}
GChart.inheritsFrom(Chart);

// LineChart object
GChart.LineChart = function(options) {
  this.parent.constructor.apply(this, arguments);
  this.type = options['type'] || 'lc';
}
GChart.LineChart.inheritsFrom(GChart);

// LineChartXY object
GChart.LineChartXY = function(options) {
  this.parent.constructor.apply(this, arguments);
  this.type = options['type'] || 'lxy';
}
GChart.LineChartXY.inheritsFrom(GChart);

// Data object which holds an internal array of data points and a hash of
// sytle options which include:
// {
//  color: ['000000'] // equivalent to chco=000000
//  label: 'foo'      // equivalent to chdl=foo or chl=foo for pie charts
// }
GChart.Data = function(data, options) {
  this.data    = data    || [];
  this.options = options || {};
};

})(); // end of gchartjs :)