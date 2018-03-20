#!/usr/bin/env python2
# -*- coding: utf-8 -*-
"""
Created on Sat Mar 10 14:56:19 2018

@author: rishab
"""
from __future__ import print_function
from sklearn.cluster import KMeans
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd


df = pd.read_csv('data/fir.csv' , sep=',')

#sprint(df)

X = df[['Longitude','Latitude']]

#print(X)

np.random.seed(19680801)
clusters = 60
limit = 500
N = 12925
dictionary = {'Chain':0.03 , 'Hit And Run':0.07 , 'Kidnap':0.09 , 'Murder':0.1 , 'Pick':0.03 , 'Rape':0.1 , 'Robery':0.07 , 'Violence and Offence':0.09}

x = X[['Longitude']]
x = x[0:limit]
y = X[['Latitude']]
y = y[0:limit]
# colors = np.random.rand(N)
# area = np.pi * (3 * np.random.rand(N))**2  # 0 to 15 point radii

plt.scatter(x, y, alpha=0.5)
plt.show()

clusterer = KMeans(n_clusters= clusters, random_state=1 , max_iter = 100000)
cluster_labels = clusterer.fit_predict(X)

df2 = pd.DataFrame(data = cluster_labels , columns = ['Cluster_Index'])

centers = clusterer.cluster_centers_

x = centers[:,0]
y = centers[:,1]


result = pd.concat([df, df2] , axis = 1)

#print(result)

plt.scatter( x , y , alpha=0.5)
plt.show()

tags = np.unique(result['Cluster_Index'].as_matrix())
crimes = np.unique(result['crime'].as_matrix())

dump = []
dis = []

op = pd.DataFrame(columns = [u'index', u'Unnamed: 0', u'Month', u'Longitude', u'Latitude', u'hours',
       u'minutes', u'crime', u'Cluster_Index', u'danger_index'])

for i in tags:
    pic = result[result['Cluster_Index']==i].reset_index()
    arr = pic.groupby('crime').count()['Longitude']
    di = 0
    for j in crimes:
        di += dictionary[j]*arr[j]
    arr2 = arr.as_matrix()
    dump.append(arr2)
    dis.append(int(di))
    temp = pd.DataFrame(data=[dis[i]]*len(pic) , columns = ['danger_index'])
    dff = pd.concat([pic , temp] , axis = 1)
    op = pd.concat([op , dff] , axis = 0)
    #dff.to_csv('data/cluster_{}.csv'.format(str(i)))

op = op.reset_index()
op = op.drop(['index' , 'level_0'] , axis = 1)
op = op.loc[:, ~op.columns.str.contains('^Unnamed')]

print(op)

op.to_csv('data/{}_labels.csv'.format(clusters))

avg = []
for i in tags:
    con = result[result['Cluster_Index']==i].reset_index()
    timeline = con[['Month']]
    timeline = timeline.as_matrix()
    late = []
    for j in timeline:
        later = 2018 - int(j[0][0:4])
        late.append(later)
    a = np.array(late)
    n = np.mean(a)
    avg.append(round(n,2))
print(len(avg))
ndis = []
for i in range(len(avg)):
    ndis.append(int(round(dis[i]*(1/avg[i])*10 , 0)))
print(ndis)




