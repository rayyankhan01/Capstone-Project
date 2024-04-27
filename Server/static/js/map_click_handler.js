// Ensure this code runs after the map object has been initialized
document.addEventListener("DOMContentLoaded", function() {
    window.onload = function() {
        if (window.map && window.map.on) {
            window.map.on('singleclick', function(evt) {
                const coordinate = ol.proj.toLonLat(evt.coordinate);
                const lon = coordinate[0];
                const lat = coordinate[1];

                // Fetch gas emissions information and display coordinates
                fetchGasInfo(lat, lon);
            });
        } else {
            console.error("Map or OpenLayers library not properly initialized.");
        }
    };

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

    new bootstrap.Offcanvas(document.getElementById('gasInfoOffcanvas')).show();
}
});