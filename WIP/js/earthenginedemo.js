$(function () {
    // Centering the map around the UAE with a higher zoom level
    loadMap("map", ol.proj.transform([54.0000, 24.0000], 'EPSG:4326', 'EPSG:3857'), 7); // Adjust zoom level as needed
    test();
});



function test() {
    $.ajax({
        url: api_url + "test",
        type: "POST",
        async: true,
        crossDomain: true,
        contentType: "application/json",
        data: JSON.stringify({})
    }).fail(function (jqXHR, textStatus, errorThrown) { fail(jqXHR, textStatus, errorThrown); })
        .done(function (data) { addMapLayer(data); });
}