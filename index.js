var path = require('path');
var fs = require('fs');
var _ = require('underscore');
var utils = require('zefti-utils');
var logger = require('zefti-logger');
var env = 'dev';
var zeftiMongo = require('zefti-mongo');
var localPrefix = 'zefti';
var common = require('zefti-common');
var loadedConfig = null;

module.exports = function(options, cb){
  if (loadedConfig) return loadedConfig;
  if (!options) options = {};
  var localConfig = {};
  var instantConfig = {};
  var remoteConfig = {};
  var finalRemoteConfig = {};
  var remoteConfigServerCreds = options.remoteConfigServerCreds;
  var configPath = options.configPath;
  var env = options.env;
  var configServer = null;
  var localConfig = {settings:{}};

  if (remoteConfigServerCreds) {
    configServer = zeftiMongo({dataSource: remoteConfigServerCreds});
  }

  /* If config files are specified, load them */
  if (configPath) {
    localConfig = readFiles(configPath);
    var activeEnvConfig = localConfig.env[options.env];

    if (!activeEnvConfig.inherit) {
      localConfig.settings = activeEnvConfig;
    } else {
      var finalCurrentSettings = inheritConfig(localConfig, localConfig.env[activeEnvConfig.inherit], localConfig.env[options.env]);
      localConfig.settings = finalCurrentSettings;
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
    configServer.find({}, function(err, cursor){
      cursor.toArray(function(err, configDocs){
        if (err) throw new Error('could not connect to remoteConfig');
        configDocs.forEach(function(configDoc){
          if (configDoc.env) remoteConfig[configDoc.env] = configDoc;
        });
        var activeRemoteConfig = remoteConfig[env] || {};

        if (!activeRemoteConfig.inherit) {
          finalRemoteConfig = activeRemoteConfig;
        } else {
          finalRemoteConfig = inheritConfig(remoteConfig, remoteConfig[activeRemoteConfig.inherit], activeRemoteConfig);
        }
        delete finalRemoteConfig._id;
        common.deepMerge(localConfig.settings, finalRemoteConfig);
        common.deepMerge(localConfig.settings, instantConfig);
        loadedConfig = localConfig;
        cb(localConfig);
      });
    });
  } else {
    common.deepMerge(localConfig.settings, finalRemoteConfig);
    common.deepMerge(localConfig.settings, instantConfig);
    loadedConfig = localConfig;
    if (cb) return cb(localConfig);
    return (localConfig);
  }
};

function readFiles(configPath) {
  var libFiles = fs.readdirSync(configPath);
  var result = {};
  libFiles.forEach(function(libFile){
    if (libFile[0] !== '.') {
      var itemPath = utils.createPath(configPath, libFile);
      var stat = fs.statSync(itemPath);
      if (stat.isDirectory()) {
        var innerFiles = fs.readdirSync(itemPath);
        innerFiles.forEach(function (file) {
          var name = file.slice(0, -file.split('.').pop().length - 1);
          if (!result[libFile]) result[libFile] = {};
          result[libFile][name] = require(path.join(configPath, libFile, file));
          if (libFile === 'env') {
          }
        });
      }
    }
  });
  return result;
}

function inheritConfig(localConfig, orig, extension) {
  if (!extension) throw new Error ('Inherit does not exist');
  delete extension.inherit;
  common.deepMerge(orig, extension);
  if (orig.inherit) {
    return inheritConfig(localConfig, localConfig.env[orig.inherit], orig);
  } else {
    return orig;
  }
}