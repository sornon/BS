var fs = require('fs');

var confPath = './bs.conf';

exports.getLastBuildTime = function() {

	if (fs.existsSync(confPath)) {

		return parseInt(fs.readFileSync(confPath, {
			encoding: 'utf8'
		}));

	}
	return 0;

};

exports.syncLastBuildTime = function(initTime) {

	if (typeof initTime !== 'undefined') {

		fs.writeFileSync(confPath, initTime);

	} else {

		fs.writeFileSync(confPath, new Date().getTime());

	}

};