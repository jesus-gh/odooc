odoo.define('base_geoengine.GeoengineController', function (require) {
    "use strict";
    /*---------------------------------------------------------
     * Odoo Graph view
     *---------------------------------------------------------*/
    
    var AbstractController = require('web.AbstractController');
    var core = require('web.core');
    
    var qweb = core.qweb;
    
    var GeoengineController = AbstractController.extend({
        custom_events: _.extend({}, AbstractController.prototype.custom_events, {
            popup_closer: '_hide_popup',
            popup_edit: '_open_popup_record',
        }),
        // className: 'o_graph',
        // /**
        //  * @override
        //  * @param {Widget} parent
        //  * @param {GraphModel} model
        //  * @param {GraphRenderer} renderer
        //  * @param {Object} params
        //  * @param {string[]} params.measures
        //  */
        init: function (parent, model, renderer, params) {
            this._super.apply(this, arguments);
            // this.measures = params.measures;
        },
        
        open_record: function (feature, options) {
            var attributes = feature.get('attributes');
            var oid = attributes.id;
            if (this.dataset.select_id(oid)) {
                this.do_switch_view('form', null, options); //, null, { mode: "edit" });
            } else {
                this.do_warn("Geoengine: could not find id#" + oid);
            }
        },

        _open_popup_record: function() {
            var self = this;
            self.open_record(self.featurePopup);
        },
    
        _hide_popup: function() {
            var self = this;
            self.overlayPopup.setPosition(undefined);
        },
    });
    
    return GeoengineController;
    
    });
    