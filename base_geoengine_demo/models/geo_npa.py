# -*- coding: utf-8 -*-
# Copyright 2011-2012 Nicolas Bessi (Camptocamp SA)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).
from odoo import fields, api

from odoo.addons.base_geoengine import geo_model
from odoo.addons.base_geoengine import fields as geo_fields


class NPA(geo_model.GeoModel):

    """GEO OSV SAMPLE"""

    _name = "dummy.zip"

    priority = fields.Integer('Priority', default=100)
    name = fields.Char('ZIP', size=64, index=True, required=True)
    city = fields.Char('City', size=64, index=True, required=True)
    the_geom = geo_fields.GeoMultiPolygon('NPA Shape')
    total_sales = fields.Float(
        compute='_get_ZIP_total_sales',
        string='Spatial! Total Sales',
    )

    @api.multi
    def _get_ZIP_total_sales(self):
        """Return the total of the invoiced sales for this npa"""
        mach_obj = self.env['geoengine.demo.automatic.retailing.machine']
        for rec in self:
            res = mach_obj.geo_search(
                domain=[],
                geo_domain=[
                    ('the_point',
                     'geo_intersect',
                     {'dummy.zip.the_geom': [('id', '=', rec.id)]})])

            cursor = self.env.cr
            if res:
                cursor.execute("SELECT sum(total_sales) from"
                               " geoengine_demo_automatic_retailing_machine "
                               "where id in %s;",
                               (tuple(res),))
                res = cursor.fetchone()
                if res:
                    rec.total_sales = res[0] or 0.0
                else:
                    rec.total_sales = 0.0
            else:
                rec.total_sales = 0.0

    def name_get(self):
        res = []
        for rec in self:
            res.append((rec.id, u"%s %s" % (rec.name, rec.city)))
        return res

    @api.model
    def read_map(self):
        res = {}
        view_obj = self.env['ir.ui.view']
        view_ids = view_obj.search([('model', '=', self._name), ('type', '=', 'geoengine')])
        field_obj = self.env['ir.model.fields']

        def set_field_real_name(in_tuple):
            if not in_tuple:
                return in_tuple
            name = field_obj.browse(in_tuple[0]).name
            out = (in_tuple[0], name, in_tuple[1])
            return out

        if view_ids:
            view_id = view_ids[0]

        res['geoengine_layers'] = {
            'backgrounds': [],
            'actives': [],
            'projection': view_id.projection,
            'restricted_extent': view_id.restricted_extent,
            'default_extent': view_id.default_extent or DEFAULT_EXTENT,
            'default_zoom': view_id.default_zoom,
        }

        for layer in view_id.raster_layer_ids:
            layer_dict = layer.read()[0]
            res['geoengine_layers']['backgrounds'].append(layer_dict)
        for layer in view_id.vector_layer_ids:
            layer_dict = layer.read()[0]
            # get category groups for this vector layer
            if layer.geo_repr == 'basic' and layer.symbol_ids:
                layer_dict['symbols'] = layer.symbol_ids.read(
                    ['img', 'fieldname', 'value'])
            layer_dict['attribute_field_id'] = set_field_real_name(
                layer_dict.get('attribute_field_id', False))
            layer_dict['geo_field_id'] = set_field_real_name(
                layer_dict.get('geo_field_id', False))
            res['geoengine_layers']['actives'].append(layer_dict)
            # adding geo column desc
            geo_f_name = layer_dict['geo_field_id'][1]
            res['fields_names_map'] = self.fields_get([geo_f_name])

        return res
