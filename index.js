var path = require('path');
var fs = require('fs');
var _ = require('underscore');
var utils = require('zefti-utils');
var logger = require('zefti-logger');
var appDir = path.dirname(require.main.filename);
var configDir = path.join(appDir, 'config');
var env = 'dev';
/*
 * Extensions to search for.  In order of significance (last items are the most significant
 * ie: if there is a .js and .json file in the same folder, and .json is listed after .js in
 * the array, .json will be used
 */
var extensions = [
    '.js'
  , '.json'
]

exports.init = function(options){
  var configModel = options.configModel || null;
  if (options && options.configModule) configDir = path.join(appDir, '/node_modules', options.configModule);
  if ((options && options.env) || process.env.env) env = process.env.env || options.env;
  var baseConfigFile = path.join(configDir, env);
  var config = readConfig(options, {}, baseConfigFile);
  var localConfig = {};
  if (process.env.localConfig) {
    if (utils.type(process.env.localConfig) === 'string') {
      try {
        localConfig = JSON.parse(process.env.localConfig);
        for (var field in localConfig) {
          config[field] = localConfig[field];
        }
      } catch (e) {
        return logger.sysError('remoteConfig is not parsable JSON');
      }
    } else if (utils.type(process.env.localConfig) === 'object'){
      localConfig = process.env.localConfig
    } else {
      return logger.sysError('localConfig is of unknown type');
    }
  }
  if (options && options.remoteConfig) {
    configModel.findOne({}, function(err, remoteConfig){
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
        return logger.sysError('remoteConfig is of unknown type');
      }
      return _.extend(config, remoteConfig, localConfig);
    });
  } else {
    return _.extend(config, localConfig);
  }
};



function readConfig(options, currentConfig, newConfigPath){
  var validFile = null;
  var parsedConfig = null;
  var inherit = null;
  if (newConfigPath.slice(-3) === '.js' || newConfigPath.slice(-5) === '.json') {
    validFile = newConfigPath;
  } else {
    extensions.forEach(function(extension){
      var exists = fs.existsSync(newConfigPath + extension);
      if (exists) validFile = newConfigPath + extension;
    });
  }

  if (validFile) {
    var data = fs.readFileSync(validFile, {encoding:'utf8'});
    try {
      parsedConfig = JSON.parse(data)
    } catch (e) {
      return logger.sysError('file: ' + validFile + ' is not parsable JSON');
    }
    if (!parsedConfig) return logger.sysError('config-manager, cound not read file: ' + validFile);
    inherit = parsedConfig.inherit;
      _.extend(parsedConfig, currentConfig);
      if (inherit) {
        readConfig(options, parsedConfig, path.join(configDir, inherit))
      } else {
        if (options && options.logConfig) logger.info('config loaded: ' + JSON.stringify(parsedConfig));
        exports.data = parsedConfig;
        return parsedConfig;
      }
  } else {
    logger.sysError('config-manager, not a valid file for config provided: ' + newConfigPath);
  }
}
