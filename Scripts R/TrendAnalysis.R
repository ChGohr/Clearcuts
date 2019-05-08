"This script was produced by Charlotte Gohr for the master thesis

'Examining forest productivity under the impact of adjacent clearcuts 
using large-scale remote sensing time series data'

In this script, the trend of July NDVI time series of 
 - Landsat 7 ETM+ adjacent to clearcuts of years 2009 and 2010 (CC ETM+ NDVI) 
 - Landsat 7 ETM+ in more than 1 km distance to clearcuts of years 2001 to 2018 (ZS ETM+ NDVI) and 
 - MODIS adjacent to clearcuts of years 2009 and 2010 (CC MOD NDVI) are estimated. 
Additionally, CC ETM+ NDVI and ZS ETM+ NDVI are compared using the Kruskal-Wallis test."


# Needed packages and data
library(ggplot2)
library(dplyr)
CC_ETM_NDVI <- read.table("./CC_ETM_NDVI_0910.csv",sep = ",", header = TRUE)
ZS_ETM_NDVI <- read.table("./ZS_ETM_NDVI.csv",sep = ",", header = TRUE)
CC_MOD_NDVI <- read.table("./CC_MOD_NDVI_0910.csv",sep = ",", header = TRUE)

## CC ETM+ NDVI
# Aggregate data to monthly and yearly data
CC_ETM_NDVI <- CC_ETM_NDVI[,c("imageID","NDVI")]
CC_ETM_NDVI$YM <- substr(CC_ETM_NDVI$imageID, 13, 18)
CC_ETM_NDVI$year <- substr(CC_ETM_NDVI$YM, 1,4)

# Select July values
CC_ETM_NDVI$YM <- strptime(paste(CC_ETM_NDVI$YM, "010000"), format = "%Y%m%d%H%M", tz = "UTC")
CC_ETM_NDVI <- CC_ETM_NDVI[as.numeric(strftime(CC_ETM_NDVI$YM, "%m")) %in% 7,]
table(CC_ETM_NDVI$year)

## ZS ETM+ NDVI
# Aggregate data to monthly and yearly data
ZS_ETM_NDVI <- ZS_ETM_NDVI[,c("imageID","NDVI")]
ZS_ETM_NDVI$YM <- substr(ZS_ETM_NDVI$imageID, 13, 18)
ZS_ETM_NDVI$year <- substr(ZS_ETM_NDVI$YM, 1,4)

# Select July values
ZS_ETM_NDVI$YM <- strptime(paste(ZS_ETM_NDVI$YM, "010000"), format = "%Y%m%d%H%M", tz = "UTC")
ZS_ETM_NDVI <- ZS_ETM_NDVI[as.numeric(strftime(ZS_ETM_NDVI$YM, "%m")) %in% 7,]

## CC MOD NDVI
# Aggregate data to monthly and yearly data
CC_MOD_NDVI <- CC_MOD_NDVI[,c("imageID","NDVI")]
CC_MOD_NDVI$imageID <- sub("_","",CC_MOD_NDVI$imageID)
CC_MOD_NDVI$YM <- substr(CC_MOD_NDVI$imageID, 1, 6)
CC_MOD_NDVI$year <- substr(CC_MOD_NDVI$imageID, 1, 4)

# Select July values
CC_MOD_NDVI$YM <- strptime(paste(CC_MOD_NDVI$YM, "010000"), format = "%Y%m%d%H%M", tz = "UTC")
CC_MOD_NDVI <- CC_MOD_NDVI[as.numeric(strftime(CC_MOD_NDVI$YM, "%m")) %in% 7,]

## Get sample of 150 values per year for each time series
CC_ETM <-CC_ETM_NDVI[,c("NDVI","year")]
CC_by_year <- CC_ETM %>% group_by(year)
CC_ETM <- as.data.frame(sample_n(CC_by_year, 150, replace = TRUE))
CC_ETM$type <- "CC ETM+"

ZS_ETM <-ZS_ETM_NDVI[,c("NDVI","year")]
ZS_by_year <- ZS_ETM %>% group_by(year)
ZS_ETM <- as.data.frame(sample_n(ZS_by_year, 150, replace = TRUE))
ZS_ETM$type <- "ZS ETM+"

CC_MOD <- CC_MOD_NDVI[,c("NDVI","year")]
MOD_by_year <- CC_MOD %>% group_by(year)
CC_MOD <- as.data.frame(sample_n(MOD_by_year, 150, replace = TRUE))
CC_MOD$type <- "CC MOD"

## Merge data sets and display distribution as boxplot graphics
CC_ZS <- rbind(ZS_ETM,CC_ETM)
ETM_MOD <- rbind(CC_MOD,CC_ETM)

ggplot(aes(y = NDVI, x = year, fill = type), data = CC_ZS) + geom_boxplot()+
  scale_y_continuous(limits = c(0.5, 1))

ggplot(aes(y = NDVI, x = year, fill = type), data = ETM_MOD)+geom_boxplot()+
  scale_y_continuous(limits = c(0.5, 1))

# Mann-Kendall Trend test for each time series
Kendall::MannKendall(CC_ETM$NDVI)
CC_ETM$year <- as.numeric(CC_ETM$year)
cor.test(CC_ETM$NDVI,CC_ETM$year, method = "kendall")

Kendall::MannKendall(ZS_ETM$NDVI)
ZS_ETM$year <- as.numeric(ZS_ETM$year)
cor.test(ZS_ETM$NDVI,ZS_ETM$year, method = "kendall")

Kendall::MannKendall(CC_MOD$NDVI)
CC_MOD$year <- as.numeric(CC_MOD$year)
cor.test(CC_MOD$NDVI,CC_MOD$year, method = "kendall")

## Execute Kruskal-Wallis test for CC ETM+ NDVI and ZS ETM+ NDVI
# Exclude values of CC MOD NDVI and ZS ETM+ NDVI as CC ETM+ NDVI does not contain values for 2005
CC_MOD <- CC_MOD[!(CC_MOD$year=="2005"),]
ZS_ETM <- ZS_ETM[!(ZS_ETM$year=="2005"),]

kruskal.test(ZS_ETM$NDVI~CC_ETM$NDVI)