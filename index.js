var path = require('path');
var fs = require('fs');
var _ = require('underscore');
var utils = require('zefti-utils');
var logger = require('zefti-logger');
var appDir = path.dirname(require.main.filename);
var configDir = path.join(appDir, 'config');
var env = 'dev';
var zeftiMongo = require('zefti-mongo');
var localPrefix = 'zefti';

module.exports = function(options, cb){
  var config = {};
  var localConfig = {};
  var instantConfig = {};
  var remoteConfigServerCreds = options.remoteConfigServerCreds;
  var configPath = options.configPath;
  var env = options.env;
  var configServer = null;

  if (remoteConfigServerCreds) {
    configServer = zeftiMongo(remoteConfigServerCreds);
  }

  /* If config files are specified, load them */
  if (configPath) {
    var localConfig = readFiles(configPath);
    var activeEnvConfig = localConfig.env[options.env];

    if (!activeEnvConfig.inherit) {
      localConfig.settings = activeEnvConfig;
    } else {
      var finalCurrentSettings = inheritConfig(localConfig, localConfig.env[activeEnvConfig.inherit], localConfig.env[options.env]);
      localConfig.settings = finalCurrentSettings
    }
  }

  /* If environmental config values are specified, load them*/
  var prefixLength = localPrefix.length;
  for (var key in process.env) {
    if (key.substr(0, prefixLength) === localPrefix) {
      instantConfig[key.substr(prefixLength)] = process.env[key];
    }
  }


  if (configServer) {
    configServer.findOne({env:env}, function(err, remoteConfig){
      if (err) throw new Error('could not connect to remoteConfig');
      if (utils.type(remoteConfig) === 'string'){
        try {
          var parsedRemoteConfig = JSON.parse(remoteConfig);
          for (var field in parsedRemoteConfig) {
            config[field] = parsedRemoteConfig[field];
          }
        } catch(e) {
          return logger.sysError('remoteConfig is not parsable JSON');
        }
      } else if (utils.type(remoteConfig) === 'object') {
        //do nothing
      } else {
        console.log('NO REMOTE CONFIG FOUND');
        //return logger.sysError('remoteConfig is of unknown type');
        cb(_.extend(config, localConfig, instantConfig));
      }
      console.log('extending config, local, remote, and instant')
      cb(_.extend(config, localConfig, remoteConfig, instantConfig));
    });
  } else {
    console.log('extending config, local, instant')
    cb(_.extend(config, localConfig, instantConfig));
  }
};

function readFiles(configPath) {
  var libFiles = fs.readdirSync(configPath);
  var result = {};
  libFiles.forEach(function(libFile){
    if (libFile[0] !== '.') {
      var itemPath = utils.createPath(configPath, libFile);
      //console.log(itemPath);
      var stat = fs.statSync(itemPath);
      if (stat.isDirectory()) {
        var innerFiles = fs.readdirSync(itemPath);
        //console.log(innerFiles);
        innerFiles.forEach(function (file) {
          var name = file.slice(0, -file.split('.').pop().length - 1);
          if (!result[libFile]) result[libFile] = {};
          //console.log('./lib/' + libFile + '/' + file);
          result[libFile][name] = require(path.join(configPath, libFile, file));
        });
      }
    }
  });
  return result;
}


function inheritConfig(localConfig, orig, extension) {
  if (!extension) throw new Error ('Inherit does not exist');
  delete extension.inherit;
  _.extend(orig, extension);
  if (orig.inherit) {
    var x = inheritConfig(localConfig.env[orig.inherit], orig);
    return x;
  } else {
    return orig;
  }
}