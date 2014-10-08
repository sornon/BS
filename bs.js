'use strict';

var fs = require('fs');

var _ = require('underscore');

var color = require('colors');

var readline = require('readline');

var conf = require('./conf');

var builder = require('./builder.js');

var jsmap = require('./jsmap.js');

var basePath = '../../lib';

var componentsPath = basePath + '/components';

var modulesPath = basePath + '/modules';

var productionPath = basePath + '/production';

var libcomponentsPath = '//js.youxi.bdimg.com/lib/';

conf.initialize();

var rl = readline.createInterface(process.stdin, process.stdout);

console.log('');
console.log('------------------ Commands ------------------'.green)
console.log('|                                             |'.green);
console.log('| build  构建所有变化的文件以及依赖它的文件   |'.green);
console.log('| pack   将指定的文件进行打包                 |'.green);
console.log('|                                             |'.green);
console.log('----------------------------------------------'.green)
console.log('');
rl.setPrompt('BS> ');
rl.prompt();

rl.on('line', function(line) {

	var command = line.split(' ');

	if (!command.length) {

		console.log('请输入指令');

		return;
	}

	switch (command.shift()) {

		case 'build':

			build();

			break;

		case 'pack':

			pack(command);

			break;

		case 'exit':

			process.exit(0);

			break;

		default:

			console.log('没能识别您的命令`' + line.trim() + '`');

			break;
	}

	rl.prompt();

}).on('close', function() {

	console.log('BS已经退出')

	process.exit(0);

});



function build() {

	var lastBuildDate = conf.getLastBuildTime();

	if (!lastBuildDate) { // 初始化构建

		console.log('初始化构建'.green)

		rl.question('是否重新构建所有文件？[y/n]', function(answer) {

			if (answer == 'y') {

			    conf.syncLastBuildTime(1);

			} else {

				conf.syncLastBuildTime();

			}

			conf.sync();

			console.log('初始化完成');

			rl.prompt();
		})

		rl.prompt();

		return;
	}

	var files = builder.getFilesFromDirectory(componentsPath, lastBuildDate);

	var buildTree = [];

	var dependencyTree = [];

	if (!files.changed.length) {

		console.log('未查找到需要构建的文件'.yellow.bold);

		return;
	}

	files.all.forEach(function(file) {

		buildTree.push(file.path);

		var path = componentsPath + file.path;

		var dependency = builder.getFileDependency(path);

		if (dependency) {

			dependency.path = file.path;

			dependencyTree.push(dependency);

		}
	});

	buildTree = builder.iterateDependencies(dependencyTree, files.changed);

	files.changed.forEach(function(f) {

		buildTree.push(f.path);

	})

	buildTree = _.uniq(buildTree);

	var pathsToBuild = buildTree.map(function(path) {

		console.log(('依赖构建: ' + path).grey);

		return componentsPath + path;

	});

	var buildPhrases = builder.buildProductionFiles(basePath, buildTree);

	buildPhrases.forEach(function(bp) {

		pack(bp.split(','));

	});

	conf.syncLastBuildTime();

	conf.sync();
}

function pack(components) {

	components = components.join(',').split(',').sort();

	var comPaths = components.map(function(p) {

		return componentsPath + p;

	});

	//检查输入的文件是否存在

	if (!builder.checkPathsExists(comPaths)) {

		console.log('打包终止'.red);

		return;
	}

	//读取每一个文件的依赖关系

	var dependencies = [];

	comPaths.forEach(function(p) {

		var dep = builder.getFileDependency(p);

		if (dep) {

			dependencies = dependencies.concat(dep.dependency);

		}

	});

	//根据依赖关系去重

	dependencies = _.uniq(dependencies);

	//TODO 检查是否存在基础库文件

	var baseLibDependencies = jsmap.semanticPaths(dependencies);

	//将基础库依赖从依赖树中移除
	baseLibDependencies.forEach(function(libDependency) {

		dependencies.forEach(function(dep, i) {

			if (jsmap.semanticPath(dep) === libDependency) {

				dependencies.splice(i--, 1);
			}
		})

	});

	//检查依赖文件是否存在

	var dependenciesWithLocalPath = dependencies.map(function(p) {

		return componentsPath + p;

	});

	if (!builder.checkPathsExists(dependenciesWithLocalPath)) {

		console.log('打包终止'.bold.red);

		return false;
	}

	var filesToGo = _.uniq(dependenciesWithLocalPath.concat(comPaths));

	//combo & minify

	var productionContent = builder.minifyFiles(filesToGo);

	var virtualFileName = builder.translatePathToVistual(components);

	var productionFilePath = productionPath + '/' + virtualFileName;

	var buildWithPhrase = '/*buildwith:' + components.join(',') + '*/\r\n';

	builder.writeFileToPath(productionFilePath, buildWithPhrase + productionContent);

	console.log(('打包成功，位置：' + productionFilePath).green.bold);

	console.log('引用：');

	console.log(embedToScriptTag(virtualFileName));

	if (baseLibDependencies.length) {

	    console.log('请手动引用基础库：'.magenta);

		baseLibDependencies.forEach(function(bsl) {

		    console.log(embedToScriptTag(bsl).magenta);

		})

	}
}

// 构建 Script 标签
var embedToScriptTag = function(scriptPath) {

	var uri = libcomponentsPath + scriptPath;

	return '<script charset="utf-8" src="' + uri + '"></script>';

}