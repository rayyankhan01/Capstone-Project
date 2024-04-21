import traceback

from flask import Flask, render_template
from flask import request, jsonify
from flask_cors import CORS
from ee_utils import *

app = Flask(__name__)
CORS(app)
ee.Initialize()

@app.route('/gas-info', methods=['POST'])
def gas_info():
    request_data = request.get_json()
    latitude = request_data['latitude']
    longitude = request_data['longitude']

    # Placeholder for Earth Engine query logic to retrieve gas information
    # This is where you would use the EE API to query gas emissions data at the given coordinates
    # As an example, let's return mock data
    gas_data = {
        "SO2": "0.02 units",
        "NO2": "0.04 units",
        "CO": "0.03 units",
        "HCHO": "0.01 units",
        "O3": "0.05 units",
        "CH4": "0.06 units"
    }

    return jsonify(gas_data)
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/trends')
def trends():
    return render_template('trends.html');


from flask import Flask, jsonify
import ee

ee.Initialize()

@app.route('/test', methods=['POST'])
def test():

    request_data = request.get_json()
    print(request_data);
    selected_gas = request_data['gas']
    start_date = request_data['startDate']
    end_date = request_data['endDate']

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
        "SO2": {'bands': ['SO2_column_number_density'], 'min': 0, 'max': 0.0005,
                'palette': ['black', 'blue', 'purple', 'cyan', 'green', 'yellow', 'red']},
        "NO2": {'bands': ['NO2_column_number_density'], 'min': 0, 'max': 0.0002,
                'palette': ['purple', 'blue', 'green', 'yellow', 'red']},
        "CO": {'bands': ['CO_column_number_density'], 'min': 0, 'max': 0.05,
               'palette': ['black', 'blue', 'green', 'yellow', 'red']},
        "HCHO": {'bands': ['tropospheric_HCHO_column_number_density'], 'min': 0, 'max': 0.0001,
                 'palette': ['black', 'blue', 'green', 'yellow', 'red']},
        "O3": {'bands': ['O3_column_number_density'], 'min': 0, 'max': 0.0003,
               'palette': ['black', 'blue', 'green', 'yellow', 'red']},
        "CH4": {'bands': ['CH4_column_volume_mixing_ratio_dry_air'], 'min': 1750, 'max': 1900,
                'palette': ['black', 'blue', 'green', 'yellow', 'red']},
    }

    # Get the image collection ID from the dictionary
    collection_id = gas_to_collection[selected_gas]
    band_viz = gas_viz_params[selected_gas]

    print("Start Date:", start_date, "End Date:", end_date)

    # Fetch the collection and filter for the UAE
    countries = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017')
    uae = countries.filter(ee.Filter.eq('country_na', 'United Arab Emirates'))
    uae_boundaries = uae.first().geometry()

    collection = ee.ImageCollection(collection_id) \
        .select(band_viz['bands']) \
        .filterDate(start_date, end_date) \
        .mean() \
        .clip(uae_boundaries)

    url = image_to_map_id(collection, band_viz)
    return jsonify(url), 200



@app.route('/timeSeriesIndex', methods=['POST'])
def time_series_index():
    request_data = request.get_json()
    selected_gas = request_data['gas']
    start_date = request_data['startDate']
    end_date = request_data['endDate']

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
    gas_viz_params = {
        "SO2": {'bands': ['SO2_column_number_density']},
        "NO2": {'bands': ['NO2_column_number_density']},
        "CO": {'bands': ['CO_column_number_density']},
        "HCHO": {'bands': ['tropospheric_HCHO_column_number_density']},
        "O3": {'bands': ['O3_column_number_density']},
        "CH4": {'bands': ['CH4_column_volume_mixing_ratio_dry_air']},
    }

    # Get the image collection ID and bands from the dictionaries
    collection_id = gas_to_collection[selected_gas]
    band_viz = gas_viz_params[selected_gas]['bands']

    # Fetch the collection and filter for the UAE
    countries = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017')
    uae = countries.filter(ee.Filter.eq('country_na', 'United Arab Emirates'))
    uae_boundaries = uae.first().geometry()

    collection = ee.ImageCollection(collection_id) \
        .select(band_viz) \
        .filterDate(start_date, end_date) \
        .filterBounds(uae_boundaries)

    # Get the time series data
    time_series = collection.getRegionStats(uae_boundaries, 'mean')

    # Convert the time series data to a list of dictionaries
    values = [{'date': data.get('date').value, 'value': data.get('mean')} for data in time_series.getInfo()]

    return jsonify(values), 200



    

if __name__ == '__main__':
    app.run()
