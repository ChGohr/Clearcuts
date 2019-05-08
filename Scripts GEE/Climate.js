/* This script was produced by Charlotte Gohr for the master thesis

'Examining forest productivity under the impact of adjacent clearcuts 
using large-scale remote sensing time series data'

In this script, the time series pixel values for temperature and precipitation in the study area
between 2000 and 2017 are prepared and exported. 
*/

// Create area
var geometry = ee.Geometry.Polygon(
        [[[44.795899216420594, 63.522212732449646],
          [43.373169724233094, 63.51853879838433],
          [43.370423142201844, 63.20452110470073],
          [44.817871872670594, 63.20328289951032]]]);
Map.setCenter(44,63.35, 9.5);

// Parameters
var StartDate = '2000-01-01';
var EndDate = '2017-12-31';


// Load minimum and maximum temperature, scale 2.5 arc minutes
var tmmn = ee.ImageCollection('IDAHO_EPSCOR/TERRACLIMATE')
              .filterDate(StartDate,EndDate)
              .select('tmmn');
var tmmx = ee.ImageCollection('IDAHO_EPSCOR/TERRACLIMATE')
              .select('tmmx')
              .filterDate(StartDate,EndDate);
var scale_temp = tmmx.first().projection().nominalScale();

// Rescale values and clip to study area extend
var tmmx = tmmx.map(function(img) {
    return img.multiply(0.1).clip(geometry);
});
var tmmn = tmmn.map(function(img) {
    return img.multiply(0.1).clip(geometry);
});

// Export table with minimum and maximum temperature
var exp_tmmx = tmmx.map(function(image) {
  return image.reduceRegions({
    collection: geometry, 
    reducer: ee.Reducer.first().setOutputs(image.bandNames()), 
    scale: scale_temp,
  }).map(function(feature) {
    return feature.set({
      'imageID': image.id()
    });
  });
}).flatten();
print('exp_tmmx',exp_tmmx.first());

Export.table.toDrive({
  collection: exp_tmmx, 
  description: 'exp_tmmx', 
  fileFormat: 'CSV'
});

var exp_tmmn = tmmn.map(function(image) {
  return image.reduceRegions({
    collection: geometry, 
    reducer: ee.Reducer.first().setOutputs(image.bandNames()), 
    scale: scale_temp,
  }).map(function(feature) {
    return feature.set({
      'imageID': image.id()
    });
  });
}).flatten();
print('exp_tmmn',exp_tmmn.first());

Export.table.toDrive({
  collection: exp_tmmn, 
  description: 'exp_tmmn', 
  fileFormat: 'CSV'
});

// Load precipitation data, scale 2.5 arc minutes
var pr = ee.ImageCollection('IDAHO_EPSCOR/TERRACLIMATE')
              .filterDate(StartDate,EndDate)
              .select('pr');
var scale_pr = pr.first().projection().nominalScale();

var exp_pr = pr.map(function(image) {
  return image.clip(geometry);
});

// Export table with precipitation data in mm
var exp_pr = exp_pr.map(function(image) {
  return image.reduceRegions({
    collection: geometry, 
    reducer: ee.Reducer.first().setOutputs(image.bandNames()), 
    scale: scale_pr,
  }).map(function(feature) {
    return feature.set({
      'imageID': image.id()
    });
  });
}).flatten();
print('exp_pr',exp_pr.first());

Export.table.toDrive({
  collection: exp_pr, 
  description: 'exp_pr', 
  fileFormat: 'CSV'
});