
//基础库 (只能增加，不能删除和修改，变更慎重！)
var lib = {

	"jQuery_1_11_1": 'jQuery-1.11.1.min.js',

}

//语义 MAP
var semanticMap = {

	"jQuery-latest": lib.jQuery_1_11_1

}

//路由器
var semanticPath = function(path){

	return semanticMap[path] || lib[path] || null;

}


//传入数组进行基础库查询，返回数组
var semanticPaths = function(paths){

	var result = [];

	paths.forEach(function(item){

		var real = semanticPath(item);

		if(real){

			result = result || [];

			result.push(real);

		}

	})

	return result;
}


exports.semanticPath = semanticPath;

exports.semanticPaths = semanticPaths;