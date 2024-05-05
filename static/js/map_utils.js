let map;
if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    // Local environment
    api_url = "http://127.0.0.1:5000/";
} else {
    // Azure web service
    api_url = "https://gasmaps.azurewebsites.net/";

}


function loadMap(target, center, zoom) {
    const raster = new ol.layer.Tile({
        source: new ol.source.OSM()
    });
    map = new ol.Map({
        layers: [raster],
        target: target,
        view: new ol.View({
            center: center,
            zoom: zoom
        })
    });
    window.map = map;
}

