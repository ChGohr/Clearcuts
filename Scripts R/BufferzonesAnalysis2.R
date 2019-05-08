"This script was produced by Charlotte Gohr for the master thesis

'Examining forest productivity under the impact of adjacent clearcuts 
using large-scale remote sensing time series data'

In this script, the buffer zones of 100 to 1000 m around clearcuts of the years 2009 and 2010 are examined. 
Therefore, the difference of NDVI means of zones in 200 to 1000 meter distance around clearcuts 
to the first zone of 100 meters around clearcuts for each year are visualized."


# Needed packages and data
library(ggplot2)
library(dplyr)
BZ <- read.csv("./BufferzonesNDVI.csv", sep = ",")

# Select necessary data, set NDVI values smaller than 0 to 0
BZ <- BZ[,c("imageID","NDVI","label")]
BZ$NDVI <- replace(BZ$NDVI, BZ$NDVI < 0, 0)
BZ$AGG_M <- substr(BZ$imageID, 13, 18)
BZ$year <- substr(BZ$AGG_M, 1,4)

# Select July values
BZ$YM <- (strptime(paste(BZ$AGG_M, "010000"), format = "%Y%m%d%H%M", tz = "UTC"))
BZ <- BZ[as.numeric(strftime(BZ$YM, "%m")) %in% 7,]

# Observations per buffer zone and per year
table(BZ$year)

# Create mean per year
BZ_m <- aggregate(NDVI~AGG_M + label, BZ, mean)
BZ_m$year <- substr(BZ_m$AGG_M, 1, 4)
BZ_m <- BZ_m[,c("year","label","NDVI")]
BZ_m$year <- as.numeric(BZ_m$year)
# Create heatmap with NDVI values, a yearly correlation can be observed 
ggplot <- ggplot(BZ_m, aes(year,label)) +
        geom_tile(aes(fill = NDVI),colour = "white") +
        scale_fill_gradient(low = "#99FF99",high = "#006600")+
        theme_minimal() +
        theme(panel.grid.major = element_blank(), panel.grid.minor = element_blank()) +
        scale_y_continuous(breaks=seq(1, 10, 1),name = "zones")+
        scale_x_discrete(name ="")+
        coord_flip()
ggplot

# Create difference of NDVI values of buffer zones 200 - 1000 m to buffer zone 100 m
BZ_m <- BZ_m %>%
  group_by(year) %>%
  mutate(Diff = NDVI - lag(NDVI))
BZ_m$label <- BZ_m$label * 100
BZ_m$year <- as.numeric(BZ_m$year)

# Visualize
ggplot <- ggplot(BZ_m, aes(year,label)) +
  geom_tile(aes(fill = Diff),colour = "white") +
  scale_fill_gradient2(low = "#e83935",mid="#D9D9D9",high = "#0B456B",na.value = "#D9D9D9")+
  scale_y_continuous(breaks=seq(100, 1000, 100),name = "distance in m")+
  scale_x_continuous(breaks=seq(2000,2018,1),name ="")+
  theme_minimal() +
  theme(panel.grid.major = element_blank(), panel.grid.minor = element_blank()) +
  theme(axis.text.x = element_text(angle = 90,vjust = 0.5)) +
  coord_flip()
ggplot

# Statistics of difference values 
BZ_mm <- BZ_m[c(20:182),]
max(BZ_mm$Diff)
min(BZ_mm$Diff)
mean(BZ_mm$Diff)
hist(BZ_mm$Diff)
sd(BZ_mm$Diff)
