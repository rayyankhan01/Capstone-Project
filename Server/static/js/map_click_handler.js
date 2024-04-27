// Ensures code runs after the map object has been initialized
document.addEventListener("DOMContentLoaded", function() {
    window.onload = function() {
        if (window.map) {
            // Existing function to handle clicking on the map
            window.map.on('singleclick', function(evt) {
                const coordinate = ol.proj.toLonLat(evt.coordinate);
                const lon = coordinate[0];
                const lat = coordinate[1];

                // Fetch gas emissions information and display coordinates
                fetchGasInfo(lat, lon);
            });

            // Setup interactions for clicking on markers
            setupMapInteractions();
        } else {
            console.error("Map or OpenLayers library not properly initialized.");
        }
    };
});

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
    const gasInfoElement = document.getElementById('gasEmissionsInfo');
    gasInfoElement.innerHTML = `<p><strong>Latitude:</strong> ${lat.toFixed(3)}, <strong>Longitude:</strong> ${lon.toFixed(3)}</p>`;

    Object.keys(data).forEach(gas => {
        gasInfoElement.innerHTML += `<p><strong>${gas}:</strong> ${data[gas]}</p>`;
    });

    new bootstrap.Offcanvas(document.getElementById('gasInfoOffcanvas')).show();
}

function setupMapInteractions() {
    window.map.on('singleclick', function(evt) {
        window.map.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {
            if (layer === vectorLayer) {
                // Retrieve the coordinates from the feature
                const coordinates = feature.getGeometry().getCoordinates();
                const lonLat = ol.proj.toLonLat(coordinates);
                fetchOpenAQData(lonLat[1], lonLat[0]); // Fetch OpenAQ data based on lon and lat
                return true; // Stop iterating through other features
            }
        });
    });
}

let lastCalled = null;
let lastCoordinates = null;

function fetchOpenAQData(lat, lon) {
    const now = new Date();
    if (lastCalled && lastCoordinates && lastCoordinates.lat === lat && lastCoordinates.lon === lon && (now - lastCalled < 30000)) {
        console.log('Skipping fetch to avoid too many requests');
        return;
    }

    lastCalled = now;
    lastCoordinates = { lat, lon };

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // Set to 7 days in the past
    const url = `https://api.openaq.org/v2/measurements?coordinates=${lat},${lon}&radius=1000&date_from=${startDate.toISOString()}&date_to=${endDate.toISOString()}&limit=10000`;

    $.ajax({
        url: url,
        type: "GET",
        success: function(response) {
            if (response.results.length > 0) {
                processMeasurements(response.results);
            }
        },
        error: function(xhr) {
            console.error('Error fetching OpenAQ data:', xhr.statusText);
        }
    });
}


function processMeasurements(measurements) {
    let sums = {};
    let counts = {};

    measurements.forEach(m => {
        if (!sums[m.parameter]) {
            sums[m.parameter] = 0;
            counts[m.parameter] = 0;
        }
        sums[m.parameter] += m.value;
        counts[m.parameter]++;
    });

    const averages = {};
    for (let param in sums) {
        averages[param] = sums[param] / counts[param];
    }

    displayOpenAQData(averages);
}

function displayOpenAQData(measurements) {
    const gasInfoElement = document.getElementById('gasEmissionsInfo');
    gasInfoElement.innerHTML = `<p>Measurements from the past week:</p>`;
    measurements.forEach(m => {
        gasInfoElement.innerHTML += `<p><strong>${m.parameter}:</strong> ${m.value} ${m.unit} at ${m.date.local}</p>`;
    });

    new bootstrap.Offcanvas(document.getElementById('gasInfoOffcanvas')).show();
}
