//LIBRARIES
const cp = require('child_process');
const EventSource = require('eventsource');
var sql = require("mssql");
const config = require('config');
const dayjs = require('dayjs');
var utc = require('dayjs/plugin/utc');
dayjs.extend(utc);
const https = require('https');
const axios = require('axios');
//Web API Stuff
const express = require('express'); //npm install express
const bodyParser = require('body-parser'); // npm install body-parser
const http = require('http');
const filter = require("mrc-filter");
const utils = require("mrc-utils");
//SITE VARIABLES
const vFLTServer = config.get('FLTServer');
const vMRCServerAuth = config.get('MRCServerAuth');
const vFLTServerAuth = config.get('FLTServerAuth'); //`Basic bWNoYW1iZXI6ODAwMTYzNTc=`
var dbConfig = config.get('dbConfig');
const vFMIACPPort = config.get('FMIACPPort');
const fs = require('fs');
const csv = require("csv-parser");
//STATIC VARIABLES - SETTINGS
var APP_VERSION = "1.3";
//const vDoSyncInterval = 30000;
const vLoadDataInterval = 30000;
var vReadQSize = 50;
var reconnectFrequencySeconds = 1;
var evtSource;
var PORT = process.env.PORT || vFMIACPPort;
var vFMIACPData = new Map();
var vFMIACPDataCurrent = new Map();
var vLastUpdateFMIACPLog = 0;
//FUNCTIONS
async function startDBConnect() {
    try {
        await dbConn.connect();
    } catch (err) {
        console.log("FMIACP:STARTDBCONNECT:CONNECTION-ERROR:" + err);
    };
    console.log("FMIACP:STARTDBCONNECT:Starting process to load/save MineStar ACP data...");
    //await loadMOMSACPData();
    //await loadCSVACPStaticData();
    await loadFMIACPData();
}

var vCPUPercent = 0;
var vlastCPU = process.cpuUsage();
var vlastTime = process.hrtime();
var vLoadingFMIACPData = false;
//[OID] [bigint] NOT NULL,[ACTIVE] [bit] NULL, [MACHINE_NAME] [nvarchar](64) NULL, [OREPASS_NAME] [nvarchar](64) NULL, [LOADING_POINT_NAME] [nvarchar](64) NULL, [TOTAL_CAPACITY_TONNES] [float] NULL, [MIDSENSOR_TONNES] [float] NULL, [CAPACITY_LIMIT_TONNES] [float] NULL, [INITIAL_LEVEL_TONNES] [float] NULL, [CURRENT_LEVEL_TONNES] [float] NULL, [TAKEN_AMOUNT_TONNES] [float] NULL, [DUMPED_AMOUNT_TONNES] [float] NULL
async function loadFMIACPData() {
    if (!vLoadingFMIACPData) {
        vLoadingFMIACPData = true;
        var vElapsedUsage = process.cpuUsage(vlastCPU);
        var vElapsedTime = secNSec2ms(process.hrtime(vlastTime));
        var vElapsedUsageUser = secNSec2ms(vElapsedUsage.user);
        var vElapsedUsageSystem = secNSec2ms(vElapsedUsage.system);
        vCPUPercent = Number(100 * (vElapsedUsageUser + vElapsedUsageSystem) / vElapsedTime).toFixed(2);
        vlastCPU = process.cpuUsage();
        vlastTime = process.hrtime();
        //var vMapACP = new Map();
        //Now lets load the DEZAPP ACP Data
        console.log("FMIACP:LOADFMIACPDATA:Getting FMIACPDATA Rows...");
        try {
            vFMIACPDataCurrent = new Map();
            var request = dbConn.request();
            //SELECT [ID] ,[START_TIME] ,[MACHINE_NAME] ,[CATEGORY],[TYPE],[MEASUREMENT],[VALUE] FROM [gbc_mrcapps].[dbo].[FMIACP]
            let result = await request.query("SELECT * FROM [gbc_mrcapps].[dbo].[FMIACP] WHERE LAST_UPDATE >= DATEADD(s, " + vLastUpdateFMIACPLog / 1000 + ", '1970-01-01 00:00:00') ORDER BY ID ASC;");
            if (result !== null) {
                for (const recordset of result.recordsets) {
                    console.log("FMIACP:LOADFMIACPDATA:NEW SUM DATA SIZE[" + recordset.length + "].");
                    for (const value of recordset) {
                        vFMIACPData.set(value.ID, value);
                        vFMIACPDataCurrent.set(value.MACHINE_NAME + "-" + value.TYPE, value);
                        var vUpdate = (new Date(value.LAST_UPDATE).getTime());
                        if (vUpdate > vLastUpdateFMIACPLog) {
                            vLastUpdateFMIACPLog = vUpdate;
                        }
                    };
                }
                console.log("FMIACP:LOADFMIACPDATA:TOTAL SUM DATA SIZE[" + vFMIACPData.size + "]CURRENT[" + vFMIACPDataCurrent.size + "].");
            }
        } catch (err) {
            console.log("FMIACP:LOADFMIACPDATA:SQL-ERROR:" + err);
        };
        console.log("FMIACP:LOADFMIACPDATA:FINISHED LOADING ALL FMI ACP DATA"); //["+JSON.stringify(vMAPACP)+"].");
        //return vMapACP;
        vLoadingFMIACPData = false;
    }
}

//[OID] [bigint] NOT NULL,[ACTIVE] [bit] NULL, [MACHINE_NAME] [nvarchar](64) NULL, [OREPASS_NAME] [nvarchar](64) NULL, [LOADING_POINT_NAME] [nvarchar](64) NULL, [TOTAL_CAPACITY_TONNES] [float] NULL, [MIDSENSOR_TONNES] [float] NULL, [CAPACITY_LIMIT_TONNES] [float] NULL, [INITIAL_LEVEL_TONNES] [float] NULL, [CURRENT_LEVEL_TONNES] [float] NULL, [TAKEN_AMOUNT_TONNES] [float] NULL, [DUMPED_AMOUNT_TONNES] [float] NULL
//Stores the event source data into the SQL Datbase.
async function storeFMIACP(vData) {
    //vCurrentMachine.set(vData.name,vData);
    try {
        console.log('FMIACP:STOREFMIACP:Storing ACP Data...');
        var request = dbConn.request();
        if (vData.START_TIME != null) {
            vStart = new Date(vData.START_TIME.getTime()); // - (9 * 60 * 60 * 1000)); //Overcome bug in node-mssql
        }
        var vTimeStamp = vData.START_TIME.getTime() / 1000;
        let result = await request
            .input("machine_name", sql.NVarChar(64), vData.MACHINE_NAME)
            .input("start_time", sql.DateTimeOffset(3), vStart)
            .input("category", sql.NVarChar(64), vData.CATEGORY)
            .input("type", sql.NVarChar(64), vData.TYPE)
            .input("measurement", sql.NVarChar(64), vData.MEASUREMENT)
            .input("value", sql.NVarChar(256), vData.VALUE)
            .input("vUNIQUE_CONST", sql.NVarChar(128), (vTimeStamp + '-' + vLog.MACHINE_NAME + '-' + vData.TYPE))
            .query("EXECUTE mrcFMIACPMerge @machine_name, @start_time, @category, @type, @measurement,  @value, @vUNIQUE_CONST ");
        if (result !== null) {
            console.log('FMIACP:STOREFMIACP:DATA[' + vData.MACHINE_NAME + '] SAVED RESULT:' + result.rowsAffected);
            vDataStoreCount++;
        } else {
            console.log('FMIACP:STOREFMIACP:DATA[' + vData.MACHINE_NAME + '] Failed...');
            vDataStoreFailCount++;
            return false;
        }
    } catch (err) {
        console.log('FMIACP:STOREFMIACP:SQL ERROR:' + err + ' DATA[' + JSON.stringify(vData) + '].');
        vDataStoreFailCount++;
        return false;
    }
    return true;
}

//Setup the database connection pool.
var dbConn = new sql.ConnectionPool(dbConfig);
startDBConnect();
//setInterval(doSync,vDoSyncInterval);

//Now lets setup the WEB API ENDPOINTS
var app = express();
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', true);
    return next();
});

function secNSec2ms(secNSec) {
    if (Array.isArray(secNSec)) {
        return secNSec[0] * 1000 + secNSec[1] / 1000000;
    }
    return secNSec / 1000;
}

function authentication(req, res, next) {
    var authheader = req.headers.authorization;
    //console.log(req.headers);

    if (!authheader) {
        var err = new Error('You are not authenticated!');
        res.setHeader('WWW-Authenticate', 'Basic');
        err.status = 401;
        return next(err)
    }

    var auth = new Buffer.from(authheader.split(' ')[1],
        'base64').toString().split(':');
    var user = auth[0];
    var pass = auth[1];

    var vAuthenticated = false;
    var vLogin = config.get('login');
    //console.log("LOGIN:"+JSON.stringify(vLogin));
    for (vUser in vLogin) {
        //console.log("USER:"+JSON.stringify(vLogin[vUser]));
        if (user == vLogin[vUser].user && pass == vLogin[vUser].passwd) {
            console.log("LOGGED IN: " + JSON.stringify(user) + ".");
            // If Authorized user
            vAuthenticated = true;
            next();
        }
    }
    if (!vAuthenticated) {
        var err = new Error('You are not authenticated!');
        res.setHeader('WWW-Authenticate', 'Basic');
        err.status = 401;
        return next(err);
    }
}

app.use(authentication);
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({
    extended: true
}));

var vDataStoreCount = 0;
var vDataStoreFailCount = 0;
var vDataInputCount = 0;
var vDataInputRequestCount = 0;
var vDataOutputCount = 0;
var vDataOutputRequestCount = 0;

//Lets update a Zone Feature
app.post('/api/createFMIACP', async (req, res) => {
    var vFLTACPUpdate = req.body;
    var vResult = 0;
    console.log("FLTACP:createFLTACPUpdate Update Received[" + JSON.stringify(vFLTACPUpdate) + "]");
    var vElement = {};
    vElement.MACHINE_NAME = "" + vFLTACPUpdate.MACHINE_NAME;
    vElement.START_TIME = new Date(vFLTACPUpdate.START_TIME);
    vElement.CATEGORY = "" + vFLTACPUpdate.CATEGORY;
    vElement.TYPE = "" + vFLTACPUpdate.TYPE;
    vElement.MEASUREMENT = "" + vFLTACPUpdate.MEASUREMENT;
    vElement.VALUE = "" + vFLTACPUpdate.VALUE;
    vResult = storeFMIACP(vElement);
    var vKey = vElement.MACHINE_NAME + "-" + vElement.TYPE;
    if (vFMIACPDataCurrent.has(vKey)) {
        if (vFMIACPDataCurrent.get(vKey).START_TIME < vElement.START_TIME) {
            vFMIACPDataCurrent.set(vKey, vElement);
        }
    } else {
        vFMIACPDataCurrent.set(vKey, vElement);
    }
    //vFMIZones.features.push(vNewZone);
    res.json(vResult); //{ id: vNewZone.id});
});

app.get('/api/getFMIACP', (req, res) => {
    var vReturnData = utils.getArray(vFMIACPData);
    vReturnData = filter.doFilters(vReturnData, req);
    res.send(vReturnData);
    //Stats
    vDataOutputRequestCount++;
    vDataOutputCount = vDataOutputCount + vReturnData.length;
});

app.get('/api/getFMIACPCurrent', (req, res) => {
    var vReturnData = utils.getArray(vFMIACPDataCurrent);
    vReturnData = filter.doFilters(vReturnData, req);
    res.send(vReturnData);
    //Stats
    vDataOutputRequestCount++;
    vDataOutputCount = vDataOutputCount + vReturnData.length;
});


app.get('/api/getAppStatusFMIACP', (req, res) => {
    var vAppStatus = {};
    vAppStatus.Name = "FMIACP";
    vAppStatus.Version = APP_VERSION;
    vAppStatus.DataStoreSize = vFMIACPData.size;
    vAppStatus.DataStoreCount = vDataStoreCount;
    vAppStatus.DataStoreFailCount = vDataStoreFailCount;
    vAppStatus.DataInputCount = vDataInputCount;
    vAppStatus.DataInputRequestCount = vDataInputRequestCount;
    vAppStatus.DataOutputCount = vDataOutputCount;
    vAppStatus.DataOutputRequestCount = vDataOutputRequestCount;
    vAppStatus.UsageMemory = process.memoryUsage();
    vAppStatus.UsageCPU = process.cpuUsage();
    vAppStatus.CPU = vCPUPercent;
    res.send(vAppStatus);
});

console.log("FMIACP:Starting API endpoints...");
var server = http.createServer(app);
server.listen(PORT, function() {
    console.log('FMIACP:Server running, version ' + APP_VERSION + ', Express is listening... at ' + PORT + " for requests");
});
setInterval(loadFMIACPData, vLoadDataInterval); // Now it starts the same thing.
//
