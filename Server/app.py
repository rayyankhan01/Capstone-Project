from flask import Flask, render_template
from flask import request, jsonify
from flask_cors import CORS
from ee_utils import *


app = Flask(__name__)
CORS(app)
ee.Initialize()

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/get-no2-timeseries', methods=['GET'])
def get_no2_timeseries():
    try:
        Sent5PNO2 = ee.ImageCollection("COPERNICUS/S5P/NRTI/L3_NO2")\
            .filterDate('2018-07-10', '2018-08-10')\
            .select('NO2_column_number_density')

        countries = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017')
        uae = countries.filter(ee.Filter.eq('country_na', 'United Arab Emirates'))
        uae_geometry = uae.first().geometry()  # Assuming UAE is a single feature

        def reduce_region(image):
            stat = image.reduceRegion(
                reducer=ee.Reducer.median(),
                geometry=uae_geometry,
                scale=24500  # Increase the scale to reduce memory usage
            )
            return ee.Feature(None, {
                'median_no2': stat.get('NO2_column_number_density'),
                'date': image.date().format()
            })

        # Apply the function to each image in the collection.
        timeseries_data = Sent5PNO2.map(reduce_region)

        # Fetch the data from Earth Engine
        processed_data = timeseries_data.getInfo()

        # Process the data for the response
        dates = [d['properties']['date'] for d in processed_data['features']]
        values = [v['properties']['median_no2'] for v in processed_data['features']]

        return jsonify({'dates': dates, 'values': values})



    except Exception as e:
        print(e)  # Print the error for debugging
        return jsonify({'error': str(e)}), 500


@app.route('/test', methods=['POST'])
def test():
    # Parse the selected gas from the request
    request_data = request.get_json()
    selected_gas = request_data['gas']

    # Dictionary to map gases to their corresponding image collection IDs
    gas_to_collection = {
        "SO2": "COPERNICUS/S5P/NRTI/L3_SO2",
        "NO2": "COPERNICUS/S5P/NRTI/L3_NO2",
        "CO": "COPERNICUS/S5P/NRTI/L3_CO",
        "HCHO": "COPERNICUS/S5P/NRTI/L3_HCHO",
        "O3": "COPERNICUS/S5P/NRTI/L3_O3",
        "CH4": "COPERNICUS/S5P/OFFL/L3_CH4",
    }

    # Visualization parameters for each gas
    # Note: These values are placeholders and should be fine-tuned for best results
    gas_viz_params = {
        "SO2": {'bands': ['SO2_column_number_density'], 'min': 0, 'max': 0.0005, 'palette': ['black', 'blue', 'purple', 'cyan', 'green', 'yellow', 'red']},
        "NO2": {'bands': ['NO2_column_number_density'], 'min': 0, 'max': 0.0002, 'palette': ['purple', 'blue', 'green', 'yellow', 'red']},
        "CO": {'bands': ['CO_column_number_density'], 'min': 0, 'max': 0.05, 'palette': ['black', 'blue', 'green', 'yellow', 'red']},
        "HCHO": {'bands': ['tropospheric_HCHO_column_number_density'], 'min': 0, 'max': 0.0001, 'palette': ['black', 'blue', 'green', 'yellow', 'red']},
        "O3": {'bands': ['O3_column_number_density'], 'min': 0, 'max': 0.0003, 'palette': ['black', 'blue', 'green', 'yellow', 'red']},
        "CH4": {'bands': ['CH4_column_volume_mixing_ratio_dry_air'], 'min': 1750, 'max': 1900, 'palette': ['black', 'blue', 'green', 'yellow', 'red']},
    }

    # Get the image collection ID from the dictionary
    collection_id = gas_to_collection[selected_gas]
    band_viz = gas_viz_params[selected_gas]

    # Fetch the collection and filter for the UAE
    countries = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017')
    uae = countries.filter(ee.Filter.eq('country_na', 'United Arab Emirates'))
    uae_boundaries = uae.first().geometry()

    collection = ee.ImageCollection(collection_id)\
        .select(band_viz['bands'])\
        .filterDate('2023-12-01', '2024-01-01')\
        .mean()\
        .clip(uae_boundaries)

    url = image_to_map_id(collection, band_viz)
    return jsonify(url), 200



if __name__ == '__main__':
    app.run()