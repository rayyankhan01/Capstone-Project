const AQI_BREAKPOINTS = {
    "o3": [[0, 0.054, 0, 50], [0.055, 0.070, 51, 100], [0.071, 0.085, 101, 150], [0.086, 0.105, 151, 200], [0.106, 0.200, 201, 300]],
    "no2": [[0, 53, 0, 50], [54, 100, 51, 100], [101, 360, 101, 150], [361, 649, 151, 200], [650, 1249, 201, 300], [1250, 2049, 301, 500]],
    "so2": [[0, 35, 0, 50], [36, 75, 51, 100], [76, 185, 101, 150], [186, 304, 151, 200], [305, 604, 201, 300], [605, 1004, 301, 500]],
    "co": [[0, 4.4, 0, 50], [4.5, 9.4, 51, 100], [9.5, 12.4, 101, 150], [12.5, 15.4, 151, 200], [15.5, 30.4, 201, 300], [30.5, 50.4, 301, 500]],
    "pm25": [[0, 12, 0, 50], [12.1, 35.4, 51, 100], [35.5, 55.4, 101, 150], [55.5, 150.4, 151, 200], [150.5, 250.4, 201, 300], [250.5, 500.4, 301, 500]],
    "pm10": [[0, 54, 0, 50], [55, 154, 51, 100], [155, 254, 101, 150], [255, 354, 151, 200], [355, 424, 201, 300], [425, 604, 300, 500]]
};


const MOLAR_MASSES = {
    "no2": 46.0055, // g/mol
    "so2": 64.066,  // g/mol
    "co": 28.01,    // g/mol
    "o3": 48.00,    // g/mol
    // Add molar masses for other gases if needed
};

// This function converts concentrations from µg/m³ to ppm or ppb
function convertToAppropriateUnit(value, parameter) {
    const molarVolume = 24.45; // Molar Volume at 25°C and 1 atm in Liters
    switch (parameter) {
        case 'o3':
        case 'co':
            return (value * molarVolume) / (MOLAR_MASSES[parameter] * 1000);
        case 'no2':
        case 'so2':
            return (value * molarVolume) / MOLAR_MASSES[parameter];
        case 'pm25':
        case 'pm10':
            return value; // No conversion needed
        default:
            console.error(`No conversion factor specified for ${parameter}`);
            return value; // Return original value if no conversion is available
    }
}

function calculateAQI(Cp, gas) {
    if (!AQI_BREAKPOINTS.hasOwnProperty(gas)) {
        console.error(`No AQI breakpoints defined for "${gas}".`);
        return "AQI not available"; // Guard against incorrect gas keys
    }
    const breakpoints = AQI_BREAKPOINTS[gas];
    console.log(`Breakpoints for ${gas}:`, breakpoints);  // Log the breakpoints to check their format

    for (let i = 0; i < breakpoints.length; i++) {
        if (breakpoints[i].length !== 4) {
            console.error(`Breakpoint format error for ${gas} at index ${i}:`, breakpoints[i]);
            continue; // Skip malformed breakpoint entries
        }
        const [C_low, C_high, AQI_low, AQI_high] = breakpoints[i];
        if (C_low <= Cp && Cp <= C_high) {
            return ((AQI_high - AQI_low) / (C_high - C_low)) * (Cp - C_low) + AQI_low;
        }
    }
    return "AQI not available"; // Return when concentration is out of defined ranges
}



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
            console.log("Data from OpenAQ:", response);
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
    document.getElementById('latitudeValue').textContent = lat.toFixed(3);
    document.getElementById('longitudeValue').textContent = lon.toFixed(3);

    // Object.keys(data).forEach(gas => {
    //     gasInfoElement.innerHTML += `<p><strong>${gas}:</strong> ${data[gas]}</p>`;
    // });

    // You can update the contents of the elements like this
    document.getElementById('ch4Value').textContent = data['CH4'];
    document.getElementById('coValue').textContent = data['CO'];
    document.getElementById('hchoValue').textContent = data['HCHO'];
    document.getElementById('no2Value').textContent = data['NO2'];
    document.getElementById('o3Value').textContent = data['O3'];
    document.getElementById('so2Value').textContent = data['SO2'];

function processMeasurements(measurements) {
    console.log('Received measurements:', measurements);
    let sums = {}, counts = {}, units = {};
    measurements.forEach(m => {
        const param = m.parameter.toLowerCase();
        sums[param] = (sums[param] || 0) + m.value;
        counts[param] = (counts[param] || 0) + 1;
        units[param] = m.unit;  // Store the unit for each gas
    });
    const averages = {};
    let maxAQI = -1;
    let mostPollutingGas = '';

    for (let param in sums) {
        const average = sums[param] / counts[param];
        // Convert average value to the appropriate unit before AQI calculation
        console.log("Average:", average);
        const convertedAverage = convertToAppropriateUnit(average, param);
        console.log("Converted Average: " ,convertedAverage);
        const aqi = calculateAQI(convertedAverage, param);
        console.log("AQI ", aqi);
        averages[param] = { average, unit: units[param], aqi };
        if (aqi > maxAQI) {
            maxAQI = aqi;
            mostPollutingGas = param;
        }
    }
    displayOpenAQData(averages, mostPollutingGas);
}

function displayOpenAQData(averages, mostPollutingGas) {
    const gasInfoElement = document.getElementById('gasEmissionsInfo');
    gasInfoElement.innerHTML = "<p>Average Measurements from the past week: Ground Station Data:</p>";
    for (let param in averages) {
        const { average, unit, aqi } = averages[param];
        const highlightStyle = (param === mostPollutingGas) ? "color: red;" : "";
        gasInfoElement.innerHTML += `<p style="${highlightStyle}"><strong>${param.toUpperCase()}:</strong> ${average.toFixed(2)} ${unit}, AQI: ${Math.round(aqi)}</p>`;
    }
    new bootstrap.Offcanvas(document.getElementById('gasInfoOffcanvas')).show();
}