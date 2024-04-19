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
            url: "/gas-info", // Adjust according to your Flask app's URL structure
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify({ latitude: lat, longitude: lon }),
            success: function(data) {
                // Display gas information and coordinates in the offcanvas
                displayGasInfo(data, lat, lon);
            },
            error: function(error) {
                console.error('Error fetching gas information:', error);
            }
        });
    }
    function displayGasInfo(data, lat, lon) {
        const gasInfoElement = document.getElementById('gasEmissionsInfo');
        gasInfoElement.innerHTML = `<p><strong>Latitude:</strong> ${lat.toFixed(3)}, <strong>Longitude:</strong> ${lon.toFixed(3)}</p>`; // Display coordinates with 3 decimal places

        // Append gas data to the offcanvas
        Object.keys(data).forEach(gas => {
            gasInfoElement.innerHTML += `<p><strong>${gas}:</strong> ${data[gas]}</p>`;
        });

        // Open the offcanvas
        new bootstrap.Offcanvas(document.getElementById('gasInfoOffcanvas')).show();
    }
});