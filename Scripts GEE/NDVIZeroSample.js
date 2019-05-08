/* This script was produced by Charlotte Gohr for the master thesis

'Examining forest productivity under the impact of adjacent clearcuts 
using large-scale remote sensing time series data'

In this script, the NDVI time series pixel values for forest areas in more than 1 km distance to clearcuts
are prepared. Landsat 7 ETM+ time series are exported.
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
//Map.addLayer(lossImage.mask(lossImage),{min:1,max:18,palette:['00FF00','00FFFF']},'lossImage')  


// Calculate NDVI
var addNDVI = function(image) {
  var ndvi= image.normalizedDifference(['B4', 'B3'])
  .rename('NDVI').double();
  return image.addBands(ndvi);
};

var LS7 = LS7
  .map(addNDVI)
  .select('NDVI');
print(LS7);

// Create area of interest, forest cover in more than 1 km distance to large loss areas
var lossImagemasked = lossImage.mask(lossImage);
var loss_v = lossImagemasked.reduceToVectors({
  reducer: ee.Reducer.countEvery(), 
  geometry: geometry, 
  scale: scale,
  maxPixels: 1e8
});

var loss_v = loss_v.map(function(feature) {
  return feature.set(
    {areasqm: feature.geometry().area(1)});
});
var largeLoss_v = loss_v.filter(ee.Filter.gt('areasqm', 500000));

var buffer = function(feature) {
  return feature.buffer(1000);   
};

var buffer_v = largeLoss_v.map(buffer);

// Create forest image using the loss image pixel 0 [=no loss] for forest in distance to clearcuts
var noloss = ee.Image(lossImage)
  .updateMask(lossImage.eq(0));
var noloss = noloss.select('lossyear').eq(0); 

// Transform buffer to image mask
var buffer_i = buffer_v.reduceToImage({
  properties : ['label'],
  reducer: ee.Reducer.first()
 });

var buffer_i = buffer_i.select('first').eq(0);
var buffer_i = buffer_i.unmask(1);

// Create and vectorize zero sample by masking forest cover with buffer around clearcuts  
var zerosample = noloss.updateMask(buffer_i);

var zerosample_v = zerosample.reduceToVectors({
  reducer: ee.Reducer.countEvery(), 
  geometry: geometry, 
  scale: scale,
  maxPixels: 1e8
});

// Clip Landsat 7 ETM+ NDVI time series with mask containing forest areas in more than 1 km distance to clearcuts
var zs_NDVI = LS7.map(function(image) {
  var clip = image.clip(zerosample_v);
  return image.addBands(clip)
    .rename('NDVI1','NDVI')
    .select('NDVI');
});
Map.addLayer(zs_NDVI,{},'Zero sample NDVI');

// Exporting Landsat 7 ETM+ NDVI time series 2000-2018 in distance to clearcuts
var ZS_ETM_NDVI = zs_NDVI.map(function(image) {
  return image.reduceRegions({
    collection: zerosample_v.select('time:index'), 
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
print('ZS_ETM_NDVI',ZS_ETM_NDVI.first());

Export.table.toDrive({
  collection: ZS_ETM_NDVI, 
  description: 'ZS_ETM_NDVI', 
  fileFormat: 'CSV'
});