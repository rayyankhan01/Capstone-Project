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
  // Your existing gas visualization parameters
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
  // Existing implementation of updateLegend
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






