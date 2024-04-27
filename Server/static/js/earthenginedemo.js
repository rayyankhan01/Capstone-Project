let currentLayer;

$(function () {
  // Initial map load
  loadMap("map", ol.proj.transform([54.0000, 24.0000], 'EPSG:4326', 'EPSG:3857'), 7);

  // Call test function with the default selected gas when the page loads
  const defaultGas = $('#gas-select').val();
  test(defaultGas); // Note: Ensure this is the correct usage as per your application's logic

  // Dropdown selection change handler
  $('#gas-select').change(function() {
    var selectedGas = $(this).val();
    test(selectedGas);
  });
});

const gasVizParams = {
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
};

function test(selectedGas) {
   const startDate = $('#start-date').val();
   const endDate = $('#end-date').val();

  $.ajax({
    url: api_url + "test", // Make sure api_url is correctly defined
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify({ gas: selectedGas, startDate: startDate, endDate: endDate }),
    success: function(data) {
      if (currentLayer) {
        map.removeLayer(currentLayer); // Remove the existing layer
      }
      currentLayer = addMapLayer(data.url); // Add the new layer and keep track of it
      const vizParams = gasVizParams[selectedGas];
      updateLegend(vizParams.min, vizParams.max, vizParams.palette);
    },
    error: function(jqXHR, textStatus, errorThrown) {
      console.error('Error fetching data:', textStatus, errorThrown);
    }
  });
}

$('#gas-select').change(function() {
    updateDatePickerRange($(this).val());
    test($(this).val()); // Ensure test is called with the current gas as parameter
});

function addMapLayer(url) {
  const newLayer = new ol.layer.Tile({
    source: new ol.source.XYZ({
      url: url
    }),
    opacity: 0.6
  });
  map.addLayer(newLayer);
  return newLayer; // Return the new layer for tracking
}

function updateLegend(minValue, maxValue, palette) {
  // Clear the existing legend content
  var legendCanvas = document.getElementById('legend-canvas');
  var ctx = legendCanvas.getContext('2d');
  ctx.clearRect(0, 0, legendCanvas.width, legendCanvas.height);

  // Calculate the width of each color band
  var numColors = palette.length;
  var bandWidth = legendCanvas.width / numColors;

  // Draw the color gradient
  for (var i = 0; i < numColors; i++) {
    ctx.fillStyle = palette[i];
    ctx.fillRect(i * bandWidth, 0, bandWidth, legendCanvas.height);
  }

  // Update the legend min and max values
  document.getElementById('legend-min').textContent = minValue;
  document.getElementById('legend-max').textContent = maxValue;

  document.getElementById('legend-min').textContent = minValue;
  document.getElementById('legend-max').textContent = maxValue;
}

$(document).ready(function() {

    // Initialize the DatePickers
    $("#start-date").datepicker({
        dateFormat: "yy-mm-dd",
        onSelect: function() {
            test($('#gas-select').val()); // Call test with the current gas when a date is selected
        }
    });
    $("#end-date").datepicker({
        dateFormat: "yy-mm-dd",
        onSelect: function() {
            test($('#gas-select').val()); // Call test with the current gas when a date is selected
        }
    });

    // Adjust date picker range based on the selected gas
    $('#gas-select').change(function() {
        updateDatePickerRange($(this).val()); // Adjust date picker range
        test($(this).val()); // Refresh the data layer
    });
});

function updateDatePickerRange(selectedGas) {
    var minDate, maxDate = new Date(); // maxDate is today for all gases.
    switch(selectedGas) {
        case "SO2":
            minDate = new Date(2018, 6, 10);
            break;
        case "NO2":
        case "CO":
            minDate = new Date(2018, 5, 28);
            break;
        case "HCHO":
            minDate = new Date(2018, 9, 2);
            break;
        case "O3":
            minDate = new Date(2018, 6, 10);
            break;
        case "CH4":
            minDate = new Date(2019, 1, 8);
            break;
        default:
            minDate = new Date(2018, 5, 28); // Default min date if gas is unselected or unknown.
    }

    $("#start-date, #end-date").datepicker('option', 'minDate', minDate);
    $("#start-date, #end-date").datepicker('option', 'maxDate', maxDate);
}

// Initialize the vector source and layer for markers
// Define the icon style with a smaller scale for the marker
var iconStyle = new ol.style.Style({
    image: new ol.style.Icon({
        anchor: [0.5, 46],
        anchorXUnits: 'fraction',
        anchorYUnits: 'pixels',
        src: '/static/imgs/dot.svg', // Ensure this is a valid path to a marker image
        scale: 0.03 // Smaller scale for the marker icon
    })
});

// Initialize the vector source
var vectorSource = new ol.source.Vector({});

// Initialize the vector layer with the icon style that has a smaller scale
var vectorLayer = new ol.layer.Vector({
    source: vectorSource,
    style: iconStyle // Apply the style with a smaller icon scale
});
// Function to load station markers from OpenAQ API and add them to the map
function loadStationsAndMarkers() {
    $.ajax({
        url: "https://api.openaq.org/v1/locations?country=AE",
        type: "GET",
        success: function(response) {
            response.results.forEach(station => {
                addMarker(station.coordinates.latitude, station.coordinates.longitude, station.location);
            });
            // Add the vector layer to the map only after all markers are added
            map.addLayer(vectorLayer);
        },
        error: function() {
            console.error('Failed to fetch station data');
        }
    });
}

// Function to add markers to the vector source with the smaller icon scale
function addMarker(lat, lon, title) {
    var iconFeature = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([lon, lat])),
        name: title
    });

    iconFeature.setStyle(iconStyle); // Apply the style with the smaller icon scale
    vectorSource.addFeature(iconFeature);

    iconFeature.setId(title); // Setting an ID for the feature for easy retrieval
}



// Ensuring the stations and markers are loaded after the map is fully initialized
document.addEventListener("DOMContentLoaded", function() {
    loadStationsAndMarkers(); // Make sure this is called after the map is ready
});


 




