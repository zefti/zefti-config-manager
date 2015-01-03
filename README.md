zefti-config-manager
====================

node app configuration package

usage
=====

var zefti-config = require('zefti-config');
var config = config.init({configModule:'zefti-config', env:'prod'});

init options
============
configDir: The directory where config variables are stored
env: The environment to use (must match the file in the config directory)


notes
=====
Only .js & .json extensions are supported for files



Create a config folder in the root folder of the app.

/prod/prodtest