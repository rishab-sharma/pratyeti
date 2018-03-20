from flask import Flask, render_template, request , session , Response
import flask , os
import pandas as pd
import json
from flask_cors import CORS, cross_origin
from info import cluster_info
from utility import maker
import datetime
import requests
import random

x,y,ndis = maker()
#x is long
#y is lat
app = Flask(__name__)

datetime.datetime.today()
hour = datetime.datetime.today().hour

if hour >= 19 or hour <= 5:
	hour_safe = 2
else:
	hour_safe = 1

CORS(app, resources={r"/*": {"origins": "*"}})
app.config['CORS_ALLOW_HEADERS'] = ( 'accept','accept-encoding','authorization','content-type','dnt','origin','user-agent','x-csrftoken','x-requested-with')
app.config["CORS_SUPPORTS_CREDENTIALS"] = True

ann = [1 , -1 , 2 , 1 , -2  , -1 , 1 ]

# def report_(loc):
# 	lat = int(loc['lat'])
# 	lon = int(loc['lon'])
# 	consi = []
# 	ps = []
# 	conso = []
# 	for i in range(len(x)):
# 		d1 = x[i] - lon
# 		d2 = y[i] - lat
# 		d = ((d1**2 - d2**2)**(.5))
# 		if (d<0.2):
# 			consi.append(i)
# 			ps.append(d)
# 			conso.append(ndis[i])
# 	area = '0.1256 sq unit'
	
# 	# equation => lat - m*long = c
# 	# f( lat , long , danger_index , hour_safe ) = m*(mean(sum|((lat - y)^2 + (long - x)^2)^0.5|))*(1/(mean(danger_index)))*hour_safe
# 	# g( lat , long , danger_index , hour_safe ) => mean(sum|((lat - y)^2 + (long - x)^2)^0.5|) - 0.2 <= 0
# 	# f1 = m*(mean(ps))*(1/(mean(conso)))*hour_safe
# 	# g1 = 
# 	return ( len(consi) , ps , safe , area )

def traffic(val , lat , lon):
	if val == 0.4:
		print(lat)
		anno = random.choice(ann)
		print(anno)
		lat = round(lat,3)+(0.002*anno)
		lon = round(lon,3)+(0.002*anno)
		return {'density':0.6 , 'latlong':[lat , lon]}
	else:
		return {'density':0.2 , 'latlong':[lat+0.4 , lon+0.4]}	

def safety(loc):
	lat = loc['lat']
	lon = loc['lon']
	#safe_eq = x*(1-x)*(e**x)
	eq = 'x(1-x)e%5Ex'
	safe = json.loads(requests.get("https://api.wolframalpha.com/v2/query?input=maximize+x(1-x)e%5Ex&format=image,plaintext&output=JSON&appid=KRP4L7-KR897W7E2R").content)
	safe = safe['queryresult']['pods'][1]['subpods'][0]['plaintext']
	print(safe)
	safe = 0.6 # Approx Value
	for i in range(1,10):
		val = 0.1*i
		pop = traffic(val , lat , lon)
		if safe == pop['density']:
			return ({'lat':pop['latlong'][0],'lon':pop['latlong'][1]})
	else:
		return ["No Nearest population located"]


def safest_route(rt):
	#print(rt['routes'][0]['steps'][0]['maneuver']['location']['coordinates'])
	routes = rt['routes']
	rna = []
	for i in routes:
		rd = i['distance']
		rn = 0
		for j in i['steps']:
			latlong = j['maneuver']['location']['coordinates']
			lat = latlong[1]
			lon = latlong[0]
			consi = []
			ps = []
			for k in range(len(x)):
				d = x[k] - lon
				d1 = y[k] - lat
				diff = (d**(2) + d1**(2))**(.5)
				if (diff < 0.2):
					consi.append(k)
					ps.append(diff)
			sp = 0
			for k in range(len(consi)):
				if ndis[consi[k]] != 0:
					sp += ps[k]/ndis[consi[k]]
			if len(consi) != 0:
				rn += (sp/len(consi))
		rn = rn/((rd+0.1)/1000)
		if rn != 0:
			rna.append(rn*hour_safe*1000)
		else:
			rna.append(5)
	return rna


@app.route('/',methods=['GET','POST'])
def index():
	print("Index")
	return render_template('index2.html')


@app.route('/heat',methods=['GET','POST'])
def heat():
	return render_template('heat.html')

@app.route('/bc',methods=['GET','POST'])
def bc():
	msg1 = request.get_json()
	#cprint(request.data)
	rt = json.loads(request.data)
	print(rt)
	print(len(rt['result']))
	return "hello"

@app.route('/cluster',methods=['GET','POST'])
def cluster():
	return render_template('cluster.html')


@app.route('/data',methods=['GET','POST'])
def data():
	return render_template('data.html')


@app.route('/route',methods=['GET','POST'])
def route():
	msg = request.get_json()
	loc = json.loads(request.data)
	rna = safest_route(loc)
	analysis = {'Routes':rna}
	print(analysis)
	analysis = flask.jsonify(analysis)
	return analysis

@app.route('/route_map',methods=['GET','POST'])
def route_map():
	return render_template('route.html')

@app.route('/sos',methods=['GET','POST'])
def sos():
	msg = request.get_json()
	rd = json.loads(request.data)
	print(rd)
	print("I AM SOS")
	ans = safety(rd)
	return flask.jsonify(ans)

@app.route('/sos1',methods=['GET','POST'])
def sos1():
	return render_template('sos.html')

@app.route('/report',methods=['GET','POST'])
def report():
	msg = request.get_json()
	rd = json.loads(request.data)
	( nc , local_dis , safe , area ) = report_(rd)
	analysis = {'near_cluster': nc , 'local_dis': local_dis , 'safe': safe , 'area_into_consi': area}
	print(analysis)
	analysis = flask.jsonify(analysis)
	return analysis
# @app.after_request
# def after_request(response):
#   response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5000')
#   response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
#   response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
#   response.headers.add('Access-Control-Allow-Credentials', 'true')
#   return response

if __name__ == '__main__':
	port = int(os.environ.get('PORT', 5000))
	app.run(host='0.0.0.0' , port = port , debug=True)









