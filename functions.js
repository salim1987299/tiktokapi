const mysql = require('mysql');
const config = require("./config.js");

var functions = {
	db_connect: function() {
		var connection;
	  	connection = mysql.createConnection(config.database);
	  	connection.connect(function(err) {
		    if(err) {
		      setTimeout(functions.db_connect, 20000);
		    }
	  	});
	  	connection.on('error', function(err) {
	    	if(err.code === 'PROTOCOL_CONNECTION_LOST') {
	      		functions.db_connect();
	    	} else {}
	  	});
	  	return connection;
	},

	debug: function(err) {
		if(config.debug){
			console.log(err);
		}
	},

	generateVerifyFp: function() {
	    var e = Date.now();
	    var t = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".split(
	        ""
	      ),
	      e = t.length,
	      n = Date.now().toString(36),
	      r = [];
	    (r[8] = r[13] = r[18] = r[23] = "_"), (r[14] = "4");
	    for (var o = 0, i = void 0; o < 36; o++)
	      r[o] ||
	        ((i = 0 | (Math.random() * e)), (r[o] = t[19 == o ? (3 & i) | 8 : i]));
	    return "verify_" + n + "_" + r.join("");
  	},

	remove_session: function(sessions, session){
		const index = sessions.indexOf(5);
		if (index > -1) {
		  sessions.splice(index, 1);
		}
		return sessions;
	},

    base64MimeType: function(encoded) {
	  var result = null;
	  if (typeof encoded !== 'string') {
	    return result;
	  }
	  var mime = encoded.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
	  if (mime && mime.length) {
	    result = mime[1];
	  }
	  return result;
	},

	now: function(type){
		let date_ob = new Date();
		let date = ("0" + date_ob.getDate()).slice(-2);
		let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
		let year = date_ob.getFullYear();
		let hours = date_ob.getHours();
		let minutes = date_ob.getMinutes();
		let seconds = date_ob.getSeconds();
		if(type == 2){
			return year + "-" + month + "-" + date
		}else{
			return year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds;
		}
	},

	run_by: function() {
	    return 60;
	},

	mime_convert: function( mime ) {
	    
		var mimetypes = {
			"image/jpg": "image/jpeg",
			"image/png": "image/png",
			"video/mp4": "video/mp4",
			"jpeg": "image/jpeg",
			"application/pdf": "application/pdf",
			"audio/ogg": "audio/ogg",
			"audio/mp4": "audio/mp4",
			"image/webp": "image/webp",
			"audio/mpeg": "audio/mpeg",
		}

		return (mimetypes[mime] != undefined)?mimetypes[mime]:mime;

	},

	post_type: function( mime , type) {

		var post_type = "documentMessage";
	    
		if( type == 1 ){
			

		  	if( 
		  		mime == "image/png" || 
		  		mime == "image/jpeg" || 
		  		mime == "image/jpg" || 
		  		mime == "image/gif"
		  	){
		  		post_type = "imageMessage";
		  	}else if(
		  		mime == "video/mp4" || 
		  		mime == "video/3gpp" || 
		  		mime == "video/ogg" || 
		  		mime == "video/gif"
		  	){
		  		post_type = "videoMessage";
		  	}else if(
		  		mime == "audio/mpeg"
		  	){
		  		post_type = "audioMessage";
		  	}
		  	
		}else{
			var post_type = "documentMessage";

            if( 
		  		mime == "png" || 
		  		mime == "jpeg" || 
		  		mime == "jpg" || 
		  		mime == "gif"

		  	){
		  		post_type = "imageMessage";
		  	}else if(
		  		mime == "mp4" || 
		  		mime == "3gpp" || 
		  		mime == "ogg"
		  	){
		  		post_type = "videoMessage";
		  	}else if(
		  		mime == "mp3"
		  	){
		  		post_type = "audioMessage";
		  	}
		}

		return post_type;
	},

	get_url_extension: function( url ) {
	    return url.split(/[#?]/)[0].split('.').pop().trim();
	},

	mimetype_from_extension: function( url ) {
	    
	    var mime = functions.get_url_extension( url );

		var mimetypes = {
			"jpg": "image/jpeg",
			"png": "image/png",
			"mp4": "video/mp4",
			"mp3": "audio/mpeg",
			"jpeg": "image/jpeg",
			"pdf": "application/pdf",
			"ogg": "video/ogg",
			"gif": "image/gif",
			"webp": "image/webp"
		}

		return mimetypes[mime];

	}
}

module.exports = functions; 
