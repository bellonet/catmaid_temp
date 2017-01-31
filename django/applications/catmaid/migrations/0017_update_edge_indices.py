# -*- coding: utf-8 -*-
# Generated by Django 1.9.11 on 2017-01-20 20:34
from __future__ import unicode_literals

from django.db import migrations

forward = """

  -- Creat own float range type, which should have a (small) positive effect on
  -- performance, because the internal numrange representation is more complex
  -- and ovoids unneeded type casts. No significant performance improvements
  -- could be measured, though.
  -- See: https://www.postgresql.org/docs/9.5/static/rangetypes.html
  CREATE TYPE floatrange AS RANGE (
    subtype = float8,
    subtype_diff = float8mi
  );

  CREATE INDEX treenode_edge_z_range_gist ON treenode_edge
    USING GIST(floatrange(ST_ZMin(edge), ST_ZMax(edge), '[]'));

  CREATE INDEX treenode_edge_2d_gist ON treenode_edge
    USING GIST(edge);

  CREATE INDEX treenode_connector_edge_z_range_gist ON treenode_connector_edge
    USING GIST(floatrange(ST_ZMin(edge), ST_ZMax(edge), '[]'));

  CREATE INDEX treenode_connector_edge_2d_gist ON treenode_connector_edge
    USING GIST(edge);

  CREATE INDEX connector_geom_z_range_gist ON connector_geom
    USING GIST(floatrange(ST_ZMin(geom), ST_ZMax(geom), '[]'));

  CREATE INDEX connector_geom_2d_gist ON connector_geom
    USING GIST(geom);
"""

backward = """
  DROP INDEX treenode_edge_z_range_gist;
  DROP INDEX treenode_edge_2d_gist;
  DROP INDEX treenode_connector_edge_z_range_gist;
  DROP INDEX treenode_connector_edge_2d_gist;
  DROP INDEX connector_geom_z_range_gist;
  DROP INDEX connector_geom_2d_gist;
  DROP TYPE floatrange;
"""

class Migration(migrations.Migration):
    """Add six new indices, two for each treenode_edge, connector_edge and
    connector_geom. The first one is a min/max Z range index, the second one a
    2D GIST index. Together they can be used to emulate the semantics of the 3D
    &&& operator. The index performance, however, is much better with our type of
    data.
    """

    dependencies = [
        ('catmaid', '0016_import_meshes_as_volumes'),
    ]

    operations = [
        migrations.RunSQL(forward, backward)
    ]
