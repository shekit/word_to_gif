var express = require('express');
var router = express.Router();
var config = require('../config/config');

var giphy = require('giphy-api')(config.key);

var GIFEncoder = require('gifencoder');

var pngFileStream = require('png-file-stream');

var fs = require('fs')

var Flickr = require('node-flickr')
var flickrKey = {'api_key':config.flickr}
var flickr = new Flickr(flickrKey);

var request = require('request');

var shortid = require('shortid');
var easyimg = require('easyimage');

var gif = require('gif-explode');

var execFile = require('child_process').execFile;
var gifsicle = require('gifsicle')

var exec = require('child_process').exec;

/* GET home page. */

router.post('/gifit', function(req,res,next){
	var query = req.body.query;

	var uniqueFilename = shortid.generate();

	//split query on spaces
	var queryTerms = query.split(/\s+/);

	// return if no query is detected
	if(queryTerms.length == 0){
		res.send("no query sent")
		return
	}

	console.log(queryTerms)

	var imageCounter = 0;
	var resizeImageCounter = 0;

	console.log("IMG COUNTER: "+imageCounter)
	console.log("RESIZE COUNTER: "+resizeImageCounter)

	//for each term search flickr and append to a url list
	for(var i in queryTerms){

		searchFlickr(i);
		
	}

	function searchFlickr(index) {
		console.log("Search Flickr")
		var sortOrder = ["date-posted-desc", "relevance", "interestingness-desc"]
		var sort = sortOrder[Math.floor(Math.random()*(sortOrder.length))];
		flickr.get('photos.search', {
			"text":queryTerms[index],
			"page":1,
			"per_page":1,
			"sort":sort,
			"media":"photos"
		}, function(err,result){
			if(err){
				return console.error(err)
			}

			imageCounter++;

			var response = result.photos.photo[0]
			var url = "https://farm"+response["farm"]+".staticflickr.com/"+response["server"]+"/"+response["id"]+"_"+response["secret"]+".jpg";
			console.log(url);

			//download the image
			downloadImage(url, uniqueFilename ,imageCounter)
		})
	}

	function downloadImage(imageUrl,filename,counter){
		console.log("Downloading image");
		var img_url = filename+counter;
		request(imageUrl).pipe(fs.createWriteStream("../images/"+img_url+".jpg")).on('close', function(){
			console.log("Downloaded")
			resizeImage(img_url, counter, filename);
		})
	}

	function resizeImage(imageToResize, imageCounterVar, filenameVar){
		console.log("Resizing images")
		
		easyimg.rescrop({
			src:"../images/"+imageToResize+".jpg",
			dst:"../images/converted/"+filenameVar+"/"+imageToResize+".png",
			width:700,
			height:500,
			cropwidth:400,
			cropheight:400,
			x:0,
			y:0
		}).then(function(image){
			console.log("Resized Image")
			resizeImageCounter++;
			console.log(resizeImageCounter, queryTerms.length)
			if(resizeImageCounter == queryTerms.length){
				console.log(resizeImageCounter, queryTerms.length)
				console.log("Make gif")
				createGif(filenameVar);
			}
		}, function(err){
			console.log(err);
		})
	}

	function createGif(filenameToGif){
		var encoder = new GIFEncoder(400,400);
		var stream = fs.createWriteStream('../public/images/gif/'+filenameToGif+'.gif');
		stream.on('close', function(){
			stream.end();
			console.log('Made gif!')
			res.send('http://localhost:3000/images/gif/'+filenameToGif+'.gif');
		})
		pngFileStream('../images/converted/'+filenameToGif+'/'+filenameToGif+'?.png')
		.pipe(encoder.createWriteStream({repeat:0, delay:350, quality:10}))
		.pipe(stream);

	}


	//function down


	//search images and stitch them together
	//res.send("done")
	// giphy.search(query, function(err, resp){
	// 	res.send(resp.data[0].images["original"]);
	// })
})

router.post('/giphyit', function(req, res, next){

	var query = req.body.query;

	var uniqueFilename = shortid.generate();

	//split query on spaces
	var queryTerms = query.split(/\s+/);
	console.log(queryTerms)
	// return if no query is detected
	if(queryTerms.length == 0){
		res.send("no length sent")
		return
	}

	var imageCounter = 0;
	var resizeImageCounter = 0;

	var downloadedGifCounter = 0;

	console.log("IMG COUNTER: "+imageCounter)
	console.log("RESIZE COUNTER: "+resizeImageCounter)

	//for each term search flickr and append to a url list
	for(var i in queryTerms){

		searchGiphy(i);
		
	}

	function searchGiphy(index){
		giphy.search(queryTerms[index], function(err, resp){
			imageCounter++;
			console.log("IMG COUNTER: "+imageCounter);
			var url = resp.data[0].images["original"].url;
			console.log("URL: "+url);
			downloadGif(url,uniqueFilename ,imageCounter)
		})
	}

	function downloadGif(imageUrl,filename,counter){
		console.log("Downloading Gif");
		var img_path = filename+counter;
		console.log(img_path)
		request(imageUrl).pipe(fs.createWriteStream("../images/"+img_path+".gif")).on('close', function(){
			console.log("Downloaded gif")
			downloadedGifCounter++;
			//resizeImage(img_url, counter, filename);
			//explodeGif(img_url);
			if(downloadedGifCounter == queryTerms.length){
				//gifsicleIt(img_path, counter);
				resizeGif(img_path, counter, filename)
				//explodeGif(img_path)
			}
			//
		})
	}

	function resizeGif(imageToResize, imageCounterVar, filenameVar){
		console.log("Resizing images")
		
		easyimg.rescrop({
			src:"../images/"+imageToResize+".gif",
			dst:"../images/"+imageToResize+".gif",
			width:400,
			height:300,
			cropwidth:400,
			cropheight:300,
			x:0,
			y:0
		}).then(function(image){
			console.log("Resized Image")
			// resizeImageCounter++;
			// console.log(resizeImageCounter, queryTerms.length)
			// if(resizeImageCounter == queryTerms.length){
			// 	console.log(resizeImageCounter, queryTerms.length)
			// 	console.log("Make gif")
			// 	createGif(filenameVar);
			// }
			execImageMagick(imageToResize, filenameVar)
		}, function(err){
			console.log(err);
		})
	}

	function gifsicleIt(img_name){
		var filePath = '../images/*.gif'
		var outFilePath = '../images/anim.gif'
		execFile(gifsicle, ['--explode',filePath], function(err){
			console.log('combined');
		})
		return
	}

	function execGifsicle(){
		var cmd = 'gifsicle -d 100 --loop ../images/1.gif ../images/2.gif > anim.gif'

		exec(cmd, function(err){
			console.log("Error: "+err)
			console.log("Combined")
		})

		return
	}

	function execImageMagick(img_name, filename){
		//create a unique directory for the gifs
		fs.mkdirSync('../images/gifconverted/'+filename);
		var cmd = 'convert -coalesce ../images/'+img_name+'.gif ../images/gifconverted'+filename+'/'+img_name+'%04d.gif'
		exec(cmd, function(err){
			console.log(err)
			console.log("exploded")
		})
		return;
	}

	function explodeGif(img_name){
		fs.createReadStream("../images/"+img_name+".gif")
		  .pipe(gif(function(frame){
		  	frame.pipe(fs.createWriteStream('../images/hello'+i+'.gif'))
		  }))
	}
})

// router.get('/giff', function(req,res,next){
// 	pngFileStream('../test/frame?.png')
// 	.pipe(encoder.createWriteStream({repeat:0, delay:150, quality:10}))
// 	.pipe(fs.createWriteStream('../gif/animated.gif'))


// 	res.send('giffed')
// })


router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;
