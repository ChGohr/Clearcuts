/* "This script was produced by Charlotte Gohr for the master thesis

'Examining forest productivity under the impact of adjacent clearcuts using large-scale remote sensing time series data'


In this script, the NDVI time series pixel values for forest areas around clearcuts of the years 2009 and 2010 
are prepared. Landsat 7 ETM+ time series and NASA Terra MODIS time series are exported.
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
var EndDate = '2018-12-31';

// Set masks
var datamask = ee.Image('UMD/hansen/global_forest_change_2018_v1_6')
    .select('datamask')
    .clip(geometry);
var treecover = ee.Image('UMD/hansen/global_forest_change_2018_v1_6')
    .select('treecover2000')
    .clip(geometry);

// Mask water
var landMask = function(image) {
var mask = datamask.eq(1);
return image.updateMask(mask);
};
// Mask non-treecover-pixel
var nontreeMask = function(image) {
var mask = treecover.mask(treecover);
return image.updateMask(mask);
};
// Mask clouds
var cloudMaskL457 = function(image) {
  var qa = image.select('pixel_qa');
  var cloud = qa.bitwiseAnd(1 << 5)
                  .and(qa.bitwiseAnd(1 << 7))
                  .or(qa.bitwiseAnd(1 << 3));
  var mask2 = image.mask().reduce(ee.Reducer.min());
  return image.updateMask(cloud.not()).updateMask(mask2);
};

// Load imagery and apply masks
var LS7 = ee.ImageCollection('LANDSAT/LE07/C01/T1_SR')
  .filterBounds(geometry)
  .filterDate(StartDate,EndDate)
  .map(cloudMaskL457)
  .map(landMask)
  .map(nontreeMask)
  .filter(ee.Filter.lt('CLOUD_COVER', 25));
var lossImage = ee.Image('UMD/hansen/global_forest_change_2018_v1_6')
    .select('lossyear')
    .clip(geometry)
    .mask(treecover.mask(treecover))
    .mask(datamask.mask(datamask));
var loss = ee.Image('UMD/hansen/global_forest_change_2018_v1_6')
    .select('loss')
    .clip(geometry)
    .mask(treecover.mask(treecover))
    .mask(datamask.mask(datamask));
var scale = lossImage.projection().nominalScale();
Map.addLayer(lossImage.mask(lossImage),{min:1,max:18,palette:['00FF00','00FFFF']},'lossImage');  

// Calculate NDVI
var addNDVI = function(image) {
  var ndvi= image.normalizedDifference(['B4', 'B3'])
  .rename('NDVI').double();
  return image.addBands(ndvi);
};

var LS7 = LS7
  .map(addNDVI)
  .select('NDVI');

// Select forest loss of years 2009 and 2010
var loss0910 = ee.Image(lossImage)
  .updateMask(lossImage.eq(9).or(lossImage.eq(10)));

// Create feature for loss areas 2009 and 2010 and total loss
var loss0910_v = loss0910.reduceToVectors({
  reducer: ee.Reducer.countEvery(), 
  geometry: geometry, 
  scale: scale,
  maxPixels: 1e8
});

var lossImage_v = lossImage.mask(lossImage).reduceToVectors({
  reducer: ee.Reducer.countEvery(), 
  geometry: geometry, 
  scale: scale,
  maxPixels: 1e8
});

/*  Split loss of years 2009 and 2010 in small and large areas by
    adding area in square meters to every feature and applying a threshold of 50 ha */
var loss0910_v = loss0910_v.map(function(feature) {
  return feature.set(
    {areasqm: feature.geometry().area(1)});
});

var largeLoss_v = loss0910_v.filter(ee.Filter.gt('areasqm', 500000));
var smallLoss_v = loss0910_v.filter(ee.Filter.lt('areasqm',500000));

// Add a 1 km buffer to large area loss features
// Add a 100 m buffer to small area loss features
// Add a 100 m buffer to all loss events 
var bufferBy = function(size){
  return function(feature){
    return feature.buffer(size);
  };
};
var buffer1000 = largeLoss_v.map(bufferBy(1000));
  
var smallbuffer= smallLoss_v.map(bufferBy(100));
var smallbuffer = smallbuffer.reduceToImage({
  properties: ['label'],
  reducer: ee.Reducer.first(), 
}).multiply(0).unmask(1).int();

var bufferotherlarge = lossImage_v.map(bufferBy(100));
var bufferotherlarge = bufferotherlarge.reduceToImage({
  properties: ['label'],
  reducer: ee.Reducer.first(), 
}).multiply(0).unmask(1).int();

// Create forest image using the loss image pixel 0 [=no loss] for forest adjacent to clearcuts
// Deselect pixel with buffer around small loss and other large loss
var lossImage = lossImage .updateMask(treecover.mask(treecover))
                          .updateMask(datamask.mask(datamask));
var noloss = lossImage.updateMask(lossImage.eq(0))
                      .updateMask(smallbuffer).add(1)
                      .updateMask(bufferotherlarge).add(1);

// Clip forest image with large area loss buffer
var result = noloss.clip(buffer1000);  
var scaleResult = result.projection().nominalScale();

var result_v = result.reduceToVectors({
  reducer: ee.Reducer.countEvery(), 
  geometry: geometry, 
  scale: scaleResult,
  maxPixels: 1e8
});

// Clip Landsat 7 ETM+ NDVI time series with mask containing forest areas adjacent to clearcuts of years 2009 and 2010
var LS_NDVI_0910 = LS7.map(function(image) {
  return image.clip(result_v);
});
Map.addLayer(LS_NDVI_0910.select('NDVI'),{palette: ['yellow','blue']},'LS NDVI');
print(LS_NDVI_0910);

// Exporting Landsat 7 ETM+ NDVI time series 2000-2018 in areas adjacent to clearcuts 2009 and 2010 
var LS_NDVI_0910 = LS_NDVI_0910.select('NDVI');
var CC_ETM_NDVI_0910 = LS_NDVI_0910.map(function(image) {
  return image.reduceRegions({
    collection: result_v.select('time:index'), 
    reducer: ee.Reducer.first().setOutputs(image.bandNames()), 
    scale: scale,
  }).filter(ee.Filter.neq('NDVI', null))
    .map(function(feature) {
    return feature.set({
      'imageID': image.id(),
      'timeMillis': image.get('system:time_start')
    });
  });
}).flatten();
print('CC_ETM_NDVI_0910',CC_ETM_NDVI_0910.first());

Export.table.toDrive({
  collection: CC_ETM_NDVI_0910, 
  description: 'CC_ETM_NDVI_0910', 
  fileFormat: 'CSV'
});


// MODIS NDVI time series every 16 days at a scale of 250 m
var MODIS_NDVI = ee.ImageCollection('MODIS/006/MOD13Q1')
    .filterDate(StartDate,EndDate)
    .filterBounds(geometry)
    .select('NDVI');
    
var MODIS_scale = MODIS_NDVI.first().projection().nominalScale();


// Rescale MODIS NDVI values
var MODIS_NDVI = MODIS_NDVI.map(function(img) {
  var rescaled_NDVI = img.select('NDVI')
                           .multiply(0.0001)
                           .rename('NDVI-1');
    return img.addBands(rescaled_NDVI).select('NDVI-1').rename('NDVI');
}); 

// Clip MODIS time series to desired area around clearcuts of 2009 and 2010
var MODIS_0910_NDVI = MODIS_NDVI.map(function(image) {
  return image.clip(result_v);
});
Map.addLayer(MODIS_0910_NDVI.select('NDVI'),{palette: ['c7d270','8add60']},'NDVI_MODIS');
print(MODIS_0910_NDVI);

// Exporting MODIS NDVI time series 2000-2018 in areas adjacent to clearcuts 2009 and 2010
var MODIS_0910_NDVI = MODIS_0910_NDVI.select('NDVI');
var CC_MOD_NDVI_0910 = MODIS_0910_NDVI.map(function(image) {
  return image.reduceRegions({
    collection: result_v.select('time:index'), 
    reducer: ee.Reducer.first().setOutputs(image.bandNames()), 
    scale: scale,
  }).filter(ee.Filter.neq('NDVI', null))
    .map(function(feature) {
    return feature.set({
      'imageID': image.id(),
      'timeMillis': image.get('system:time_start')
    });
  });
}).flatten();
print('CC_MOD_NDVI_0910',CC_MOD_NDVI_0910.first());

Export.table.toDrive({
  collection: CC_MOD_NDVI_0910, 
  description: 'CC_MOD_NDVI_0910', 
  fileFormat: 'CSV'
});