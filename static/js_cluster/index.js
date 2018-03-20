mapboxgl.accessToken = 'pk.eyJ1IjoiYW50b25pb204IiwiYSI6ImNpd3AzaTU1MjAwMWQydG1xejVrM2g0dDMifQ.zGNXyLiPL9pr1MjjifO-nw';
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/light-v9',
  center: [81.56 , 25.42],
  zoom: 9
});

const geoData = 'https://raw.githubusercontent.com/rishab-sharma/hint_repo/master/convertcsv2.geojson';

map.on('load', () => {
  map.addSource("markers", {
      type: "geojson",
      data: geoData,
      cluster: true,
      clusterMaxZoom: 14, // Max zoom to cluster points on
      clusterRadius: 50 // Radius of each cluster when clustering points (defaults to 50)
  });
  
  map.addLayer({
    id: "clusters",
    type: "circle",
    source: "markers",
    paint: {
        "circle-color": [
            "step",
            ["get", "point_count"],
            "#51bbd6",
            100,
            "#f1f075",
            750,
            "#f28cb1"
        ],
        "circle-radius": [
            "step",
            ["get", "point_count"],
            20,
            100,
            30,
            750,
            40
        ]
    }
  });
  
  map.addLayer({
    id: "cluster-count",
    type: "symbol",
    source: "markers",
    filter: ["has", "point_count"],
    layout: {
        "text-field": "{point_count_abbreviated}",
        "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
        "text-size": 12
    }
  });

  map.addLayer({
    id: "unclustered-point",
    type: "circle",
    source: "markers",
    filter: ["!has", "point_count"],
    paint: {
        "circle-color": "#11b4da",
        "circle-radius": 4,
        "circle-stroke-width": 1,
        "circle-stroke-color": "#fff"
    }
  });

});