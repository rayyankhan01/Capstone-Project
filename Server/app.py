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


@app.route('/test', methods=['GET', 'POST'])
def test():
    collection = ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_SO2')\
        .select('SO2_column_number_density')\
        .filterDate('2023-12-01', '2024-01-01')

    band_viz = {
        'min': 0.0,  # Minimum SO2 concentration value
        'max': 0.0005,  # Adjust the maximum value to better visualize variations
        'palette': ['black', 'blue', 'purple', 'cyan', 'green', 'yellow', 'red']
    }

    url = image_to_map_id(collection.mean(), band_viz)
    return jsonify(url), 200


if __name__ == '__main__':
    app.run()