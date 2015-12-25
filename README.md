zefti-config-manager
====================

node app configuration package

usage
=====
Step 1 - require zefti-config-manager
var configManager = require('zefti-config-manager');

Step 2 - provide config root folder (if config is stored in json files)
var configLocation = "/my/config/here";

Step 3 - provide remove mongo server config (if remote control of config values is required)
var remoteConfigServerCreds = {
    'replicaSet': ['localhost:27017']
  , 'collection': 'config'
  , 'database': 'test'
};

Step 4 - Instantiate zefti-config-manager
configManager({configFolder: configFolderLocation, configRemote : remoteConfigServerCreds});


fileTypes
=========
Only .js & .json extensions are supported for files


Order of Operations
===================
In order of most relevant to least relevant:
1. Local environment variables
2. Remote config (mongo database)
3. Config JSON files