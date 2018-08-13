odoo.define('base_geoengine.GeoengineRenderer', function (require) {
    "use strict";
    
    /**
     * The graph renderer turns the data from the graph model into a nice looking
     * svg chart.  This code uses the nvd3 library.
     *
     * Note that we use a custom build for the nvd3, with only the model we actually
     * use.
     */
    
    var AbstractRenderer = require('web.BasicRenderer');
    var config = require('web.config');
    var core = require('web.core');
    var field_utils = require('web.field_utils');
    var QWeb = require('web.QWeb');
    var geomixin = require('base_geoengine.geo_mixin');
    var session = require('web.session');
    var utils = require('web.utils');
    var _t = core._t;
    var qweb = core.qweb;
    
    

    
    var GeoengineRenderer = AbstractRenderer.extend(geomixin,{
        template: "GeoengineView",
      
        init: function (parent, state, params) {
            this._super.apply(this, arguments);
            this.qweb = new QWeb(session.debug, {_s: session.origin});
            this.view_type = 'geoengine';
            this.geometry_columns = {};
            this.overlaysGroup = null;
            this.vectorSources = [];
            this.zoom_to_extent_ctrl = null;
            this.popup_element = undefined;
            this.overlayPopup = undefined;
            this.featurePopup = undefined;
        },

        _renderView: function(){
            var self = this;
            //this.load_view();
            this._render_map();
            return this._super.apply(this, arguments);
        },

        load_view: function() {
            var self = this;
            var view_loaded_def;
            if (this.embedded_view) {
                view_loaded_def = $.Deferred();
                $.async_when().done(function() {
                    view_loaded_def.resolve(self.embedded_view);
                });
            } else {
                if (! this.view_type)
                    console.warn("view_type is not defined", this);
                view_loaded_def = this.dataset._model.fields_view_get({
                    "view_id": this.view_id,
                    "view_type": this.view_type,
                    // "context": this.dataset.get_context(),
                });
            }
            return this.alive(view_loaded_def).then(function(r) {
                self.fields_view = r;
                var data = r.geoengine_layers;
                self.projection = data.projection;
                self.restricted_extent = data.restricted_extent;
                self.default_extent = data.default_extent;
                return $.when(self.view_loading(r)).then(function() {
                    self.trigger('view_loaded', r);
                });
            });
        },

        view_loading: function(fv) {
            var self = this;
            self.fields_view = fv;
            _.each(fv.geoengine_layers.actives, function(item) {
                self.geometry_columns[item.geo_field_id[1]] = true;
            });
            // return $.when();
        },

        _render_map: function(){
            var self = this;
            var arch = self.arch;
            _.each(arch.children, function(child) {
                if (child.tag === 'templates') {
                    self.qweb.add_template(utils.json_node_to_xml(child));
                }
            });
            if (_.isUndefined(this.map)){
                self.zoom_to_extent_ctrl = new ol.control.ZoomToExtent();
                map = new ol.Map({
                    layers: [new ol.layer.Group({
                        title: 'Base maps',
                        layers: self.createBackgroundLayers(self.fields_view.geoengine_layers.backgrounds),
                    })],
                    target: 'olmap',
                    view: new ol.View({
                        center: [0, 0],
                        zoom: 2
                    }),
                    controls: ol.control.defaults().extend([
                        new ol.control.FullScreen(),
                        new ol.control.ScaleLine(),
                        self.zoom_to_extent_ctrl
                    ]),
                });
                var layerSwitcher = new ol.control.LayerSwitcher({});
                map.addControl(layerSwitcher);
                self.map = map;
                self.register_interaction();
            }
        },



           /**
     * Method: createVectorLayer
     *
     * Parameters:
     * cfg - {Object} config object specific to the vector layer
     * data - {Array(features)}
     */
    createVectorLayer: function(cfg, data) {
        var self = this;
        var geostat = null;
        var vectorSource = new ol.source.Vector({});
        if (data.length === 0) {
            return new ol.layer.Vector({
                source: vectorSource,
                title: cfg.name,
            });
        }
        _.each(data, function(item) {
            var attributes = _.clone(item);
            _.each(_.keys(self.geometry_columns), function(item) {
                delete attributes[item];
            });

            if (cfg.display_polygon_labels === true) {
                attributes.label = item[cfg.attribute_field_id[1]];
            }
            else {
                attributes.label = '';
            }

            var json_geometry = item[cfg.geo_field_id[1]];
            if (json_geometry) {
                vectorSource.addFeature(
                    new ol.Feature({
                        geometry: new ol.format.GeoJSON().readGeometry(json_geometry),
                        attributes: attributes,
                    })
                );
            }
        });
        var styleInfo = self.styleVectorLayer(cfg, data);
        // init legend
        var parentContainer = self.$el.find('#map_legend');
        var elLegend = $(styleInfo.legend || '<div/>');
        elLegend.hide();
        parentContainer.append(elLegend);
        var lv = new ol.layer.Vector({
            source: vectorSource,
            title: cfg.name,
            active_on_startup: cfg.active_on_startup,
            style: styleInfo.style,
        });
        lv.on('change:visible', function(e){
            if(lv.getVisible()){
                elLegend.show();
            } else {
                elLegend.hide();
            }
        });
        this.vectorSources.push(vectorSource);
        if (cfg.layer_opacity){
            lv.setOpacity(cfg.layer_opacity);
        }
        return lv;
    },

    extractLayerValues: function(cfg, data) {
       var values = [];
        var indicator = cfg.attribute_field_id[1];
        _.each(data, function(item) {
            values.push(item[indicator]);
        });
        return values;
    },

    styleVectorLayer: function(cfg, data) {
        var self = this;
        var indicator = cfg.attribute_field_id[1];
        var opacity = 0.8; // TODO to be defined on cfg
        var begin_color = chroma(cfg.begin_color || DEFAULT_BEGIN_COLOR).alpha(opacity).css();
        var end_color = chroma(cfg.end_color || DEFAULT_END_COLOR).alpha(opacity).css();
        switch (cfg.geo_repr) {
            case "colored":
                var values = self.extractLayerValues(cfg, data);
                var nb_class = cfg.nb_class || DEFAULT_NUM_CLASSES
                var scale = chroma.scale([begin_color, end_color]);
                var serie = new geostats(values);
                var vals = null;
                switch (cfg.classification) {
                    case "unique":
                        vals = serie.getClassUniqueValues();
                        scale = chroma.scale('RdYlBu').domain([0, vals.length], vals.length);
                        break;
                    case "quantile":
                        serie.getClassQuantile(nb_class);
                        vals = serie.getRanges();
                        scale = scale.domain([0, vals.length], vals.length);
                        break;
                    case "interval":
                        serie.getClassEqInterval(nb_class);
                        vals = serie.getRanges();
                        scale = scale.domain([0, vals.length], vals.length);
                        break;
                }
                var colors = [];
                _.each(scale.colors(mode='hex'), function(color){
                    colors.push(chroma(color).alpha(opacity).css());
                });
                var styles_map = {};
                var styles;
                _.each(colors, function(color) {
                    if (color in styles_map) {
                        return;
                    }
                    var fill = new ol.style.Fill({
                        color: color
                    });
                    var stroke = new ol.style.Stroke({
                        color: '#333333',
                        width: 1
                    });
                    styles = [
                        new ol.style.Style({
                          image: new ol.style.Circle({
                            fill: fill,
                            stroke: stroke,
                            radius: 5
                          }),
                          fill: fill,
                          stroke: stroke
                        })
                    ];
                    styles_map[color] = styles;
                });
                var legend = null;
                if(vals.length <= LEGEND_MAX_ITEMS){
                    serie.setColors(colors);
                    legend = serie.getHtmlLegend(null, cfg.name, 1);
                }
                return {
                    style : function(feature, resolution) {
                        var value = feature.get('attributes')[indicator];
                        var color_idx = self.getClass(value, vals);
                        return styles_map[colors[color_idx]];
                     },
                    legend: legend
                };
            case "proportion":
                var values = self.extractLayerValues(cfg, data);
                var serie = new geostats(values);
                var styles_map = {};
                var minSize = cfg.min_size || DEFAULT_MIN_SIZE;
                var maxSize = cfg.max_size || DEFAULT_MAX_SIZE;
                var minVal = serie.min();
                var maxVal = serie.max();
                var fill = new ol.style.Fill({
                    color: begin_color
                });
                var stroke = new ol.style.Stroke({
                    color: '#333333',
                    width: 1
                });
                _.each(values, function(value) {
                    if (value in styles_map) {
                        return;
                    }
                    var radius = (value - minVal) / (maxVal - minVal) *
                        (maxSize - minSize) + minSize;
                    var styles = [
                        new ol.style.Style({
                          image: new ol.style.Circle({
                            fill: fill,
                            stroke: stroke,
                            radius: radius
                          }),
                          fill: fill,
                          stroke: stroke
                        })
                    ];
                    styles_map[value] = styles;
                });

                return {
                     style : function(feature, resolution) {
                         var value = feature.get('attributes')[indicator];
                         return styles_map[value];
                     },
                     legend : ''
                };
            default: // basic
                var fill = new ol.style.Fill({
                    color: begin_color
                });
                var stroke = new ol.style.Stroke({
                    color: '#333333',
                    width: 1
                });
                var olStyleText = new ol.style.Text({
                    text: "",
                    fill: new ol.style.Fill({
                      color: "#000000"
                    }),
                    stroke: new ol.style.Stroke({
                      color: "#FFFFFF",
                      width: 2
                    })
                });
                var styles = [
                    new ol.style.Style({
                      image: new ol.style.Circle({
                        fill: fill,
                        stroke: stroke,
                        radius: self.getBasicCircleRadius(cfg, data),
                      }),
                      fill: fill,
                      stroke: stroke,
                      text: olStyleText,
                    })
                ];
                return {
                     style : function(feature, resolution) {
                          var label_text = feature.values_.attributes.label;
                          if(label_text === false){
                            label_text = '';
                          }
                          styles[0].text_.text_ = label_text;
                          return styles;
                     },
                    legend: ''
                };
        }
    },

    getBasicCircleRadius: function(cfg, data) {
        return 5;
    },
        
       
    });
    return GeoengineRenderer;
    });
    