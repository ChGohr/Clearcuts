"This script was produced by Charlotte Gohr for the master thesis

'Examining forest productivity under the impact of adjacent clearcuts 
using large-scale remote sensing time series data'

In this script, the NDVI time series of Landsat 7 ETM+ is correlated with the MODIS NDVI time series
as well as with time series of temperature and precipitation using the Mann-Kendall correlation test.
Additionally, the trend of climate variables is estimated using the Mann-Kendall trend test
with reference to https://moc.online.uni-marburg.de/doku.php?id=courses:msc:msc-phygeo-data-analysis:code-examples:da-ce-11-1."

# Needed packages and data
library(ggplot2)
library(dplyr)
CC_ETM_NDVI <- read.table("./CC_ETM_NDVI_0910.csv",sep = ",", header = TRUE)
CC_MOD_NDVI <- read.table("./CC_MOD_NDVI_0910.csv",sep = ",", header = TRUE)
pr <- read.table("./exp_pr.csv",sep = ",", header = TRUE)
tmmx <- read.csv("./exp_tmmx.csv", sep = ",")
tmmn <- read.csv("./exp_tmmn.csv", sep = ",")

## CC ETM+ NDVI
# Aggregate data to monthly and yearly data
CC_ETM_NDVI <- CC_ETM_NDVI[,c("imageID","NDVI")]
CC_ETM_NDVI$YM <- substr(CC_ETM_NDVI$imageID, 13, 18)
CC_ETM_NDVI$year <- substr(CC_ETM_NDVI$YM, 1,4)

# Select July values
CC_ETM_NDVI$YM <- strptime(paste(CC_ETM_NDVI$YM, "010000"), format = "%Y%m%d%H%M", tz = "UTC")
CC_ETM_NDVI <- CC_ETM_NDVI[as.numeric(strftime(CC_ETM_NDVI$YM, "%m")) %in% 7,]

## CC MOD NDVI
# Aggregate data to monthly and yearly data
CC_MOD_NDVI <- CC_MOD_NDVI[,c("imageID","NDVI")]
CC_MOD_NDVI$imageID <- sub("_","",CC_MOD_NDVI$imageID)
CC_MOD_NDVI$YM <- substr(CC_MOD_NDVI$imageID, 1, 6)
CC_MOD_NDVI$year <- substr(CC_MOD_NDVI$imageID, 1, 4)

# Select July values
CC_MOD_NDVI$YM <- strptime(paste(CC_MOD_NDVI$YM, "010000"), format = "%Y%m%d%H%M", tz = "UTC")
CC_MOD_NDVI <- CC_MOD_NDVI[as.numeric(strftime(CC_MOD_NDVI$YM, "%m")) %in% 7,]

## Precipitation
# Aggregate data to monthly and yearly data
pr <- pr[,c("imageID","pr")]
names(pr) <- c("date","pr")
pr$YM <- substr(pr$date,1,6)
pr$year <- substr(pr$YM,1,4)
pr_y <- aggregate(pr$pr, by = list(pr$YM), FUN = "sum")
names(pr_y) <-c("year","pr_sum") 

## Temperature
# Get mean by using minimum and maximum temperature per month
tx <- tmmx
tx$tmmn <- tmmn$tmmn
tx$tmean <-  rowMeans(tx[c("tmmx", "tmmn")])

# Aggregate data to monthly and yearly data
t <- tx[,c("imageID","tmean")]
names(t) <- c("date","tmean")
t$YM <- substr(t$date,1,6)
t$year <- substr(t$YM,1,4)
t_y <- aggregate(t$tmean, by = list(t$YM), FUN = "mean")
names(t_y) <-c("year","tmean") 
t_y$year<- as.numeric(t_y$year)

## Trend analysis for temperature and precipitation
# Visualize data 
ggplot() +
  geom_boxplot(data = pr, aes(x=year,y=pr,group=year,color='pr'),alpha=0.5)

ggplot() +
  geom_boxplot(data = t, aes(x=year,y=tmean,group=year,color='t'),alpha=0.5)

# Check autocorrelation and seasonality with the autocorrelation funcion acf and 
# Partial autocorrelation function 
acf(pr_y$pr_sum)
pacf(pr_y$pr_sum)
spec <- spectrum(pr_y$pr_sum)
plot(1/spec$freq, spec$spec, type = "h")
1/spec$freq[spec$spe == max(spec$spec)] # 12

acf(t_y$tmean)
pacf(t_y$tmean)
spec <- spectrum(t_y$tmean)
plot(1/spec$freq, spec$spec, type = "h")
1/spec$freq[spec$spe == max(spec$spec)] # 12


# Clean seasonality by subtracting the mean of each month from the actual monthly temperature
# Result: deviation from the mean for each month
pr_m <- aggregate(pr$pr, by = list(pr$YM), FUN = "mean")
names(pr_m) <- c("date","pr_mean")
pr_m$month <- substr(pr_m$date,5,6)
monthly_mean <- aggregate(pr_m$pr, by = list(pr_m$month), FUN = mean)
pr_m$pr_minus_mean <- pr_m$pr - monthly_mean$x

t_m <- aggregate(t$tmean, by = list(t$YM), FUN = "mean")
names(t_m) <- c("date","tmean")
t_m$month <- substr(t_m$date,6,7)
monthly_mean <- aggregate(t_m$tmean, by = list(t_m$month), FUN = mean)
t_m$t_minus_mean <- t_m$tmean - monthly_mean$x

# Linear model with a continuous time variable
ts <- seq(2000, 2017+11/12, length = nrow(pr_m))
mod_ts_pr <- lm(pr_m$pr_minus_mean ~ ts)
mod_ts_t <- lm(t_m$t_minus_mean ~ ts)

# Show results
pr_m$date <- strptime(paste(pr_m$date, "010000"), format = "%Y%m%d%H%M", tz = "UTC")
pr_m$datePOS <- as.POSIXct(pr_m$date,origin="2000-01-01",tz = "UTC")
ggplot(data = pr_m, aes(x=pr_m$datePOS)) +
  geom_line(aes(y=pr_m$pr_minus_mean),alpha=0.7)+
  geom_smooth(aes(y=pr_m$pr_minus_mean),col="red",method = "lm")+
  theme_bw() +
  theme(axis.text.x = element_text(angle = 90,vjust = 0.5)) +
  labs(y = "deviation of mean PPT",x="")

t_m$date <- strptime(paste(t_m$date, "010000"), format = "%Y%m%d%H%M", tz = "UTC")
t_m$datePOS <- as.POSIXct(t_m$date,origin="2000-01-01",tz = "UTC")
ggplot(data = t_m, aes(x=t_m$datePOS)) +
  geom_line(aes(y=t_m$t_minus_mean),alpha=0.7)+
  geom_smooth(aes(y=t_m$t_minus_mean),col="red",method = "lm")+
  theme_bw() +
  theme(axis.text.x = element_text(angle = 90,vjust = 0.5), axis.ticks.x =element_line()) +
  labs(y = "deviation of mean T",x="")

# Mann-Kendall Test
Kendall::MannKendall(pr_m$pr_minus_mean)
Kendall::MannKendall(t_m$t_minus_mean)

## Correlation of ETM+ NDVI time series with temperature and precipitation
# Get mean values of NDVI per year, add NA for year 2005
NDVI_m <- aggregate(CC_ETM_NDVI$NDVI, by = list(CC_ETM_NDVI$year), FUN = "mean")
names(NDVI_m) <- c("date","NDVI_mean")
NDVI_m[nrow(NDVI_m) + 1,] = list("2005","NA")
NDVI_m <- NDVI_m %>% arrange(date)
NDVI_m <- NDVI_m[c(1:18),]
NDVI_m$NDVI_mean <- as.numeric(NDVI_m$NDVI_mean)

# Get  temperature mean of January-July per year 
# Get precipitation sum of January-July per year 
pr$date <- (strptime(paste(pr$date, "010000"), format = "%Y%m%d%H%M", tz = "UTC"))
ppt_jan_jul <- pr[as.numeric(strftime(pr$date, "%m")) %in% 1:7,]
ppt_jan_jul <- aggregate(ppt_jan_jul$pr, by = list(ppt_jan_jul$year), FUN = "sum")

t$date <- (strptime(paste(t$date, "010000"), format = "%Y%m%d%H%M", tz = "UTC"))
t_jan_jul <- t[as.numeric(strftime(t$date, "%m")) %in% 1:7,]
t_jan_jul <- aggregate(t_jan_jul$tmean, by = list(t_jan_jul$year), FUN = "mean")


cor.test(ppt_jan_jul$x,NDVI_m$NDVI_mean, method = "kendall")
cor.test(t_jan_jul$x,NDVI_m$NDVI_mean, method = "kendall")

## Execute Mann-Kendall correlation test for CC ETM+ NDVI and CC MOD NDVI
CC_ETM_m <- aggregate(CC_ETM_NDVI$NDVI, by = list(CC_ETM_NDVI$year), FUN = "mean")
names(CC_ETM_m) <- c("date","NDVI_mean")
CC_ETM_m[nrow(CC_ETM_m) + 1,] = as.numeric(list("2005","NA"))
CC_ETM_m <- CC_ETM_m %>% arrange(date)

CC_MOD_m <- aggregate(CC_MOD_NDVI$NDVI, by = list(CC_MOD_NDVI$year), FUN = "mean")
names(CC_MOD_m) <- c("date","NDVI_mean")

cor.test(CC_ETM_m$NDVI_mean,CC_MOD_m$NDVI_mean, method = "kendall")
