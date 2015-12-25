var fs = require('fs');
var utils = require('zefti-utils');
var result = {};
var loaded = false;
var localPrefix = 'zefti';
var _ = require('underscore');






function mergeLocalConfig(){
  var prefixLength = localPrefix.length;
  for (var key in process.env) {
    if (key.substr(0, prefixLength) === localPrefix) {
      result.currentSettings[key.substr(prefixLength)] = process.env[key];
    }
  }
}


exports.set = function(options) {
  if (loaded) return result;

  result.currentEnv = options.env;
  readFiles(options.configPath);
  var currentSettings = result.env[options.env];
  if (!currentSettings) throw new Error ('no currentConfig found for: ' + options.config);
  if (!currentSettings.inherit) {
    result.currentSettings = currentSettings;
  } else {
    var finalCurrentSettings = inheritConfig(result.env[currentSettings.inherit], result.env[options.env]);
    result.currentSettings = finalCurrentSettings
  }
  mergeLocalConfig();
  loaded = true;
  exports.settings = result.env;
  exports.currentSettings = result.currentSettings;
  exports.validation = result.validation;
  exports.response = result.response;
  exports.currentEnv = options.env;
  return result;
};

