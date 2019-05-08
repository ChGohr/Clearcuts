/* This script was produced by Charlotte Gohr for the master thesis

'Examining forest productivity under the impact of adjacent clearcuts 
using large-scale remote sensing time series data'

In this script, the distance of diffuse forest loss to clearcut areas is calculated for export.
The threshold to define clearcuts and diffuse forest loss is defined at 50 ha. 
Clearcuts are restricted to loss events in the years 2009 and 2010, diffuse loss is observed in the years 2009 to 2018.
*/

// create area
var geometry = ee.Geometry.Polygon(
        [[[44.795899216420594, 63.522212732449646],
          [43.373169724233094, 63.51853879838433],
          [43.370423142201844, 63.20452110470073],
          [44.817871872670594, 63.20328289951032]]]);
Map.setCenter(44,63.35, 9.5);

// set masks
var datamask = ee.Image('UMD/hansen/global_forest_change_2018_v1_6')
    .select('datamask')
    .clip(geometry);
var treecover = ee.Image('UMD/hansen/global_forest_change_2018_v1_6')
    .select('treecover2000')
    .clip(geometry);

// mask water
var landMask = function(image) {
var mask = datamask.eq(1);
return image.updateMask(mask);
};
// mask non-treecover-pixel
var nontreeMask = function(image) {
var mask = treecover.mask(treecover);
return image.updateMask(mask);
};

// load imagery and apply masks
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


// select forest loss of years 2009 and 2010
var loss0910 = lossImage
  .updateMask(lossImage.eq(9).or(lossImage.eq(10)));
Map.addLayer(loss0910,{palette:'red'},'loss0910');  


// create feature for loss areas 2009 and 2010, and in total
var loss0910_v =  loss0910.reduceToVectors({
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

/*  split loss in small and large areas by
    adding area in square meters to every feature */
var lossarea = loss.clip(lossImage_v).multiply(ee.Image.pixelArea());
var lossarea_v = lossarea.reduceToVectors({
  reducer: ee.Reducer.countEvery(), 
  geometry: geometry, 
  scale: scale,
  maxPixels: 1e8
});

var lossarea_v = lossImage_v.map(function(feature) {
  return feature.set(
    {areasqm: feature.geometry().area(1)});
});

var loss0910_v = loss0910_v.map(function(feature) {
  return feature.set(
    {areasqm: feature.geometry().area(1)});
});

// Threshold of 50 ha for small and large loss areas
// large loss areas of the years 2009 and 2010
// small loss areas of the years 2009 to 2018
var largeLoss_v = loss0910_v.filter(ee.Filter.gt('areasqm', 500000));
var smallLoss_v = lossarea_v.filter(ee.Filter.lt('areasqm',500000))
                            .filter(ee.Filter.gte('label', 9));

//print('count small loss:', smallLoss_v.aggregate_stats('count')); // 21208 small Loss areas
//print('count large loss:', largeLoss_v.aggregate_stats('count')); // 16 large Loss areas

// Create distance filter within a distance of 100 km and a join function
var distFilter = ee.Filter.withinDistance({
  distance: 100000,
  leftField: '.geo',
  rightField: '.geo',
  maxError: 10
});

var distinner = ee.Join.inner({
  measureKey: 'distance'
});
// Apply join function to get the distance in meters from every small loss area (21208) to every large loss polygon (16)
var DistanceDiffuseForestToClearcut = distinner.apply(largeLoss_v, smallLoss_v, distFilter);
print(DistanceDiffuseForestToClearcut.first());

Export.table.toDrive({
  collection: DistanceDiffuseForestToClearcut,
  description: 'DistanceDiffuseForestToClearcut',
  fileFormat: 'CSV'
});