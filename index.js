var cfg = require('./config.json');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var ts = require('node-tweet-stream')(cfg);
var twitter = require('twitter')(cfg);

var trendsCache = [];
var socketStates = {};

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});
app.use("/css", express.static(__dirname + '/css'));
app.use("/fonts", express.static(__dirname + '/fonts'));
app.use("/js", express.static(__dirname + '/js'));

ts.on('tweet', function(tweet){
    if (tweet.coordinates && tweet.coordinates.coordinates) {
        for (var k in socketStates) {
            if (socketStates[k].currentSearch == null 
                || (tweet.text && tweet.text.indexOf(socketStates[k].currentSearch) > -1)) {
                if (socketStates[k].currentBounds) {
                    var bounds = socketStates[k].currentBounds.split(',');
                    var coords = tweet.coordinates.coordinates;
                    if (pointIsInBounds(bounds[3], bounds[1], bounds[2], bounds[0], coords[0], coords[1])) {
                        io.to(k).emit('tweet', tweet.coordinates.coordinates);
                    }
                }
            }    
        }
    }
});

function pointIsInBounds(north, south, east, west, lng, lat){
    if (lat > north) { return false; }
    if (lat < south) { return false; }
    if (lng > east) { return false; }
    if (lng < west) { return false; }
    return true;
}

function SocketState(socket) {
    this.currentBounds = null;
    this.currentCenter = null;
    this.socketId = socket.id;
    this.currentSearch = null;
}

SocketState.prototype.onNewBounds = function(msg) {
    if (this.currentBounds != msg){            
        if (this.currentBounds != null) {
            ts.unlocate(this.currentBounds);
        }
        this.currentBounds = msg;
        ts.location(msg);
    }
};

SocketState.prototype.onDisconnect = function() {
    if (this.currentBounds != null) {
        ts.unlocate(this.currentBounds);
    }
    if (this.currentSearch != null) {
        ts.untrack(this.currentSearch);
    }
};

SocketState.prototype.onUpdateCenter = function(msg) {
    if (this.currentCenter != msg) {
        this.currentCenter = msg;
        this.fetchTweets();
    }
};
    
SocketState.prototype.onSearch = function(msg) {
    if (this.currentSearch != null) {
        ts.untrack(this.currentSearch);
    }
    this.currentSearch = msg;
    ts.track(this.currentSearch);
    io.to(this.socketId).emit('search underway', msg);
    this.fetchTweets();
};

SocketState.prototype.fetchTweets = function() {
    var params =  {geocode: this.currentCenter, count: 100};
    if (this.currentSearch != null) {
        params.q = this.currentSearch;
    }
    twitter.get('search/tweets', params, function(error, params, response){            
        if (error) { console.log(JSON.stringify(error)); throw error; }

        if (params.statuses) {
            for (var i in params.statuses) {
                var tweet = params.statuses[i];
                if (tweet.coordinates && tweet.coordinates.coordinates) {
                    io.to(this.socketId).emit('tweet', tweet.coordinates.coordinates);
                }
            }
        }
    }.bind(this));
};

io.on('connection', function(socket){
    var state = new SocketState(socket);
    socketStates[socket.id] = state;
    socket.on('change bounds', state.onNewBounds.bind(state));
    socket.on('disconnect', state.onDisconnect.bind(state));
    socket.on('update center', state.onUpdateCenter.bind(state));
    socket.on('search', state.onSearch.bind(state));
    
    if (trendsCache.length == 0) {
        // ID 23424977 = USA
        twitter.get('trends/place', {id: 23424977}, function(error, params, response){
            if (error) { console.log(JSON.stringify(error)); throw error; }
        
            if (params && params.length > 0 && params[0].trends) {
                var trends = params[0].trends;
                for (var i in trends) {
                    if (trends[i].promoted_content != null) { continue; }
                    if (i >= 3) { break; } // We only have room for the top 3
                    io.to(socket.id).emit('trend', trends[i].name);
                    trendsCache.push(trends[i].name);
                }
            }
        
        });
    } else {
        for (var i in trendsCache) {
            io.to(socket.id).emit('trend', trendsCache[i]);
        }
    }
});

http.listen(4000, function(){
  console.log('listening on *:4000');
});
