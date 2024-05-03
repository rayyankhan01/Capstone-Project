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
def get_time_series_by_collection_and_index(collection_name, index_name, scale, geometry, date_from, date_to, reducer='mean'):
    """
    Retrieves time series data for a given collection, index, geometry, date range, and reducer.
    """
    try:
        if index_name:
            index_collection = ee.ImageCollection(collection_name).filterDate(date_from, date_to).select(index_name)
        else:
            index_collection = ee.ImageCollection(collection_name).filterDate(date_from, date_to)

        def get_index(image):
            """
            Helper function to extract index value for each image in the collection.
            """
            the_reducer = ee.Reducer.mean() if reducer == 'mean' else eval(f"ee.Reducer.{reducer}()")

            if index_name:
                index_value = image.clip(geometry).reduceRegion(the_reducer, geometry, scale, maxPixels=1.0E13).get(index_name)
            else:
                index_value = image.reduceRegion(the_reducer, geometry, scale, maxPixels=1.0E13)

            return ee.Image().set('indexValue', [ee.Number(image.get('system:time_start')), index_value])

        return {
            'timeseries': index_collection.map(get_index).aggregate_array('indexValue').getInfo()
        }

    except Exception as e:
        print(str(e))
        raise Exception(sys.exc_info()[0])