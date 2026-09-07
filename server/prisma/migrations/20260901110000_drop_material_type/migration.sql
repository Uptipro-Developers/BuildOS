-- MaterialType is no longer used by any live code path -- Material Category
-- creation flattens every dimension directly onto its own Material row now
-- (see 20260831100000_material_flatten_catalogue), and Add Material /
-- catalogue search / stock updates all target Material directly. Nothing
-- reads or writes this table any more, and the All Materials page's
-- "Types under {material}" panel that displayed it is being removed in the
-- same change. Dropping it also removes its FK to Material.
DROP TABLE IF EXISTS "MaterialType";
