// Ensure this code runs after the map object has been initialized
document.addEventListener("DOMContentLoaded", function() {
    // Assuming 'map' is the variable holding your OpenLayers map instance
    window.map.on('singleclick', function(evt) {
        const coordinate = ol.proj.toLonLat(evt.coordinate);
        const lon = coordinate[0];
        const lat = coordinate[1];

        // Fetch gas emissions information
        fetchGasInfo(lat, lon);
    });

    function fetchGasInfo(lat, lon) {
        $.ajax({
            url: "/gas-info", // Adjust according to your Flask app's URL structure
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify({ latitude: lat, longitude: lon }),
            success: function(data) {
                // Display gas information in the offcanvas
                displayGasInfo(data);
            },
            error: function(error) {
                console.error('Error fetching gas information:', error);
            }
        });
    }

    function displayGasInfo(data) {
        const gasInfoElement = document.getElementById('gasEmissionsInfo');
        gasInfoElement.innerHTML = ''; // Clear previous content
        Object.keys(data).forEach(gas => {
            gasInfoElement.innerHTML += `<p><strong>${gas}:</strong> ${data[gas]}</p>`;
        });
        // Open the offcanvas
        new bootstrap.Offcanvas(document.getElementById('gasInfoOffcanvas')).show();
    }
});