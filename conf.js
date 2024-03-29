﻿'use strict';

var fs = require('fs');

var confPath = './bs.conf';

// 键列表
var CKEY = {

    MTIME: 'mtime',

    LAST_BUILD_TIME: 'last_build_time'
}

// 配置对象
var config = {

    // 内存中的配置源对象
    _keypairs: {},

    //序列化到字符串
    _serialize: function (object) {

        return JSON.stringify(object);
    },

    // 反序列化到对象
    _deserialize: function (str) {

        return JSON.parse(str);
    },

    // 从文件系统中读取配置文件内容
    _readConfigFile: function () {

        if (fs.existsSync(confPath)) {

            return fs.readFileSync(confPath, {

                encoding: 'utf8'

            });

        }
        return '{}';

    },

    // 将内容写入到文件系统中的配置文件
    _writeConfigFile: function (contentStr) {

        fs.writeFileSync(confPath, contentStr, {

            encoding: 'utf8'

        });

    },

    // 设置值
    setValue: function (key, value) {

        this._keypairs[key] = value;

        this._mtimeNow();
    },

    // 获取值
    getValue: function (key) {

        return this._keypairs[key];

    },

    // 设置修改时间为当前时间
    _mtimeNow: function () {

        this._keypairs[CKEY.MTIME] = (new Date).getTime() + '';

    },

    //是否需要同步
    _shouldSync: function () {

        var it = this;

        var configFromFile = it._deserialize(it._readConfigFile());

        var selfMtime = it.getValue(CKEY.MTIME);

        if (!selfMtime) {

            throw '没有找到内存中的配置修改时间';
        }

        // 应该从内存同步到文件系统
        if (!configFromFile[CKEY.MTIME] || parseInt(configFromFile[CKEY.MTIME]) < parseInt(it.getValue(CKEY.MTIME))) {

            return {

                should: true,

                toFileSystem: true

            }
        }

        // 应该从文件系统同步到内存
        if (parseInt(configFromFile[CKEY.MTIME]) > parseInt(it.getValue(CKEY.MTIME))) {

            return {

                should: true,

                toFileSystem: false,

                configFromFile: configFromFile
            }
        }

        // 无需同步
        return {

            should: false
        }

    },

    // 进行内存和文件系统之间的同步
    sync: function () {

        var it = this;

        var shouldSync = it._shouldSync();

        if (shouldSync.should) {

            if (shouldSync.toFileSystem) {

                it._writeConfigFile(it._serialize(it._keypairs));

            } else {

                it._keypairs = shouldSync.configFromFile;
            }
        }
    },

    // 初始化
    initialize: function () {

        var it = this;

        // 如果存在配置文件则将配置文件读取到内存中
        if (fs.existsSync(confPath)) {

            it._keypairs = it._deserialize(it._readConfigFile());

        } else {

            // 如果配置文件不存在则直接记录修改时间等待下一次同步时写入
            it._mtimeNow();
        }

    }

};

exports.sync = function () {

    config.sync();
}

exports.setValue = function (key, value) {

    config.setValue(key, value);
}

exports.getValue = function (key) {

    return config.getValue(key);
}

exports.initialize = function () {

    config.initialize();
}


exports.getLastBuildTime = function () {

    return config.getValue(CKEY.LAST_BUILD_TIME) || 0;

};

exports.syncLastBuildTime = function (initTime) {

    if (typeof initTime !== 'undefined') {

        config.setValue(CKEY.LAST_BUILD_TIME, initTime);

    } else {

        config.setValue(CKEY.LAST_BUILD_TIME, new Date().getTime());

    }
};
