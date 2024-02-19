import ee
import sys

def image_to_map_id(ee_object, vis_params={}):
    try:
        # Load a feature collection and filter it to the UAE
        countries = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017')
        uae = countries.filter(ee.Filter.eq('country_na', 'United Arab Emirates'))
        uae_boundaries = uae.first().geometry()

        # Check if the object is an ImageCollection
        if isinstance(ee_object, ee.imagecollection.ImageCollection):
            ee_object = ee_object.mean().clip(uae_boundaries)
        elif isinstance(ee_object, ee.image.Image):
            ee_object = ee_object.clip(uae_boundaries)

        # Generate the map layer URL
        map_info = ee_object.getMapId(vis_params)
        return {
            'url': map_info['tile_fetcher'].url_format
        }
    except Exception as e:
        return {
            'errMsg': str(e)
        }
