'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _set = require('babel-runtime/core-js/set');

var _set2 = _interopRequireDefault(_set);

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _eventproxy = require('eventproxy');

var _eventproxy2 = _interopRequireDefault(_eventproxy);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var fs = require('fs');
var path = require('path');
var superagent = require('superagent');
var cheerio = require('cheerio');

var mapLimit = require('async/mapLimit');
var _log = console.log;
var ep = new _eventproxy2.default();
var result = [];
var authorSet = {};
var blackMediary = ['李老头', '稳稳的🍃', '兔兔', '和那边'];
var deletnum = 0;
var wholeList = [];
var epCount = 0;
var pageUrls = [];
var page = 25;
var perpageQuantity = 25;

var baseUrlList = ['https://www.douban.com/group/beijingzufang/discussion?start=', 'https://www.douban.com/group/252218/discussion?start=', 'https://www.douban.com/group/625354/discussion?start=', 'https://www.douban.com/group/zhufang/discussion?start=', 'https://www.douban.com/group/opking/discussion?start=', 'https://www.douban.com/group/279962/discussion?start=', 'https://www.douban.com/group/26926/discussion?start=', 'https://www.douban.com/group/bjfangchan/discussion?start='];


baseUrlList.forEach(function (baseUrl) {
	for (var i = 0; i < page; i++) {
		pageUrls.push({
			url: baseUrl + i * perpageQuantity
		});
	}
});
function fetchUrl(url, callback) {
	var delay = parseInt(Math.random() * 300000000 % 1000, 10);
	superagent.get(url).set('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36').end(function (err, pres) {
		var $ = cheerio.load(pres.text);
		var itemList = $('.olt tbody').children('tr').slice(1, 26);
		for (var i = 0, len = itemList.length; i < len; i++, epCount++) {
			var tdItems = itemList.eq(i).children();
			var title = tdItems.eq(0).children().attr('title').trim();
			var detailUrl = tdItems.eq(0).children().attr('href');
			var author = tdItems.eq(1).children().text();
			var markSum = tdItems.eq(2).text();
			var lastModify = tdItems.eq(3).text();
			var _result = {
				title: title,
				url: detailUrl,
				author: author,
				markSum: markSum,
				lastModify: lastModify
			};

			wholeList.push(_result);
			_log('正在抓取的是' + url, 'epCount:' + epCount, 'i ：' + i);
		}
		setTimeout(function () {
			callback(null, url);
		}, 3000);
	});
}

function start(keyWords) {
	var wholeFlag = 0;
	mapLimit(pageUrls, 2, function (obj, callback) {
		fetchUrl(obj.url, callback);
	}, function (err, list) {
		wholeFlag = 1;
		_log('全部抓取完毕');
	});
	var watch = setInterval(function () {
		if (wholeFlag == 1) {
			filter(wholeList, keyWords);
			clearInterval(watch);
		}
	});
}

Array.prototype.distinct = function () {
	var arr = this,
	    i,
	    obj = {},
	    result = [],
	    len = arr.length;
	for (i = 0; i < arr.length; i++) {
		if (!obj[arr[i].title]) {
			obj[arr[i].title] = 1;
			result.push(arr[i]);
		}
	}
	return result;
};
function filter(list, keyWordList) {
	var filterWords = /随时|押一付一|可月付|月付|拎包入住|精装|求租/;

	var keyWordRegcontent = keyWordList.split(',').join('|');
	var fileName = keyWordList.split(',').join('');
	var keyWords = new RegExp(keyWordRegcontent);
	list.forEach(function (item) {
		authorSet[item.author] = authorSet[item.author] ? ++authorSet[item.author] : 1;
		if (authorSet[item.author] > 4) blackMediary.push(authorSet[item.author]);
	});
	blackMediary = [].concat((0, _toConsumableArray3.default)(new _set2.default(blackMediary)));
	list = [].concat((0, _toConsumableArray3.default)(new _set2.default(list)));
	list = list.distinct();
	_log('blackMediary :' + blackMediary);
	list.forEach(function (item) {
		if (item.markSum > 15) {
			_log('评论大于15， 丢弃');
			deletnum++;
			return;
		}
		if (filterWords.test(item.title)) {
			_log('不希望词汇出现， 丢弃');
			deletnum++;
			return;
		}
		if (blackMediary.includes(item.author)) {
			_log('黑中介');
			deletnum++;
			return;
		}
		if (keyWords.test(item.title)) {
			result.push(item);
		} else {
			_log('全部不匹配');
			deletnum++;
			return;
		}
	});
	_log(result);
	outPut(result, fileName);
	_log('删除：' + deletnum);
	_log('剩余结果：' + result.length);
}
function outPut(result, fileName) {
	var top = '<!DOCTYPE html>' + '<html lang="en">' + '<head>' + '<meta charset="UTF-8">' + '<style>' + '.listItem{ display:block;margin-top:10px;text-decoration:none;}' + '.markSum{ color:red;}' + '.lastModify{ color:"#aaaaaa"}' + '</style>' + '<title>筛选结果</title>' + '</head>' + '<body>' + '<div>';
	var bottom = '</div> </body> </html>';

	var content = '';
	result.forEach(function (item) {
		content += '<a class="listItem" href="' + item.url + '" target="_blank">' + item.title + '_____<span class="markSum">' + item.markSum + '</span>____<span class="lastModify">' + item.lastModify + '</span>';
	});

	var final = top + content + bottom;

	fs.writeFile(path.join(__dirname, '../filterresult/' + fileName + '.html'), final, function (err) {
		if (err) {
			return console.error(err);
		}
		console.log('结果写入文件成功');
	});
}
exports.default = { start: start };
module.exports = exports['default'];