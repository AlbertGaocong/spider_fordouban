import express from 'express'
import path from 'path'
var publicPath = path.resolve(__dirname,'./static');
var app = express();
app.use(express.static(publicPath));
// app.get('/',function(req,res){
// 	console.log(req.query);
// 	res.send('hello word');
// 	// console.log(res);
// });
app.listen(8888,function(err){
	if(err){
		console.log(err);
		return;;
	}
	console.log('listening at: http://localhost:8888');
})