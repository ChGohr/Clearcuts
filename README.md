# Clearcuts
This code is part of my master thesis 'Examining forest productivity under the impact of adjacent clearcuts  using large-scale remote sensing time series data'. 
It presents a workflow to extract series of forest NDVI adjacent to clearcuts and climate data from 2000 to 2018 using Google Earth Engine and R for further statistical analysis.

Subsequently, all Scripts and a short discription are listed.

### AreaOverview.js
In this script, the size of the study area, the tree cover size and forest loss size 
are calculated.

### BufferZonesAnalysis.js
In this script, the NDVI time series pixel values for forest areas around clearcuts of the years 2009 and 2010 
are subdivided into buffer zones of 100 to 1000 m and prepared for export.

### Climate
In this script, the time series pixel values for temperature and precipitation in the study area
between 2000 and 2017 are prepared and exported. 

### NDVITimeSeries.js
In this script, the NDVI time series pixel values for forest areas around clearcuts of the years 2009 and 2010 
are prepared. Landsat 7 ETM+ time series and NASA Terra MODIS time series are exported.

### NDVIZeroSample.js
In this script, the NDVI time series pixel values for forest areas in more than 1 km distance to clearcuts
are prepared. Landsat 7 ETM+ time series are exported.

### SpatialAnalysis1.js
In this script, the distance of diffuse forest loss to clearcut areas is calculated for export.
The threshold to define clearcuts and diffuse forest loss is defined at 50 ha. 
Clearcuts are restricted to loss events in the years 2009 and 2010, diffuse loss is observed in the years 2009 to 2018.

### BufferzonesAnalysis2.R
In this script, the buffer zones of 100 to 1000 m around clearcuts of the years 2009 and 2010 are examined. 
Therefore, the difference of NDVI means of zones in 200 to 1000 meter distance around clearcuts 
to the first zone of 100 meters around clearcuts for each year are visualized."

### NDVIClimateCorrelation.R
In this script, the NDVI time series of Landsat 7 ETM+ is correlated with the MODIS NDVI time series
as well as with time series of temperature and precipitation using the Mann-Kendall correlation test.
Additionally, the trend of climate variables is estimated using the Mann-Kendall trend test

### SpatialAnalysis2.R
In this script, the distance of every small loss area (number: 21208) occurred in 2009 to 2018 
to every large loss polygon (number: 16) occured in 2009 and 2010 is visualized.

### TrendAnalysis.R
In this script, the trend of July NDVI time series of 
 - Landsat 7 ETM+ adjacent to clearcuts of years 2009 and 2010 (CC ETM+ NDVI) 
 - Landsat 7 ETM+ in more than 1 km distance to clearcuts of years 2001 to 2018 (ZS ETM+ NDVI) and 
 - MODIS adjacent to clearcuts of years 2009 and 2010 (CC MOD NDVI) are estimated. 
Additionally, CC ETM+ NDVI and ZS ETM+ NDVI are compared using the Kruskal-Wallis test.
