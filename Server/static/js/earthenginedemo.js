let currentLayer;


$(function () {
  // Initial map load
  loadMap("map", ol.proj.transform([54.0000, 24.0000], 'EPSG:4326', 'EPSG:3857'), 7);
  
  // Call test function with the default selected gas when the page loads
  const defaultGas = $('#gas-select').val();
  test(defaultGas);
  
  // Dropdown selection change handler
  $('#gas-select').change(function() {
    var selectedGas = $(this).val();
    test(selectedGas);
  });
});

const gasVizParams = {
  "SO2":{
    min: 0.0,
    max: 0.0005,
    palette: ['black', 'blue', 'purple', 'cyan', 'green', 'yellow', 'red']
  },
    "NO2":{
    min: 0.0,
    max: 0.0002,
    palette: ['purple', 'blue', 'green', 'yellow', 'red']
  },
    "CO":{
    min: 0.0,
    max: 0.05,
    palette: ['black', 'blue', 'green', 'yellow', 'red']
  },
    "HCHO":{
    min: 0.0,
    max: 0.0001,
    palette: ['black', 'blue', 'green', 'yellow', 'red']
  },
    "O3":{
    min: 0.0,
    max: 0.0003,
    palette: ['black', 'blue', 'green', 'yellow', 'red']
  },
    "CH4":{
    min: 1750,
    max: 1900,
    palette: ['black', 'blue', 'green', 'yellow', 'red']
  },
  };



function test(selectedGas) {
  $.ajax({
    url: api_url + "test",
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify({ gas: selectedGas }),
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
  // Update legend text
  document.getElementById('legend-min').textContent = minValue;
  document.getElementById('legend-max').textContent = maxValue;

  // Draw the gradient on the canvas
  var canvas = document.getElementById('legend-canvas');
  var ctx = canvas.getContext('2d');

  var gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
  for (var i = 0; i < palette.length; i++) {
    gradient.addColorStop(i / (palette.length - 1), palette[i]);
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// JavaScript to fetch the data and display the chart
// Function to fetch and display the NO2 chart
// function fetchAndDisplayNO2TimeSeries() {
//     fetch('/api/get-no2-timeseries') // Adjust this endpoint as necessary
//     .then(response => response.json())
//     .then(data => {
//         const labels = data.map(item => item.date);
//         const no2Values = data.map(item => item.mean_no2);
//
//         const ctx = document.getElementById('no2-chart').getContext('2d');
//         new Chart(ctx, {
//             type: 'line',
//             data: {
//                 labels: labels,  // x-axis labels (dates)
//                 datasets: [{
//                     label: 'Daily Mean NO2 Concentration',
//                     data: no2Values,  // y-axis values
//                     borderColor: 'rgb(75, 192, 192)',
//                     backgroundColor: 'rgba(75, 192, 192, 0.2)',
//                     fill: false,
//                     tension: 0.1
//                 }]
//             },
//             options: {
//                 scales: {
//                     y: {
//                         beginAtZero: false,  // Depending on NO2 values, adjust this
//                         title: {
//                             display: true,
//                             text: 'NO2 Concentration'
//                         }
//                     },
//                     x: {
//                         title: {
//                             display: true,
//                             text: 'Date'
//                         }
//                     }
//                 }
//             }
//         });
//     })
//     .catch(error => console.error('Error:', error));
// }
//
// // Ensure you call this function when the document is ready
// document.addEventListener('DOMContentLoaded', function() {
//     fetchAndDisplayNO2TimeSeries();
// });





