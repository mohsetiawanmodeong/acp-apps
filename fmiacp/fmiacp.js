//LIBRARIES
const cp = require('child_process');
const EventSource = require('eventsource');
var sql = require("mssql/msnodesqlv8");
const config = require('config');
const dayjs = require('dayjs');
var utc = require('dayjs/plugin/utc');
dayjs.extend(utc);
const https = require('https');
const axios = require('axios');
//Web API Stuff
const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const filter = require("mrc-filter");
const utils = require("mrc-utils");
//SITE VARIABLES
const vFLTServer = config.get('FLTServer');
const vMRCServerAuth = config.get('MRCServerAuth');
const vFLTServerAuth = config.get('FLTServerAuth');
var dbConfig = config.get('dbConfig');
const vFMIACPPort = config.get('FMIACPPort');
const fs = require('fs');
const csv = require("csv-parser");
//STATIC VARIABLES - SETTINGS
var APP_VERSION = "2.0";
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
    }
    console.log("FMIACP:STARTDBCONNECT:Starting process to load/save FMIACP data...");
    await loadFMIACPData();
}

var vCPUPercent = 0;
var vlastCPU = process.cpuUsage();
var vlastTime = process.hrtime();
var vLoadingFMIACPData = false;

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

        console.log("FMIACP:LOADFMIACPDATA:Getting FMIACPDATA Rows...");
        try {
            vFMIACPDataCurrent = new Map();
            var request = dbConn.request();
            let result = await request.query("SELECT * FROM [gbc_mrcapps].[dbo].[FMIACP] WHERE LAST_UPDATE >= DATEADD(s, " + vLastUpdateFMIACPLog / 1000 + ", '1970-01-01 00:00:00') ORDER BY ID DESC;");
            if (result !== null) {
                for (const recordset of result.recordsets) {
                    console.log("FMIACP:LOADFMIACPDATA:NEW SUM DATA SIZE[" + recordset.length + "].");
                    for (const value of recordset) {
                        var vUpdate = (new Date(value.LAST_UPDATE).getTime());
                        if (vUpdate > vLastUpdateFMIACPLog) {
                            vLastUpdateFMIACPLog = vUpdate;
                        }
                        delete value.LAST_UPDATE;
                        delete value.UNIQUE_CONST;
                        vFMIACPData.set(value.ID, value);
                        vFMIACPDataCurrent.set(value.MACHINE_NAME + "-" + value.TYPE, value);
                    }
                }
                console.log("FMIACP:LOADFMIACPDATA:TOTAL SUM DATA SIZE[" + vFMIACPData.size + "]CURRENT[" + vFMIACPDataCurrent.size + "].");
            }
        } catch (err) {
            console.log("FMIACP:LOADFMIACPDATA:SQL-ERROR:" + err);
        }
        console.log("FMIACP:LOADFMIACPDATA:FINISHED LOADING ALL FMI ACP DATA");
        vLoadingFMIACPData = false;
    }
}

async function storeFMIACP(vData) {
    try {
        console.log('FMIACP:STOREFMIACP:Storing ACP Data...');
        var request = dbConn.request();
        if (vData.START_TIME != null) {
            vStart = new Date(vData.START_TIME.getTime());
        }
        var vTimeStamp = vData.START_TIME.getTime() / 1000;
        let result = await request
            .input("machine_name", sql.NVarChar(64), vData.MACHINE_NAME)
            .input("start_time", sql.DateTimeOffset(3), vStart)
            .input("category", sql.NVarChar(64), vData.CATEGORY)
            .input("type", sql.NVarChar(64), vData.TYPE)
            .input("measurement", sql.NVarChar(64), vData.MEASUREMENT)
            .input("value", sql.NVarChar(256), vData.VALUE)
            .input("vUNIQUE_CONST", sql.NVarChar(128), (vTimeStamp + '-' + vData.MACHINE_NAME + '-' + vData.TYPE))
            .query("EXECUTE mrcFMIACPMerge @machine_name, @start_time, @category, @type, @measurement, @value, @vUNIQUE_CONST");
        
        if (result !== null) {
            console.log('FMIACP:STOREFMIACP:DATA[' + vData.MACHINE_NAME + '] SAVED');
            vDataStoreCount++;
            return true;
        } else {
            console.log('FMIACP:STOREFMIACP:DATA[' + vData.MACHINE_NAME + '] Failed...');
            vDataStoreFailCount++;
            return false;
        }
    } catch (err) {
        console.log('FMIACP:STOREFMIACP:SQL ERROR:' + err);
        vDataStoreFailCount++;
        return false;
    }
}

//Setup the database connection pool.
const dbConnectionConfig = {
    user: dbConfig.user,
    password: dbConfig.password,
    server: dbConfig.server,
    database: dbConfig.database,
    options: {
        ...dbConfig.options,
        enableArithAbort: true,
        trustServerCertificate: true
    },
    pool: {
        max: dbConfig.pool.max,
        min: dbConfig.pool.min,
        idleTimeoutMillis: dbConfig.pool.idleTimeoutMillis
    }
};

var dbConn = new sql.ConnectionPool(dbConnectionConfig);
startDBConnect();

//Now lets setup the WEB API ENDPOINTS
var app = express();
app.use((req, res, next) => {
    // Allow requests from any origin
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    return next();
});

function authentication(req, res, next) {
    var authheader = req.headers.authorization;

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
    for (vUser in vLogin) {
        if (user == vLogin[vUser].user && pass == vLogin[vUser].passwd) {
            console.log("LOGGED IN: " + JSON.stringify(user) + ".");
            vAuthenticated = true;
            next();
            return;
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
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

var vDataStoreCount = 0;
var vDataStoreFailCount = 0;
var vDataInputCount = 0;
var vDataInputRequestCount = 0;
var vDataOutputCount = 0;
var vDataOutputRequestCount = 0;

app.post('/api/createFMIACP', async (req, res) => {
        var vFLTACPUpdate = req.body;
    console.log("FLTACP:createFLTACPUpdate Update Received[" + JSON.stringify(vFLTACPUpdate) + "]");
        var vFLTACPUpdates = [vFLTACPUpdate];
        if (Array.isArray(vFLTACPUpdate)) {
            vFLTACPUpdates = vFLTACPUpdate;
        }

        var vCount = 0;
        var vFailCount = 0;
        for (const data of vFLTACPUpdates) {
            var vElement = {};
            vElement.MACHINE_NAME = "" + data.MACHINE_NAME;
            vElement.START_TIME = new Date(data.START_TIME);
            vElement.CATEGORY = "" + data.CATEGORY;
            vElement.TYPE = "" + data.TYPE;
            vElement.MEASUREMENT = "" + data.MEASUREMENT;
            vElement.VALUE = "" + data.VALUE;
            var vResult = await storeFMIACP(vElement);
            if (vResult) {
                vCount++;
        } else {
            vFailCount++;
        }
                var vKey = vElement.MACHINE_NAME + "-" + vElement.TYPE;
                if (vFMIACPDataCurrent.has(vKey)) {
                    if (vFMIACPDataCurrent.get(vKey).START_TIME < vElement.START_TIME) {
                        vFMIACPDataCurrent.set(vKey, vElement);
                    }
                } else {
                    vFMIACPDataCurrent.set(vKey, vElement);
                }
    }
    res.json({ successcount: vCount, failcount: vFailCount });
});

app.get('/api/getFMIACP', (req, res) => {
    var vReturnData = utils.getArray(vFMIACPData);
    vReturnData = filter.doFilters(vReturnData, req);
    res.send(vReturnData);
    vDataOutputRequestCount++;
    vDataOutputCount = vDataOutputCount + vReturnData.length;
});

app.get('/api/getFMIACPCurrent', (req, res) => {
    var vReturnData = utils.getArray(vFMIACPDataCurrent);
    vReturnData = filter.doFilters(vReturnData, req);
    res.send(vReturnData);
    vDataOutputRequestCount++;
    vDataOutputCount = vDataOutputCount + vReturnData.length;
});

app.get('/api/getAppStatusFMIACP', (req, res) => {
        var vAppStatus = {
            Name: "FMIACP",
            Version: APP_VERSION,
            DataStoreSize: vFMIACPData.size,
            DataStoreCount: vDataStoreCount,
            DataStoreFailCount: vDataStoreFailCount,
            DataInputCount: vDataInputCount,
            DataInputRequestCount: vDataInputRequestCount,
            DataOutputCount: vDataOutputCount,
            DataOutputRequestCount: vDataOutputRequestCount,
            UsageMemory: process.memoryUsage(),
            UsageCPU: process.cpuUsage(),
            CPU: vCPUPercent
        };
    res.send(vAppStatus);
});

console.log("FMIACP:Starting API endpoints...");
var server = http.createServer(app);
server.listen(PORT, function() {
    console.log('FMIACP:Server running, version ' + APP_VERSION + ', Express is listening... at ' + PORT + " for requests");
});

setInterval(loadFMIACPData, vLoadDataInterval);

function secNSec2ms(secNSec) {
    if (Array.isArray(secNSec)) {
        return secNSec[0] * 1000 + secNSec[1] / 1000000;
    }
    return secNSec / 1000;
}
