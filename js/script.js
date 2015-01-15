(function(init) {
  	init(window.jQuery, window._, window, document);
}(function($, _, window, document) {
    var socket = io();
    // Since we send back trends immediately upon connecting, we need to establish this listener early on.
    socket.on('trend', function(msg){
        // Since there really isn't any other need for templating, some string concats will save a lot of overhead.
        $('#trends').append('<li><a href="#">' + msg + '</a></li>');
    });
    
    var points = new google.maps.MVCArray([]);
    var heatmap = null;
    
    var doEventBinding = function(map) {
        socket.on('tweet', function(msg){
            points.push(new google.maps.LatLng(msg[1], msg[0]));
            if (heatmap == null) {
                heatmap = new google.maps.visualization.HeatmapLayer({data: points});
                heatmap.setMap(map);
            }
        });
        
        socket.on('search underway', function() { points.clear() });
                
        google.maps.event.addListener(map, 'idle', function() {
            var bounds = map.getBounds();
            socket.emit('change bounds', 
                bounds.getSouthWest().lng() + ',' +
                bounds.getSouthWest().lat() + ',' +
                bounds.getNorthEast().lng() + ',' +
                bounds.getNorthEast().lat()
            );
            
            var invZoom = 21 - map.getZoom();
            socket.emit('update center',
                bounds.getCenter().lat() + "," +
                bounds.getCenter().lng() + "," +
                invZoom * invZoom + "mi"
            );
            
            points.clear();
        });
        
        $('#searchform').submit(function(event){
            event.preventDefault();
        	socket.emit('search', $('#search').val());
        });
        
        $('#trends').on('click', 'a', function(event) {
            event.preventDefault();
            var term = event.target.text;
            $('#search').val(term);
            socket.emit('search', term);
        });
    };
    
    var defaultOptions = function() {
        var styles = [
            {
                "featureType": "all",
                "elementType": "labels.text",
                "stylers": [
                    {
                        "visibility": "off"
                    }
                ]
            },
            {
                "featureType": "administrative",
                "elementType": "labels",
                "stylers": [
                    {
                        "visibility": "off"
                    }
                ]
            },
            {
                "featureType": "administrative",
                "elementType": "labels.text.fill",
                "stylers": [
                    {
                        "color": "#444444"
                    }
                ]
            },
            {
                "featureType": "administrative.province",
                "elementType": "labels.text",
                "stylers": [
                    {
                        "visibility": "off"
                    }
                ]
            },
            {
                "featureType": "administrative.locality",
                "elementType": "labels.text",
                "stylers": [
                    {
                        "visibility": "off"
                    }
                ]
            },
            {
                "featureType": "administrative.neighborhood",
                "elementType": "labels.text",
                "stylers": [
                    {
                        "visibility": "off"
                    }
                ]
            },
            {
                "featureType": "landscape",
                "elementType": "all",
                "stylers": [
                    {
                        "color": "#f2f2f2"
                    }
                ]
            },
            {
                "featureType": "landscape.man_made",
                "elementType": "labels.text",
                "stylers": [
                    {
                        "visibility": "off"
                    }
                ]
            },
            {
                "featureType": "poi",
                "elementType": "all",
                "stylers": [
                    {
                        "visibility": "off"
                    }
                ]
            },
            {
                "featureType": "poi",
                "elementType": "labels",
                "stylers": [
                    {
                        "visibility": "off"
                    }
                ]
            },
            {
                "featureType": "poi",
                "elementType": "labels.text",
                "stylers": [
                    {
                        "visibility": "off"
                    }
                ]
            },
            {
                "featureType": "poi.attraction",
                "elementType": "labels.text",
                "stylers": [
                    {
                        "visibility": "off"
                    }
                ]
            },
            {
                "featureType": "poi.park",
                "elementType": "labels.text",
                "stylers": [
                    {
                        "visibility": "off"
                    }
                ]
            },
            {
                "featureType": "poi.sports_complex",
                "elementType": "labels.text",
                "stylers": [
                    {
                        "visibility": "off"
                    }
                ]
            },
            {
                "featureType": "road",
                "elementType": "all",
                "stylers": [
                    {
                        "saturation": -100
                    },
                    {
                        "lightness": 45
                    }
                ]
            },
            {
                "featureType": "road",
                "elementType": "labels.text",
                "stylers": [
                    {
                        "visibility": "off"
                    }
                ]
            },
            {
                "featureType": "road.highway",
                "elementType": "all",
                "stylers": [
                    {
                        "visibility": "simplified"
                    }
                ]
            },
            {
                "featureType": "road.highway",
                "elementType": "labels.text",
                "stylers": [
                    {
                        "visibility": "off"
                    }
                ]
            },
            {
                "featureType": "road.highway",
                "elementType": "labels.icon",
                "stylers": [
                    {
                        "visibility": "off"
                    }
                ]
            },
            {
                "featureType": "road.arterial",
                "elementType": "labels.text",
                "stylers": [
                    {
                        "visibility": "off"
                    }
                ]
            },
            {
                "featureType": "road.arterial",
                "elementType": "labels.icon",
                "stylers": [
                    {
                        "visibility": "off"
                    }
                ]
            },
            {
                "featureType": "transit",
                "elementType": "all",
                "stylers": [
                    {
                        "visibility": "off"
                    }
                ]
            },
            {
                "featureType": "transit",
                "elementType": "labels.text",
                "stylers": [
                    {
                        "visibility": "off"
                    }
                ]
            },
            {
                "featureType": "water",
                "elementType": "all",
                "stylers": [
                    {
                        "color": "#868f92"
                    },
                    {
                        "visibility": "on"
                    }
                ]
            },
            {
                "featureType": "water",
                "elementType": "labels",
                "stylers": [
                    { "visibility": "off" }
                ]
            }
        ];
        
        return {
            zoom: 3,
            center: new google.maps.LatLng(0, 0),
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            disableDefaultUI: true,
            styles: styles
        };
    };
    
    var initializeMap = function(options) {
        $('#loading').hide();
        var map = new google.maps.Map($('#map')[0], options);
        $('#controls').show();
        doEventBinding(map);
    };
    
    var positionToOptions = function(position) {
        var options = defaultOptions();
        options.center = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
        options.zoom = 6;
        return options;
    };
    
    $(function() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                _.compose(initializeMap, positionToOptions), // On Success
                _.partial(initializeMap, defaultOptions()) // On Error
            );
        } else {
            initializeMap(defaultOptions());
        }
    });
}));
