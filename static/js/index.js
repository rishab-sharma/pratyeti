L.mapbox.accessToken = 'pk.eyJ1IjoicmlzaGFiLXNoYXJtYSIsImEiOiJjamVsNnh5N3QxZXcwMzNudWJ4YWM4eTJiIn0.eBysOBBUyW6GZvYCTLDSgQ';

var map = L.mapbox.map('map')
	.setView([57.0, 17.0], 4)
	.addLayer(L.mapbox.tileLayer('fallenartist.m2b0pn3n'));

L.mapbox.featureLayer('fallenartist.m2b0pn3n').on('ready', function(e) {

	var clusterGroup = new L.MarkerClusterGroup({
		// http://leafletjs.com/reference.html#path
		polygonOptions: {
			fillColor: '#888888',
			//color: '#3887be',
			weight: 0,
			//opacity: 1,
			fillOpacity: 0.25
		}
	});

	var heat = new L.heatLayer([], { 
		radius: 32,
		blur: 20,
		gradient: {
			0.2: 'rgb(  0,  0,255)',
			0.3: 'rgb(  0,128,255)',
			0.4: 'rgb(  0,255,255)',
			0.5: 'rgb(  0,255,128)',
			0.6: 'rgb(  0,255,  0)',
			0.7: 'rgb(128,255,  0)',
			0.8: 'rgb(255,255,  0)', 
			0.9: 'rgb(255,128,  0)',
			1.0: 'rgb(255,  0,  0)'
		},
		maxZoom: 12 
	});

	e.target.eachLayer(function(layer) {
		heat.addLatLng(layer.getLatLng());
		clusterGroup.addLayer(layer);
	});
	
	map.addLayer(heat);
	map.addLayer(clusterGroup);
});