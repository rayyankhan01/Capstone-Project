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


#Dictionary for gasses and their respective collections and bands
gas_mapping = {
    "SO2": {
        'collection_name': "COPERNICUS/S5P/NRTI/L3_SO2",
        'index_name': 'SO2_column_number_density'
    },
    "NO2": {
        'collection_name': "COPERNICUS/S5P/NRTI/L3_NO2",
        'index_name': 'NO2_column_number_density'
    },
    "CO": {
        'collection_name': "COPERNICUS/S5P/NRTI/L3_CO",
        'index_name': 'CO_column_number_density'
    },

    "HCHO": {
        'collection_name': "COPERNICUS/S5P/NRTI/L3_HCHO",
        'index_name':'tropospheric_HCHO_column_number_density'
    },
     "O3": {
        'collection_name': "COPERNICUS/S5P/NRTI/L3_O3",
        'index_name': 'O3_column_number_density'
    },
     "CH4": {
        'collection_name': "COPERNICUS/S5P/OFFL/L3_CH4",
        'index_name': 'CH4_column_volume_mixing_ratio_dry_air'
    },
}

#collection to filter the data
countries = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017')
uae = countries.filter(ee.Filter.eq('country_na', 'United Arab Emirates'))
uae_boundaries = uae.first().geometry()

preset_reducer = 'mean' # reducer for the data
preset_scale = 30


@app.route('/timeSeriesIndex', methods=['POST'])
def time_series_index():
    try:
        raw_data = request.data  # This will capture raw bytes sent to the endpoint
        print("Raw data received:", raw_data)

        request_json = request.get_json()
        print('Received JSON:', request_json)
        
        if request_json:
            gas_selection = request_json.get('gasSelection', None)
            start_date = request_json.get('startDate', None)
            end_date = request_json.get('endDate', None)

            # Get the collection name and index name based on the gas selection
            gas_info = gas_mapping.get(gas_selection, None)
          
            if gas_info and start_date and end_date:
                values = get_time_series_by_collection_and_index(gas_info['collection_name'],
                                                                  gas_info['index_name'],
                                                                  preset_scale,
                                                                  uae_boundaries,
                                                                  start_date,
                                                                  end_date,
                                                                  preset_reducer)
            else:
                raise Exception("Missing required parameters")
        else:
            raise Exception("Invalid request payload")
    except Exception as e:
        values = {
            'errMsg': str(e)
        }

    return jsonify(values), 200


if __name__ == '__main__':
    app.run()
