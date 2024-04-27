// Ensures code runs after the map object has been initialized

const GAS_UNITS = {
    "no2": "ppb",   // parts per billion
    "so2": "ppb",
    "co": "ppm",    // parts per million
    "o3": "ppm",
    "pm25": "µg/m³",  // micrograms per cubic meter
    "pm10": "µg/m³",
    "co2": "ppm",
    // Add other gases and their units as needed
};

document.addEventListener("DOMContentLoaded", function() {
    window.onload = function() {
        if (window.map) {
            setupMapInteractions();
        } else {
            console.error("Map or OpenLayers library not properly initialized.");
        }
    };
});

let lastCalled = null;
let lastCoordinates = null;

function shouldFetch(lat, lon) {
    const now = new Date();
    if (lastCalled && lastCoordinates && lastCoordinates.lat === lat && lastCoordinates.lon === lon && (now - lastCalled < 60000)) {
        console.log('Skipping fetch to avoid too many requests');
        return false;
    }
    lastCalled = now;
    lastCoordinates = { lat, lon };
    return true;
}

function fetchGasInfo(lat, lon) {
    $.ajax({
        url: "/gas-info",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({ latitude: lat, longitude: lon }),
        success: function(data) {
            displayGasInfo(data, lat, lon);
        },
        error: function(error) {
            console.error('Error fetching gas information:', error);
        }
    });
}

function displayGasInfo(data, lat, lon) {
    if(!shouldFetch(lat, lon)) return;
    const gasInfoElement = document.getElementById('gasEmissionsInfo');
    gasInfoElement.innerHTML = `<p><strong>Latitude:</strong> ${lat.toFixed(3)}, <strong>Longitude:</strong> ${lon.toFixed(3)}</p>`;
    Object.keys(data).forEach(gas => {
        gasInfoElement.innerHTML += `<p><strong>${gas}:</strong> ${data[gas]}</p>`;
    });
    new bootstrap.Offcanvas(document.getElementById('gasInfoOffcanvas')).show();
}

function setupMapInteractions() {
    window.map.on('singleclick', function(evt) {
        let featureHit = false;
        window.map.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {
            if (layer === vectorLayer) {
                const coordinates = feature.getGeometry().getCoordinates();
                const lonLat = ol.proj.toLonLat(coordinates);
                fetchOpenAQData(lonLat[1], lonLat[0]);
                featureHit = true;
            }
        });
        if (!featureHit) {
            const coordinate = ol.proj.toLonLat(evt.coordinate);
            fetchGasInfo(coordinate[1], coordinate[0]);
        }
    });
}

function fetchOpenAQData(lat, lon) {
    if(!shouldFetch(lat, lon)) return;
    lat = Number(lat).toFixed(8);
    lon = Number(lon).toFixed(8);
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    const url = `/api/openaq?lat=${lat}&lon=${lon}&date_from=${startDate.toISOString()}&date_to=${endDate.toISOString()}&limit=10000`;

    $.ajax({
        url: url,
        type: "GET",
        success: function(response) {
            if (response && response.results && response.results.length > 0) {
                processMeasurements(response.results);
            } else {
                console.log('No data available for the selected location and time range.');
            }
        },
        error: function(xhr, status, error) {
            console.error('Error fetching OpenAQ data:', xhr.responseText);
        }
    });
}

function processMeasurements(measurements) {
    let sums = {}, counts = {}, units = {};
    measurements.forEach(m => {
        sums[m.parameter] = (sums[m.parameter] || 0) + m.value;
        counts[m.parameter] = (counts[m.parameter] || 0) + 1;
        units[m.parameter] = m.unit;  // Store the unit for each gas
    });
    const averages = {};
    for (let param in sums) {
        averages[param] = {
            average: sums[param] / counts[param],
            unit: units[param]  // Include unit in the result
        };
    }
    displayOpenAQData(averages);
}

function displayOpenAQData(averages) {
    const gasInfoElement = document.getElementById('gasEmissionsInfo');
    gasInfoElement.innerHTML = "<p>Average Measurements from the past week: Ground Station Data:</p>";
    for (let param in averages) {
        const value = averages[param].average.toFixed(2);
        const unit = averages[param].unit;  // Use dynamic unit from the averages object
        gasInfoElement.innerHTML += `<p><strong>${param}:</strong> ${value} ${unit}</p>`;
    }
    new bootstrap.Offcanvas(document.getElementById('gasInfoOffcanvas')).show();
}

