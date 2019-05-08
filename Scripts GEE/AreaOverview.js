/* This script was produced by Charlotte Gohr for the master thesis

'Examining forest productivity under the impact of adjacent clearcuts 
using large-scale remote sensing time series data'

In this script, the size of the study area, the tree cover size and forest loss size 
are calculated. Parts with reference to https://developers.google.com/earth-engine/tutorial_forest_03
*/

// Create area and load global forest loss imagery 
var geometry = ee.Geometry.Polygon(
        [[[44.795899216420594, 63.522212732449646],
          [43.373169724233094, 63.51853879838433],
          [43.370423142201844, 63.20452110470073],
          [44.817871872670594, 63.20328289951032]]]);

var distance = ee.Geometry.LineString(
        [[43.3642970606403, 63.52183116414334],
         [40.6067287012653, 64.52738567757811]]);

var lossImage = ee.Image('UMD/hansen/global_forest_change_2018_v1_6')
    .select('lossyear')
    .clip(geometry);
var loss = ee.Image('UMD/hansen/global_forest_change_2018_v1_6')
    .select('loss')
    .clip(geometry);
var treecover = ee.Image('UMD/hansen/global_forest_change_2018_v1_6')
    .select('treecover2000')
    .clip(geometry);
var scale = loss.projection().nominalScale();

print('area of interest: ', geometry.area().divide(1000 * 1000)), 'km2'; // 2517.2 sqkm
print('distance to Arkhangelsk:',distance.length().divide(1000),'km'); // 175.3 km

// Area stats for tree cover
var treecover = treecover.mask(treecover);
var treecover = treecover.multiply(0);
var treecover = treecover.add(1);

var area_tc = treecover.multiply(ee.Image.pixelArea().divide(1000 * 1000)); 

// Summing the values of treecover pixels
var stats_tc = area_tc.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: geometry,
  scale: scale,
  maxPixels: 1e9
});
print('area of tree cover: ', stats_tc.get('treecover2000'), 'km2'); // 2396.27 sqkm

// area stats for forest loss between 2001 and 2018
var area_loss = loss.multiply(ee.Image.pixelArea().divide(1000 * 1000));
var stats_loss = area_loss.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: geometry,
  scale: scale
});
print('area of loss: ', stats_loss.get('loss'), 'km2'); // 409.2 sqkm


// Creating graph for yearly loss in study area
var lossAreaImage = loss.multiply(ee.Image.pixelArea().divide(1000 * 1000));

var lossByYear = lossAreaImage.addBands(lossImage).reduceRegion({
  reducer: ee.Reducer.sum().group({
    groupField: 1
    }),
  geometry: geometry,
  scale: scale,
  maxPixels: 1e9
});

var statsFormatted = ee.List(lossByYear.get('groups'))
  .map(function(el) {
    var d = ee.Dictionary(el);
    return [ee.Number(d.get('group')).format("20%02d"), d.get('sum')];
  });
var statsDictionary = ee.Dictionary(statsFormatted.flatten());

var chart = ui.Chart.array.values({
  array: statsDictionary.values(),
  axis: 0,
  xLabels: statsDictionary.keys()
}).setChartType('ColumnChart')
  .setOptions({
    title: 'yearly forest loss in study area',
    hAxis: {title: 'year', format: '####'},
    vAxis: {title: 'area (square kilometers)'},
    legend: { position: "none" },
    lineWidth: 1,
    pointSize: 3
  });
print(chart);