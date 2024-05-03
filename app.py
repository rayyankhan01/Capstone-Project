import os
import traceback

import requests
from flask import Flask, render_template
from flask import request, jsonify
from flask_cors import CORS
from ee_utils import *
from flask import Flask, jsonify
import ee
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)
ee.Initialize()

MOLAR_VOLUME_AT_STP = 22.414  # Molar volume of gas at STP in liters
MOLAR_MASSES = {  # Molar masses in g/mol
    "NO2": 46.0055,
    "SO2": 64.066,
    "O3": 48.00,
    "CO": 28.01,
}
STANDARD_PRESSURE = 1013.25  # in hPa
STANDARD_TEMPERATURE = 273.15  # in Kelvin


def umol_per_m2_to_ppb(umol_per_m2, gas):
    """Converts concentration from µmol/m² to ppb."""
    # Using molar mass to convert µmol/m² to µg/m², then to ppb
    micrograms_per_m2 = umol_per_m2 * MOLAR_MASSES[gas]
    ppb = micrograms_per_m2 / (MOLAR_VOLUME_AT_STP * 1e3)  # Convert µg/m³ to ppb
    return ppb


def mol_per_m2_to_ppm(mol_per_m2, gas):
    """Converts concentration from mol/m² to ppm."""
    # Using molar mass to convert mol/m² to g/m², then to ppm
    grams_per_m2 = mol_per_m2 * MOLAR_MASSES[gas]
    ppm = grams_per_m2 / (MOLAR_VOLUME_AT_STP * 1e6)  # Convert g/m³ to ppm
    return ppm


def get_date_range():
    today = datetime.now()
    last_week = today - timedelta(days=7)
    return last_week.strftime('%Y-%m-%d'), today.strftime('%Y-%m-%d')


def calculate_aqi(Cp, breakpoints):
    for breakpoint in breakpoints:
        C_low, C_high, AQI_low, AQI_high = breakpoint
        if C_low <= Cp <= C_high:
            return ((AQI_high - AQI_low) / (C_high - C_low)) * (Cp - C_low) + AQI_low
    return


breakpoints = {
    # (lower limit, upper limit, lower limit of quality, upper limit of quality). NO2, SO2 1 hour exposure in ppb, CO, O3 8hr exp ppm)
    "O3": [(0, 0.054, 0, 50), (0.055, 0.070, 51, 100), (0.071, 0.085, 101, 150), (0.086, 0.105, 151, 200),
           (0.106, 0.200, 201, 300)],
    "NO2": [(0, 53, 0, 50), (54, 100, 51, 100), (101, 360, 101, 150), (361, 649, 151, 200), (650, 1249, 201, 300),
            (1250, 2049, 301, 500)],
    "SO2": [(0, 35, 0, 50), (36, 75, 51, 100), (76, 185, 101, 150), (186, 304, 151, 200), (305, 604, 201, 300),
            (605, 1004, 301, 500)],
    "CO": [(0, 4.4, 0, 50), (4.5, 9.4, 51, 100), (9.5, 12.4, 101, 150), (12.5, 15.4, 151, 200), (15.5, 30.4, 201, 300),
           (30.5, 50.4, 301, 500)],
    "PM25": [(0, 12, 0, 50), (12.1, 35.4, 51, 100), (35.5, 55.4, 101, 150), (55.5, 150.4, 151, 200),
             (150.5, 250.4, 201, 300), (250.5, 500.4, 301, 500)],
    "PM10": [(0, 54, 0, 50), (55, 154, 51, 100), (155, 254, 101, 150), (255, 354, 151, 200), (355, 424, 201, 300),
             (425, 604, 300, 500)]

}


@app.route('/api/openaq', methods=['GET'])
def get_openaq_data():
    latitude = request.args.get('lat')
    longitude = request.args.get('lon')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    limit = request.args.get('limit', 10000)

    url = f"https://api.openaq.org/v2/measurements?coordinates={latitude},{longitude}&radius=1000&date_from={date_from}&date_to={date_to}&limit={limit}"
    headers = {"X-API-Key": "64b0bb7bcecc37a2b4bee22f281748852e3055e3062d0d6fde9fce62977ff12b"}

    response = requests.get(url, headers=headers)
    return jsonify(response.json())


@app.route('/gas-info', methods=['POST'])
def gas_info():
    request_data = request.get_json()
    latitude = float(request_data['latitude'])
    longitude = float(request_data['longitude'])
    start_date, end_date = get_date_range()

    point = ee.Geometry.Point([longitude, latitude])
    gases = {
        "NO2": {"id": "COPERNICUS/S5P/NRTI/L3_NO2", "band": "NO2_column_number_density", "scale": 1e9,
                "unit": "µmol/m²"},
        "SO2": {"id": "COPERNICUS/S5P/NRTI/L3_SO2", "band": "SO2_column_number_density", "scale": 1e9,
                "unit": "µmol/m²"},
        "CO": {"id": "COPERNICUS/S5P/NRTI/L3_CO", "band": "CO_column_number_density", "scale": 1e9, "unit": "mol/m²"},
        "O3": {"id": "COPERNICUS/S5P/NRTI/L3_O3", "band": "O3_column_number_density", "scale": 1e9, "unit": "µmol/m²"},
        "CH4": {"id": "COPERNICUS/S5P/OFFL/L3_CH4", "band": "CH4_column_volume_mixing_ratio_dry_air", "scale": 1,
                "unit": "ppb"},
        "HCHO": {"id": "COPERNICUS/S5P/NRTI/L3_HCHO", "band": "tropospheric_HCHO_column_number_density", "scale": 1e9,
                 "unit": "mol/m²"}
    }

    response_data = {}
    for gas, info in gases.items():
        collection = ee.ImageCollection(info["id"]) \
            .select(info["band"]) \
            .filterDate(start_date, end_date)

        mean_img = collection.mean()
        value = mean_img.reduceRegion(ee.Reducer.mean(), point, scale=1000).get(info["band"]).getInfo()

        if value is not None:
            scaled_value = value * info["scale"]
            if scaled_value < 0:
                formatted_value = "Below Detection Limit"
            else:
                formatted_value = f"{scaled_value:.2e} {info['unit']}"  # Adjust formatting based on the scale
        else:
            formatted_value = "Data not available"

        response_data[gas] = formatted_value

    return jsonify(response_data)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/trends')
def trends():
    return render_template('trends.html');


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

    gas_viz_params = {
        "SO2": {'bands': ['SO2_column_number_density'], 'min': 0, 'max': 0.0005,
                'palette': ['black', 'blue', 'purple', 'cyan', 'green', 'yellow', 'red']},
        "NO2": {'bands': ['NO2_column_number_density'], 'min': 0, 'max': 0.0002,
                'palette': ['purple', 'blue', 'green', 'yellow', 'red']},
        "CO": {'bands': ['CO_column_number_density'], 'min': 0, 'max': 0.05,
               'palette': ['black', 'blue', 'green', 'yellow', 'red']},
        "HCHO": {'bands': ['tropospheric_HCHO_column_number_density'], 'min': 0, 'max': 0.0003,
                 'palette': ['black', 'blue', 'green', 'yellow', 'red']},
        "O3": {'bands': ['O3_column_number_density'], 'min': 0.12, 'max': 0.15,
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


# Dictionary for gasses and their respective collections and bands
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
        'index_name': 'tropospheric_HCHO_column_number_density'
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

# collection to filter the data
countries = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017')
uae = countries.filter(ee.Filter.eq('country_na', 'United Arab Emirates'))
uae_boundaries = uae.first().geometry()

preset_reducer = 'mean'  # reducer for the data
preset_scale = 30


@app.route('/timeSeriesIndex', methods=['POST'])
def time_series_index():
    try:
        raw_data = request.data  # This will capture raw bytes sent to the endpoint
        print("Raw data received:", raw_data)

        request_json = request.get_json()
        print('Received JSON:', request_json)

        if request_json:
            gas_selection = request_json.get('gas', None)
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
    # Set the port to WEBSITES_PORT if it's set in the environment, otherwise default to 5000
    port = int(os.getenv('WEBSITES_PORT', 5000))
    app.run(host='0.0.0.0', port=port)
    print("Running on port:", port)
