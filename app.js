var request = require ('request');
var restify = require ('restify');
var builder = require ('botbuilder');

var connectorAppId = "<app_id>";
var connectorAppPassword = "<bot_framework_pass>";

var openWeatherMapAppId = '<apixu_app_id>';

var server = restify.createServer ();
server.listen (process.env.port || process.env.PORT || 8081, function () {
   console.log ('%s listening to %s', server.name, server.url); 
});

var connector = new builder.ChatConnector ({
    appId: connectorAppId,
    appPassword: connectorAppPassword
});

var recognizer = new builder.LuisRecognizer('https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/b15d6065-f8ec-443c-9b83-463d99f2ddd2?subscription-key=fae60ad9948e48d493f30070c0c30831&timezoneOffset=0&verbose=true&q=');
var bot = new builder.UniversalBot (connector);

server.post ('/api/messages', connector.listen ());

var dialog = new builder.IntentDialog ({ recognizers: [recognizer] });
bot.dialog ('/', dialog);

dialog.matches ('greeting', [
        function (session, matches, next) {
        	builder.Prompts.text (session, "Hey, Which city's weather do you want to know?");
        },
        function (session, results) {        
        	getForecast(session, results);
        }
]);

dialog.matches ('weather', [
        function (session, matches, next) {
        	var task = builder.EntityRecognizer.findEntity(matches.entities, 'location');

        	if (!task) {
            	builder.Prompts.text(session, "Where?");
        	} else {
            	next({ response: task.entity });
        	}
        },
        function (session, results) {
        	getForecast(session, results);
        }
]);

dialog.matches('thank', [
	function(session, matches, next){
		session.send("Just say Hi to start again");
	},
	function(session, results){
		getForecast(session, results);
	}
]);

dialog.onDefault (function (session) {
    session.send ('I did not understand your request!');
});

function getForecast(session, results){
	session.sendTyping();
	openweathermap (results.response, function (success, previsions) {
        if (!success) return session.send ('An error occurred, please try again');
        
        var message = forecastFor(previsions);
                      
        session.send (message);
    });
}

function forecastFor(apiRes) {
  var forecast = "";
  if(apiRes.error){
    return apiRes.error;
  }
  
  forecast = "The weather is " + apiRes.temperature + "°C" + ", " + apiRes.text + " in " + apiRes.city;
  
  return forecast;
}

var openweathermap = function(city, callback){
	var url = "http://api.apixu.com/v1/forecast.json?key=" + openWeatherMapAppId + "&q=" + city + "&days=0";
	
	request(url, function(err, response, body){
		try{		
			var result = JSON.parse(body);
			if (result.error) {
				var previsions = {
					error : result.error.message
				};
			} else {
				var previsions = {
					temperature : result.current.temp_c,
					text : result.current.condition.text,
					city : result.location.name,
				};
			}
			callback(true, previsions);
		} catch(e) {
			callback(false); 
		}
	});
}