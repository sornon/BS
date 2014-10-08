'use strict';

var fs = require('fs');

var _ = require('underscore');

var UglifyJS = require("uglify-js");

var color = require('colors');

var jsmap = require('./jsmap.js');

// @basePath : base path
// @filter   : filter function
var getFilesFromDirectory = function(basePath, lastBuildDate, rootPath) {

	var directory = fs.readdirSync(basePath);

	var files = {

		all: [],

		changed: []

	};

	var rootPath = rootPath || '/';

	if (basePath.charAt(basePath.length - 1) != '/') {

		basePath += '/';

	}

	directory.forEach(function(fileName) {

		var relPath = basePath + fileName;

		var stat = fs.statSync(relPath);

		stat.relPath = relPath;

		if (stat.isDirectory() && fileName !== 'production') {

			var subFiles = getFilesFromDirectory(stat.relPath, lastBuildDate, rootPath + fileName + '/');

			files.all = files.all.concat(subFiles.all);

			files.changed = files.changed.concat(subFiles.changed);

		} else {

			if (getExtension(fileName).toLowerCase() == '.js') {

				stat.path = rootPath + fileName;

				files.all.push(stat);

				if (stat.mtime > lastBuildDate) {

					console.log(('检测到修改的文件: ' + fileName).red);

					files.changed.push(stat);

				}
			}
		}
	});
	return files;
}

var getFileDependency = function(path) {

	var content = fs.readFileSync(path, {

		encoding: 'utf8'

	});

	var dependencyConf = content.substr(0, content.indexOf('\n'));

	if (/\/\*dependon:.+\*\//g.test(dependencyConf)) {

		var dependPhrase = /^\/\*dependon:([^*]{4,})\*\//g.exec(dependencyConf)[1];

		return {

			relPath: path,

			dependency: dependPhrase.split(',')

		};
	}
	return void 0;
}

var iterateDependencies = function(dependencyTree, needToBeRebuild) {

	var _needToBeRebuild = [];

	needToBeRebuild.forEach(function(fileStat) {

		dependencyTree.forEach(function(dep) {

			if (dep.dependency.indexOf(fileStat.path) != -1) {

				_needToBeRebuild.push(dep.path);

				_needToBeRebuild = _needToBeRebuild.concat(iterateDependencies(dependencyTree, [{

					path: dep.path

				}]));
			}
		})
	})

	return _needToBeRebuild;
}

var writeFileToPath = function(fileName, data) {

	fs.writeFileSync(fileName, data, {

		encoding: 'utf8'

	});
}

var minifyFiles = function(filePaths) {

	var result = UglifyJS.minify(filePaths, {

		warnings: true,

		beautify: true

	});

	return result.code;
}

var checkPathsExists = function(paths) {

	if (!paths.every(function(p) {

		if (fs.existsSync(p)) {

			return true;

		} else {

			console.log((p + '不存在').red);

			return false;
		}

	})) {

		return false;

	}
	return true;

}

var getExtension = function(filename) {

	var i = filename.lastIndexOf('.');

	return (i < 0) ? '' : filename.substr(i);

}

var _transPathToV = function(path) {

	return path.replace(/\//g, '~');

}

var _transPathToR = function(path) {

	return path.replace(/~/g, '/');

}

//@return vistual path string
var translatePathToVistual = function(paths) {

	if ('length' in paths) {

		return paths.map(function(p) {

			return _transPathToV(p);

		}).join(',');

	} else if (typeof paths === 'string') {

		return _transPathToV(paths);

	}
}

//@return real path array
var translatePathToReal = function(paths) {

	if ('length' in paths) {

		return paths.map(function(p) {

			return _transPathToR(p);

		})

	} else if (typeof paths === 'string') {

		return _transPathToR(paths).split(',');

	}
}

var buildProductionFiles = function(basePath, buildTree) {

	//Get all production files

	var productionPath = basePath;

	var buildPhrases = [];

	if (productionPath.charAt(productionPath.length - 1) != '/') {

		productionPath = productionPath + '/';

	}

	productionPath += 'production/';

	var directory = fs.readdirSync(productionPath);

	directory.forEach(function(fileName) {

		//Get production file buildwith and search for changed file in build tree

		var content = fs.readFileSync(productionPath + fileName, {

			encoding: 'utf8'

		});

		var buildConf = content.substr(0, content.indexOf('\n'));

		if (/\/\*buildwith:.+\*\//g.test(buildConf)) {

			var buildPhrase = /^\/\*buildwith:([^*]{4,})\*\//g.exec(buildConf)[1];

			buildTree.forEach(function(libFile) {

				if (buildPhrase.indexOf(libFile) !== -1) {

					buildPhrases.push(buildPhrase);

				}

			});
		}
	});

	return _.uniq(buildPhrases);
}

exports.getFilesFromDirectory = getFilesFromDirectory;

exports.getFileDependency = getFileDependency;

exports.iterateDependencies = iterateDependencies;

exports.getExtension = getExtension;

exports.minifyFiles = minifyFiles;

exports.writeFileToPath = writeFileToPath;

exports.translatePathToVistual = translatePathToVistual;

exports.translatePathToReal = translatePathToReal;

exports.checkPathsExists = checkPathsExists;

exports.buildProductionFiles = buildProductionFiles;