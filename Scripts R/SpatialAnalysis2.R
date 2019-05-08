"This script was produced by Charlotte Gohr for the master thesis

'Examining forest productivity under the impact of adjacent clearcuts 
using large-scale remote sensing time series data'

In this script, the distance of every small loss area (number: 21208) occurred in 2009 to 2018 
to every large loss polygon (number: 16) occured in 2009 and 2010 is visualized."

# Needed packages and data
library(ggplot2)
library(dplyr)
dist <- read.csv("./DistanceDiffuseForestToClearcut.csv", sep = ",")

# Convert distance in meters to kilometers
dist <- dist[,c("system.index","distance")]
dist$distance <- dist$distance / 1000
# Get clearcut id column
dist$ID <- substr(dist$system.index, 1, 13)
# Boxplots of 129 clearcut areas and the variance in distance of small loss
seq <- seq(1:16)
ggplot() +
  geom_boxplot(data = dist, aes(x=dist$ID,y=dist$distance,group=dist$ID),
               alpha=0.7,outlier.alpha = 0.1)+
  theme_bw()+
  theme(axis.text.y=element_blank(), axis.ticks.y=element_blank())+
  labs(x="",y="distance in km")+
  coord_flip()

# Get range of means and standard deviation
dist_means <- tapply(dist$distance, dist$ID, mean)
dist_sd <- tapply(dist$distance, dist$ID, sd)
dist_range <- tapply(dist$distance, dist$ID, sum)
min(dist_means)
max(dist_means)
min(dist_sd)
max(dist_sd)
barplot(dist_means)
barplot(dist_sd)