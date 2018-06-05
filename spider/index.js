const fs = require('fs') 
const path = require('path')  
const superagent = require('superagent')  
const cheerio = require('cheerio')  
// const eventproxy = require('eventproxy')  
import eventproxy from 'eventproxy'  // node不支持es6 自己配置babel 
const mapLimit = require('async/mapLimit')  
let _log = console.log;
let ep = new eventproxy();
let result = []; // 存放最终结果
let authorSet = {}; // key value 方式存放每个人发帖数
let blackMediary = ['李老头','稳稳的🍃','兔兔','和那边'] ; // 黑中介列表 直接过滤
let deletnum = 0; // 被删除数据条数
let wholeList = [];
let epCount = 0; // ep 触发	次数
let pageUrls = []; // 要抓取的页面数组
let page = 25 ; // 每个小组抓取页面数量
let perpageQuantity = 25; // 每个页面数据条数, 有的小组一页不够25 导致不能触发after fuck

let baseUrlList =[
'https://www.douban.com/group/beijingzufang/discussion?start=', // 北京租房
'https://www.douban.com/group/252218/discussion?start=', // 北京租房专家
'https://www.douban.com/group/625354/discussion?start=' ,// 北京租房（真的没有中介）小组 // 这个小组数据条数特殊
'https://www.douban.com/group/zhufang/discussion?start=' , // 北京无中介租房（寻天使投资）
'https://www.douban.com/group/opking/discussion?start=',// 北京个人租房 （真房源|无中介）
'https://www.douban.com/group/279962/discussion?start=', //北京租房（非中介）
'https://www.douban.com/group/26926/discussion?start=',// 北京租房豆瓣
'https://www.douban.com/group/bjfangchan/discussion?start=', // 租房在北京 @北京租房 
] ;
// let baseUrl = 'https://www.douban.com/group/bjfangchan/discussion?start=';

baseUrlList.forEach(function(baseUrl){
	// 生成url
	for (let i = 0; i < page ; i++){
		pageUrls.push({
			url: baseUrl + i* perpageQuantity
		});
	}	
});
function fetchUrl(url,callback){
	let delay = parseInt((Math.random() * 300000000) % 1000, 10);	
	superagent.get(url)
	.set('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36')
	.end((err,pres) => {
		let $ = cheerio.load(pres.text);
		let itemList = $('.olt tbody').children('tr').slice(1,26);
		for (let i = 0 ,len = itemList.length ; i < len; i ++  ,epCount++) {
			let tdItems = itemList.eq(i).children();
			let title = tdItems.eq(0).children().attr('title').trim(); // 标题
			let detailUrl = tdItems.eq(0).children().attr('href'); // 详情链接
			let author = tdItems.eq(1).children().text();  // 发布人
			let markSum = tdItems.eq(2).text(); // 回应数量
			let lastModify = tdItems.eq(3).text(); // 最后回应时间
			let result = {
				title: title,
				url: detailUrl,
				author: author,
				markSum: markSum,
				lastModify: lastModify
			}
			// _log(result);
			// ep.emit('preparePage',result);
			wholeList.push(result);
			_log('正在抓取的是' + url ,  'epCount:' + epCount , 'i ：' + i);
		}
		setTimeout(()=>{
			callback(null,url); // 此处callback 即mapLimit 中第二个function(err,result ),并且必须调用！！！ 不然只请求前（最大并发数）个请求，然后就结束了,调用这个方法代表本次请求成功，那下一步mapLimit 就会再发起一个请求，以保证当前是设定的最大并发数
		},3000);
	})
}


function start(keyWords){
	let  wholeFlag = 0;
	mapLimit(pageUrls, 2,  function(obj,callback){
		fetchUrl(obj.url,callback);
	},function(err,list){
		// _log(list); // result为结果list callback 传递过来的值列表
		wholeFlag = 1;
		_log('全部抓取完毕');
	});
	var watch = setInterval(() => {
		if(wholeFlag == 1){
			filter(wholeList,keyWords);
			clearInterval(watch);
		}
	});	
}
// ep.after('preparePage', pageUrls.length * perpageQuantity ,function(list){ // 有的小组一页不够25 条数据，导致最后不能触发after ，蛋疼
//   filter(list);
// });

// 标题列表去重 去掉同一条信息多次顶帖
Array.prototype.distinct = function (){
 var arr = this,
  i,
  obj = {},
  result = [],
  len = arr.length;
 for(i = 0; i< arr.length; i++){
  if(!obj[arr[i].title]){ //如果能查找到，证明当前条 信息是顶帖
   obj[arr[i].title] = 1;
   result.push(arr[i]);
  }
 }
 return result;
};
function filter(list, keyWordList){
	  let filterWords = /随时|押一付一|可月付|月付|拎包入住|精装|求租/ ;
	  // let keyWords = /富河园|财富东方|邓家窑/ ;
	  let keyWordRegcontent = keyWordList.split(',').join('|');
	  let fileName = keyWordList.split(',').join('');
	  let keyWords = new RegExp(keyWordRegcontent); 
	  list.forEach((item) => {
	    authorSet[item.author] = authorSet[item.author] ? ++authorSet[item.author] : 1 ;
	    if(authorSet[item.author] > 4 ) blackMediary.push(authorSet[item.author]); 
	  });
	  blackMediary = [... new Set(blackMediary)];
	  list = [... new Set(list)]; // 使用 Set 去掉重复
	  list = list.distinct(); // 去掉重复顶帖
	  _log( 'blackMediary :' + blackMediary);
	  list.forEach((item) => {
	  	if(item.markSum > 15){
	  		_log('评论大于15， 丢弃');
	  		deletnum ++;
	  		return;
	  	}
	  	if(filterWords.test(item.title)){
	  		_log('不希望词汇出现， 丢弃');
	  		deletnum ++;
	  		return;
	  	}
	  	if(blackMediary.includes(item.author)){
	  		_log('黑中介');
	  		deletnum ++;
	  		return;
	  	}
	  	if(keyWords.test(item.title)){
	  		result.push(item);
	  	}else {
	  		_log('全部不匹配');
	  		deletnum ++;
	  		return;
	  	}
	  	
	  });
	  _log(result);
	  outPut(result,fileName);
	  _log('删除：' + deletnum );
	  _log( '剩余结果：' + result.length);
}
function outPut(result,fileName){
	//  设置html模板
	let top = '<!DOCTYPE html>' +
	      '<html lang="en">' +
	      '<head>' +
	      '<meta charset="UTF-8">' +
	      '<style>' +
	      '.listItem{ display:block;margin-top:10px;text-decoration:none;}' +
	      '.markSum{ color:red;}' +
	      '.lastModify{ color:"#aaaaaa"}' +
	      '</style>' +
	      '<title>筛选结果</title>' +
	      '</head>' +
	      '<body>' +
	      '<div>'
	let bottom = '</div> </body> </html>'
	// 拼装有效数据html
	let content = '';
	result.forEach(function (item) {
	  content += `<a class="listItem" href="${item.url}" target="_blank">${item.title}_____<span class="markSum">${item.markSum}</span>____<span class="lastModify">${item.lastModify}</span>`
	})

	let final = top + content + bottom;
	//   最后把生成的html输出到指定的文件目录下
	fs.writeFile(path.join(__dirname, '../filterresult/'+fileName+'.html'), final, function (err) {
	  if (err) {
	    return console.error(err);
	  }
	  console.log('结果写入文件成功')
	});	
}
export default { start }
// start('出租,6号线');










