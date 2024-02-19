import ee
import sys


def image_to_map_id(ee_object, vis_params={}):
    try:
        # Define the geographical boundaries of the UAE
        uae_bounds = ee.Geometry.Polygon(
            [[[51.583, 22.6333], [56.3833, 22.6333], [56.3833, 26.0833], [51.583, 26.0833]]]
        )

        # Check if the object is an ImageCollection
        if isinstance(ee_object, ee.imagecollection.ImageCollection):
            ee_object = ee_object.mean().clip(uae_bounds)
        elif isinstance(ee_object, ee.image.Image):
            ee_object = ee_object.clip(uae_bounds)

        # Generate the map layer URL
        map_info = ee_object.getMapId(vis_params)
        return {
            'url': map_info['tile_fetcher'].url_format
        }
    except Exception as e:
        return {
            'errMsg': str(e)
        }