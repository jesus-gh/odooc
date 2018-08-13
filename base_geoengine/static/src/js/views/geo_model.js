odoo.define('base_geoengine.GeoengineModel', function (require) {
    "use strict";

    /**
     * The graph model is responsible for fetching and processing data from the
     * server.  It basically just do a read_group and format/normalize data.
     */

    var core = require('web.core');
    var AbstractModel = require('web.AbstractModel');

    var _t = core._t;

    var GeoengineModel = AbstractModel.extend({
        init: function () {
            // this mutex is necessary to make sure some operations are done
            // sequentially, for example, an onchange needs to be completed before a
            // save is performed. 
            this.chart = null;
            this.localData = Object.create(null);
            this._super.apply(this, arguments);
            
        },
        get: function () {
            return _.extend({}, this.chart, {
                fields: this.fields
            });
        },

        load: function (params) {

            var groupBys = params.context.graph_groupbys || params.groupBys;
            this.initialGroupBys = groupBys;
            this.fields = params.fields;
            this.modelName = params.modelName;
            this.chart = {
                data: [],
                groupedBy: params.groupedBy.length ? params.groupedBy : groupBys,
                measure: params.context.graph_measure || params.measure,
                mode: params.context.graph_mode || params.mode,
                domain: params.domain,
                context: params.context,
            };
            return this._loadGraph();
        },
        _loadGraph: function () {
            var groupedBy = this.chart.groupedBy;
            var fields = _.map(groupedBy, function (groupBy) {
                return groupBy.split(':')[0];
            });
            if (this.chart.measure !== '__count__') {
                fields = fields.concat(this.chart.measure);
            }
            return this._rpc({
                    model: this.modelName,
                    method: 'read_map',
                    context: this.chart.context,
                    // domain: this.chart.domain,
                    // fields: fields,
                    // groupBy: groupedBy,
                    // lazy: false,
                })
                .then(this._processData.bind(this));
        },
        _processData: function (raw_data) {
            var self = this;
            var is_count = this.chart.measure === '__count__';
            var data_pt, labels;

            this.chart.data = raw_data;
            // for (var i = 0; i < raw_data.length; i++) {
            //     data_pt = raw_data[i];
            //     labels = _.map(this.chart.groupedBy, function (field) {
            //         return self._sanitizeValue(data_pt[field], field);
            //     });
            //     this.chart.data.push({
            //         value: is_count ? data_pt.__count || data_pt[this.chart.groupedBy[0] + '_count'] : data_pt[this.chart.measure],
            //         labels: labels
            //     });
            // }
        },

    });
    return GeoengineModel;
});