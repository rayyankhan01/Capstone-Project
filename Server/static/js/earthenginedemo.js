let currentLayer;
let currentChart;
let bandCollector;

$(function () {
  // Initial map load
  loadMap("map", ol.proj.transform([54.0000, 24.0000], 'EPSG:4326', 'EPSG:3857'), 7);

  // Call test function with the default selected gas when the page loads
  const defaultGas = $('#gas-select').val();
  test(defaultGas); // Note: Ensure this is the correct usage as per your application's logic
  timeSeriesIndex(defaultGas)
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
    timeSeriesIndex($(this).val()) // ---> ?
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
    // Initializers for date pickers with added triggers for time series index updates
    $("#start-date, #end-date").datepicker({
        dateFormat: "yy-mm-dd",
        onSelect: function() {
            let selectedGas = $('#gas-select').val();
            test(selectedGas);
            timeSeriesIndex(selectedGas); // Ensure this function is called with the correct gas
        }
    });

    // Ensuring time series index is updated on gas selection changes
    $('#gas-select').change(function() {
        updateDatePickerRange($(this).val());
        test($(this).val());
        timeSeriesIndex($(this).val());
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

// Function to update the chart based on date selection
// Initial chart creation
function timeSeriesIndex(selectedGas) {
  const startDate = $('#start-date').val();
  const endDate = $('#end-date').val();

  $.ajax({
    url: api_url + 'timeSeriesIndex',
    type: "POST",
    async: true,
    crossDomain: true,
    contentType: "application/json",
    data: JSON.stringify({ gas: selectedGas, startDate: startDate, endDate: endDate }),
    success: function(data) {
      if (data.timeseries) {
          const ChartData = prepareChartData(data.timeseries);
        // Now correctly passing the 'timeseries' data and a title for the chart
          console.log("Timeseries data:", ChartData);
        createChart(selectedGas, ChartData);
      } else {
        console.error('Expected timeseries data not found.');
        console.log(data.errMsg || 'No error message provided');
      }
    },
    error: function(jqXHR, textStatus, errorThrown) {
      console.error('Error fetching time series data:', textStatus, errorThrown);
    }
  });
}
function prepareChartData(rawData) {
  return rawData
    .map(item => {
      // Check if the timestamp is in the expected format, if not, handle accordingly
      const timestamp = item[0]; // assuming this is where the timestamp is in your data
      let parsedDate;

      // Handle different possible formats for the timestamp
      if (typeof timestamp === 'string') {
          console.log(timestamp);
        // If the timestamp is a string, attempt to parse it
        parsedDate = Date.parse(timestamp);
      } else if (typeof timestamp === 'number') {
        // If the timestamp is a number, it might already be in milliseconds
        parsedDate = new Date(timestamp).getTime();
      } else {
        // If the timestamp is in an unexpected format, log an error or handle it as needed
        console.error('Unexpected timestamp format:', timestamp);
        parsedDate = NaN; // This will filter out the invalid data point later
      }

      const value = parseFloat(item[1]); // convert the value to a float
      return [parsedDate, value];
    })
    .filter(item => !isNaN(item[0]) && !isNaN(item[1])); // filter out invalid data points
}


// Initial chart creation (call this function to create the initial chart)




















/*
function timeSeriesIndex() {
  const theJson = {
    gasSelection: $("#gasSelection").val(),
    startDate: $("#fromDate").val(),
    endDate: $("#toDate").val(),
    scale: $("#scale").val(),
  };

  $.ajax({
    url: api_url + 'timeSeriesIndex',
    type: "POST",
    async: true,
    crossDomain: true,
    contentType: "application/json",
    data: JSON.stringify(theJson)
  }).fail(function(jqXHR, textStatus, errorThrown) {
    console.warn(jqXHR + textStatus + errorThrown);
    $("#overlay").hide();
  }).done(function(data, _textStatus, _jqXHR) {
    if (data.errMsg) {
      console.info(data.errMsg);
    } else {
      if (data.hasOwnProperty("timeseries")) {
        createChart('timeSeriesIndex', data.timeseries);
      } else {
        console.warn("Wrong Data Returned");
        console.log(data);
      }
    }
    $("#overlay").hide()
  });
}


// Function to update the chart based on date selection
function updateChartByDate() {
  const startDate = $("#startDate").val();
  const endDate = $("#endDate").val();

  if (startDate && endDate) {
    const theJson = {
      gasSelection: $("#gasSelection").val(),
      startDate: startDate,
      endDate: endDate,
      scale: $("#scale").val(),
    };

    $.ajax({
      url: api_url + 'timeSeriesIndex',
      type: "POST",
      async: true,
      crossDomain: true,
      contentType: "application/json",
      data: JSON.stringify(theJson)
    }).fail(function(jqXHR, textStatus, errorThrown) {
      console.warn(jqXHR + textStatus + errorThrown);
      $("#overlay").hide();
    }).done(function(data, _textStatus, _jqXHR) {
      if (data.errMsg) {
        console.info(data.errMsg);
      } else {
        if (data.hasOwnProperty("timeseries")) {
          // Update the chart with the new data
          updateChart('timeSeriesIndex', data.timeseries);
        } else {
          console.warn("Wrong Data Returned");
          console.log(data);
        }
      }
      $("#overlay").hide()
    });
  }
}









function updateChart(chart, data) {
  // Update the existing chart with new data
  // Assuming you have a function to update the chart
  updateChartData(chart, data);
}

==================================================================================
*/
  
/*
// this for the timeseries chart on the canvas 
function getGasEmissions(lon, lat, startDate, endDate,gasType) {



  const Sent5PNO2 = ee.ImageCollection("COPERNICUS/S5P/OFFL/L3_NO2")
    .filterDate(startDate, endDate)
    .select('NO2_column_number_density');

  const point = ee.Geometry.Point(lon, lat);
  const timeSeries = ee.ImageCollection(Sent5PNO2)
    .filterBounds(point)
    .map(function(image) {
      return image.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: point,
        scale: 500,
      });
    }).flatten();

  const emissions = timeSeries.aggregate_array('system:time_start').map(function(date) {
    return [ee.Date(date).format('MM-yy'), timeSeries.filter(ee.Filter.dateRangeContains('system:time_start', date, date.advance(1, 'day'))).first().get('NO2_column_number_density')];
  });

  return emissions;
}
*/



