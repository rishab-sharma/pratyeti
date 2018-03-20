import csv
# Read in raw data from csv
rawData = csv.reader(open('./data/60_labels.csv', 'rb'), dialect='excel')
# the template. where data from the csv will be formatted to geojson
template = \
    ''' \
    { "type" : "Feature",
        "geometry" : {
            "type" : "Point",
            "coordinates" : [%s, %s]},
        "properties" : { "id" : %s, "unixTime" : "%s", "msgtext" : "%s", "userID": "%s"}
        },
    '''
# the head of the geojson file
output = \
    ''' \
{ "type" : "Feature Collection",
    "features" : [
    '''
# loop through the csv by row skipping the first
iter = 0
for row in rawData:
    # iter += 1
    # if iter >= 2:
    id = row[2]
    lat = row[1]
    lon = row[2]
    unixTime = row[1]
    msgtext = row[3]
    userID = row[4]
    # output += template % (row[0], row[2], row[1], row[3], row[4])
    output += template % (lon, lat,  id,  unixTime, msgtext, userID)
    
# the tail of the geojson file
output += \
    ''' \
    ]
}
    '''
    
# opens an geoJSON file to write the output to
outFileHandle = open("target.geojson", "w")
outFileHandle.write(output)
outFileHandle.close()