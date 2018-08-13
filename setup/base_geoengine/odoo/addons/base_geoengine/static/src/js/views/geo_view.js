odoo.define('base_geoengine.GeoengineView', function (require) {
    "use strict";
    
    /**
     * The Graph View is responsible to display a graphical (meaning: chart)
     * representation of the current dataset.  As of now, it is currently able to
     * display data in three types of chart: bar chart, line chart and pie chart.
     */
    
    var AbstractView = require('web.BasicView');
    var core = require('web.core');
    var QWeb = require('web.QWeb');
    var GeoengineModel = require('base_geoengine.GeoengineModel');
    var Controller = require('base_geoengine.GeoengineController');
    var GeoengineRenderer = require('base_geoengine.GeoengineRenderer');
    var view_registry = require('web.view_registry');

    
    var _t = core._t;
    var _lt = core._lt;
    
    var GeoengineView = AbstractView.extend({
        display_name: _lt('Geoengine'),
        icon: 'fa-map-o',
        viewType: 'geoengine',
        // cssLibs: [
        //     '/base_geoengine/static/lib/nvd3/nv.d3.css'
        // ],
        // jsLibs: [
        //     '/base_geoengine/static/lib/nvd3/d3.v3.js',
        //     '/base_geoengine/static/lib/nvd3/nv.d3.js',
        //     '/base_geoengine/static/src/js/libs/nvd3.js'
        // ],
        config: {
            Model: GeoengineModel,
            Controller: Controller,
            Renderer: GeoengineRenderer,
        },
        /**
         * @override
         */
        init: function (viewInfo) {
            this._super.apply(this, arguments);
           
        },
       
    });
    
    view_registry.add('geoengine', GeoengineView);

    
    });
    