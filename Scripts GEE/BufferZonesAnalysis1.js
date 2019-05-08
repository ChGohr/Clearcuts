/* This script was produced by Charlotte Gohr for the master thesis

'Examining forest productivity under the impact of adjacent clearcuts 
using large-scale remote sensing time series data'

In this script, the NDVI time series pixel values for forest areas around clearcuts of the years 2009 and 2010 
are subdivided into buffer zones of 100 to 1000 m and prepared for export.*/

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

// Create feature for loss areas 2009 and 2010
var loss0910_v = loss0910.reduceToVectors({
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

/* Define buffer classes around large area loss polygons and
   add buffer to large area loss features */
var bufferBy = function(size){
  return function(feature){
    return feature.buffer(size);
  };
};
var buffer100 = largeLoss_v.map(bufferBy(100));
var buffer200 = largeLoss_v.map(bufferBy(200));
var buffer300 = largeLoss_v.map(bufferBy(300));
var buffer400 = largeLoss_v.map(bufferBy(400));
var buffer500 = largeLoss_v.map(bufferBy(500));
var buffer600 = largeLoss_v.map(bufferBy(600));
var buffer700 = largeLoss_v.map(bufferBy(700));
var buffer800 = largeLoss_v.map(bufferBy(800));
var buffer900 = largeLoss_v.map(bufferBy(900));
var buffer1000 = largeLoss_v.map(bufferBy(1000));

var allbuffer= ee.FeatureCollection([buffer100,buffer200,buffer300,buffer400,buffer500,
buffer600,buffer700,buffer800,buffer900,buffer1000]).flatten();

/* Define buffer class around small area loss polygons and
   add buffer to small area loss features */
var smallbuffer= smallLoss_v.map(bufferBy(100));
var smallbuffer = smallbuffer.reduceToImage({
  properties: ['label'],
  reducer: ee.Reducer.first(), 
}).multiply(0).unmask(1).int();

/* Create forest image using the loss image pixel 0 [=no loss] for forest adjacent to clearcuts
   Deselect pixel with buffer around small loss */
var lossImage = lossImage .updateMask(treecover.mask(treecover))
                          .updateMask(datamask.mask(datamask));
var noloss = lossImage.updateMask(lossImage.eq(0))
                      .updateMask(smallbuffer).add(1);

/* Create images of buffer classes: 
clip forest image (noloss) with buffer classes*/
var RFA100 = noloss.clip(buffer100).multiply(1).rename('buffer').int();
var RFA200 = noloss.clip(buffer200).multiply(2).rename('buffer').int();  
var RFA300 = noloss.clip(buffer300).multiply(3).rename('buffer').int();
var RFA400 = noloss.clip(buffer400).multiply(4).rename('buffer').int();
var RFA500 = noloss.clip(buffer500).multiply(5).rename('buffer').int();
var RFA600 = noloss.clip(buffer600).multiply(6).rename('buffer').int();
var RFA700 = noloss.clip(buffer700).multiply(7).rename('buffer').int();
var RFA800 = noloss.clip(buffer800).multiply(8).rename('buffer').int();
var RFA900 = noloss.clip(buffer900).multiply(9).rename('buffer').int();
var RFA1000 = noloss.clip(buffer1000).multiply(10).rename('buffer').int();

/* Create one image collection 
   containing numbers 1-10 referring to buffer zones */
var BZ = ee.ImageCollection([RFA100, RFA200, RFA300,RFA400,
RFA500,RFA600,RFA700,RFA800,RFA900,RFA1000]);

// Reduce with min value for each pixel
var BZ2 = BZ.reduce(ee.Reducer.min())
            .reproject('EPSG:32638',null,30);

Map.addLayer(BZ2,{min:1,max:10,palette:['00FF00','00FFFF']},'BZ2');

// Create feature collection to clip NDVI time series
var BZ2_v = BZ2.select('buffer_min').reduceToVectors({
  reducer: ee.Reducer.countEvery(), 
  geometry: geometry, 
  scale: scale,
  maxPixels: 1e8
});

// Add Buffer zones to NDVI time series
var LS7_BZ = LS7.map(function(image){
  return image.addBands(BZ2)
              .rename('NDVI','zone')
              .clip(BZ2_v);
});

// Create long-format list of NDVI time series and corresponding buffer zone 
var LS7_exp = LS7_BZ.select('NDVI');
var BufferzonesNDVI = LS7_exp.map(function(image) {
  return image.reduceRegions({
    collection: BZ2_v.select(['label']), 
    reducer: ee.Reducer.first().setOutputs(image.bandNames()), 
    scale: 30
  }).filter(ee.Filter.neq('NDVI', null))
    .map(function(feature) {
    return feature.set({
      'imageID': image.id(),
      'timeMillis': image.get('system:time_start')
    });
  });
}).flatten();
//print('BufferzonesNDVI',BufferzonesNDVI.first());


Export.table.toDrive({
  collection: BufferzonesNDVI, 
  description: 'BufferzonesNDVI', 
  fileFormat: 'CSV'
});

// Export Buffer zones image to create map
Export.image.toDrive({
  image: BZ2,
  description: 'Bufferzones0910',
  scale: 30,
  region: geometry
});