odoo.define('base_geoengine.GeoengineRenderer', function (require) {
    "use strict";
    
    /**
     * The graph renderer turns the data from the graph model into a nice looking
     * svg chart.  This code uses the nvd3 library.
     *
     * Note that we use a custom build for the nvd3, with only the model we actually
     * use.
     */
    
    var AbstractRenderer = require('web.AbstractRenderer');
    var config = require('web.config');
    var core = require('web.core');
    var field_utils = require('web.field_utils');
    var QWeb = require('web.QWeb');
    
    var _t = core._t;
    var qweb = core.qweb;
    
    

    
    var GeoengineRenderer = AbstractRenderer.extend({
        template: "GeoengineView",
      
        init: function (parent, state, params) {
            this._super.apply(this, arguments);
            
        },
        -
       
    });
    return GeoengineRenderer;
    });
    