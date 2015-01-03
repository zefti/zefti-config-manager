var path = require('path');
var fs = require('fs');
var _ = require('underscore');
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
  console.log(options);
  if (options && options.configModule) configDir = path.join(appDir, '/node_modules', options.configModule);
  if ((options && options.env) || process.env.env) env = process.env.env || options.env;
  var baseConfigFile = path.join(configDir, env);
  var config = readConfig(options, {}, baseConfigFile);
  return config;
}

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
      return logger.sysError('file: ' + validFile + ' is not parsable JSON')
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
