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
var APP_VERSION = "2.0";
//const vDoSyncInterval = 30000;
const vLoadDataInterval = 30000;
var vReadQSize = 50;
var reconnectFrequencySeconds = 1;
var evtSource;
var PORT = process.env.PORT || vFMIACPPort;
var vFMIACPData = new Map();
var vFMIACPDataCurrent = new Map();
var vLastUpdateFMIACPLog = 0;

// Variable untuk menyimpan koneksi database
var pool = null;

// Fungsi untuk mendapatkan koneksi ke database
async function getConnection() {
    try {
        console.log("FMIACP:GETCONNECTION:Mencoba terhubung ke database...");
        
        // Buat objek konfigurasi baru yang mutable
        const dbConfigSource = config.get('dbConfig');
        const dbConnectionConfig = {
            user: dbConfigSource.user,
            password: dbConfigSource.password,
            server: dbConfigSource.server,
            database: dbConfigSource.database,
            driver: dbConfigSource.driver,
            options: {
                encrypt: dbConfigSource.options.encrypt,
                enableArithAbort: dbConfigSource.options.enableArithAbort,
                trustServerCertificate: dbConfigSource.options.trustServerCertificate,
                trustedConnection: dbConfigSource.options.trustedConnection
            },
            pool: {
                max: dbConfigSource.pool.max,
                min: dbConfigSource.pool.min,
                idleTimeoutMillis: dbConfigSource.pool.idleTimeoutMillis
            },
            connectionTimeout: dbConfigSource.connectionTimeout,
            requestTimeout: dbConfigSource.requestTimeout
        };
        
        console.log(`FMIACP:GETCONNECTION:Server: ${dbConnectionConfig.server}, Database: ${dbConnectionConfig.database}, User: ${dbConnectionConfig.user}`);
        
        // Koneksi menggunakan konfigurasi properti dari default.json
        pool = await sql.connect(dbConnectionConfig);
        console.log("FMIACP:GETCONNECTION:Berhasil terhubung ke database SQL Server!");
        return pool;
    } catch (err) {
        console.log("FMIACP:GETCONNECTION:Error koneksi database:", err);
        pool = null;
        return null;
    }
}

// Fungsi untuk memastikan ada koneksi database
async function ensureConnection() {
    if (!pool) {
        console.log("FMIACP:ENSURECONNECTION:Koneksi database belum ada, mencoba membuat koneksi baru...");
        await getConnection();
    }
    return pool;
}

// Fungsi inisialisasi koneksi database
async function startDBConnect() {
    try {
        console.log("FMIACP:STARTDBCONNECT:Memulai proses koneksi database...");
        await getConnection();
        
        if (pool) {
            console.log("FMIACP:STARTDBCONNECT:Koneksi berhasil. Memuat data FMIACP...");
            await loadFMIACPData();
        } else {
            console.log("FMIACP:STARTDBCONNECT:Gagal terhubung ke database. Coba lagi nanti.");
        }
    } catch (err) {
        console.log("FMIACP:STARTDBCONNECT:ERROR:", err);
    }
}

var vCPUPercent = 0;
var vlastCPU = process.cpuUsage();
var vlastTime = process.hrtime();
var vLoadingFMIACPData = false;
//[OID] [bigint] NOT NULL,[ACTIVE] [bit] NULL, [MACHINE_NAME] [nvarchar](64) NULL, [OREPASS_NAME] [nvarchar](64) NULL, [LOADING_POINT_NAME] [nvarchar](64) NULL, [TOTAL_CAPACITY_TONNES] [float] NULL, [MIDSENSOR_TONNES] [float] NULL, [CAPACITY_LIMIT_TONNES] [float] NULL, [INITIAL_LEVEL_TONNES] [float] NULL, [CURRENT_LEVEL_TONNES] [float] NULL, [TAKEN_AMOUNT_TONNES] [float] NULL, [DUMPED_AMOUNT_TONNES] [float] NULL
async function loadFMIACPData() {
    if (!vLoadingFMIACPData) {
        vLoadingFMIACPData = true;
        console.log("FMIACP:LOADFMIACPDATA:Memuat data FMIACP...");
        
        try {
            // Pastikan ada koneksi database
            const connection = await ensureConnection();
            if (!connection) {
                throw new Error("Tidak ada koneksi database");
            }
            
            // Bersihkan data Map
            vFMIACPData.clear();
            vFMIACPDataCurrent.clear();
            
            const request = connection.request();
            
            // Query untuk mengambil semua data
            console.log("FMIACP:LOADFMIACPDATA:Menjalankan query...");
            let result = await request.query(`
                SELECT * FROM [gbc_mrcapps].[dbo].[FMIACP] 
                ORDER BY ID DESC
            `);
            
            if (result && result.recordset) {
                console.log("FMIACP:LOADFMIACPDATA:Data baru ditemukan, jumlah:", result.recordset.length);
                
                for (const row of result.recordset) {
                    vFMIACPData.set(row.ID, row);
                    vFMIACPDataCurrent.set(row.MACHINE_NAME + "-" + row.TYPE, row);
                }
                
                console.log("FMIACP:LOADFMIACPDATA:Total data yang dimuat - Total:", vFMIACPData.size, "Data Current:", vFMIACPDataCurrent.size);
            } else {
                console.log("FMIACP:LOADFMIACPDATA:Tidak ada data yang dikembalikan oleh query");
            }
        } catch (err) {
            console.log("FMIACP:LOADFMIACPDATA:ERROR SQL:", err);
            
            // Reset koneksi jika error
            if (pool) {
                try {
                    await pool.close();
                } catch (closeErr) {
                    console.log("FMIACP:LOADFMIACPDATA:Error saat menutup koneksi:", closeErr);
                }
                pool = null;
            }
        } finally {
            vLoadingFMIACPData = false;
        }
    } else {
        console.log("FMIACP:LOADFMIACPDATA:Proses memuat data sedang berlangsung, dilewati...");
    }
}

//[OID] [bigint] NOT NULL,[ACTIVE] [bit] NULL, [MACHINE_NAME] [nvarchar](64) NULL, [OREPASS_NAME] [nvarchar](64) NULL, [LOADING_POINT_NAME] [nvarchar](64) NULL, [TOTAL_CAPACITY_TONNES] [float] NULL, [MIDSENSOR_TONNES] [float] NULL, [CAPACITY_LIMIT_TONNES] [float] NULL, [INITIAL_LEVEL_TONNES] [float] NULL, [CURRENT_LEVEL_TONNES] [float] NULL, [TAKEN_AMOUNT_TONNES] [float] NULL, [DUMPED_AMOUNT_TONNES] [float] NULL
//Stores the event source data into the SQL Datbase.
async function storeFMIACP(vData) {
    try {
        console.log('FMIACP:STOREFMIACP:Menyimpan data ACP...');
        
        // Pastikan ada koneksi database
        const connection = await ensureConnection();
        if (!connection) {
            console.log('FMIACP:STOREFMIACP:Tidak ada koneksi database, gagal menyimpan');
            vDataStoreFailCount++;
            return false;
        }
        
        const request = connection.request();
        
        // Persiapkan data untuk stored procedure
        let vStart = null;
        if (vData.START_TIME != null) {
            vStart = new Date(vData.START_TIME);
        }
        
        // Buat UNIQUE_CONST dengan format timestamp-machine-type
        const vTimeStamp = Math.floor(Date.now() / 1000);
        const vUniqueConst = `${vTimeStamp}-${vData.MACHINE_NAME}-${vData.TYPE}`;
        
        console.log('FMIACP:STOREFMIACP:Data untuk stored procedure:', {
            machine_name: vData.MACHINE_NAME,
            start_time: vStart,
            category: vData.CATEGORY,
            type: vData.TYPE,
            measurement: vData.MEASUREMENT,
            value: vData.VALUE,
            unique_const: vUniqueConst
        });

        // Jalankan stored procedure
        const result = await request
            .input("vmachine_name", sql.NVarChar(64), vData.MACHINE_NAME)
            .input("vstart_time", sql.DateTimeOffset(3), vStart)
            .input("vcategory", sql.NVarChar(64), vData.CATEGORY)
            .input("vtype", sql.NVarChar(64), vData.TYPE)
            .input("vmeasurement", sql.NVarChar(64), vData.MEASUREMENT)
            .input("vvalue", sql.NVarChar(64), vData.VALUE)
            .input("vUNIQUE_CONST", sql.NVarChar(128), vUniqueConst)
            .execute('mrcFMIACPMerge');
        
        if (result && result.rowsAffected && result.rowsAffected[0] > 0) {
            console.log('FMIACP:STOREFMIACP:Data berhasil disimpan:', vData.MACHINE_NAME, result.rowsAffected);
            vDataStoreCount++;
            return true;
        } else {
            console.log('FMIACP:STOREFMIACP:Gagal menyimpan data:', vData.MACHINE_NAME);
            vDataStoreFailCount++;
            return false;
        }
    } catch (err) {
        console.log('FMIACP:STOREFMIACP:ERROR SQL:', err);
        console.log('FMIACP:STOREFMIACP:Data yang gagal disimpan:', JSON.stringify(vData, null, 2));
        vDataStoreFailCount++;
        return false;
    }
}

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

app.get('/api/getFMIACP', async (req, res) => {
    try {
        console.log("FMIACP:API:getFMIACP:Request diterima");
        
        // Tambahkan timeout untuk mencegah request menggantung
        const timeout = setTimeout(() => {
            console.log("FMIACP:API:getFMIACP:Request timeout setelah 30 detik");
            res.status(504).json({ error: "Request timeout" });
        }, 30000);
        
        // Pastikan data terbaru
        console.log("FMIACP:API:getFMIACP:Memuat data terbaru...");
        await loadFMIACPData();
        
        // Bersihkan timeout karena data sudah dimuat
        clearTimeout(timeout);
        
        // Periksa apakah ada koneksi database
        if (!pool) {
            console.log("FMIACP:API:getFMIACP:Tidak ada koneksi database");
            return res.status(503).json({ error: "Database connection not available" });
        }
        
        // Konversi data Map ke array untuk response
        console.log("FMIACP:API:getFMIACP:Mempersiapkan response...");
        var vReturnData = Array.from(vFMIACPData.values());
        
        // Terapkan filter jika ada
        vReturnData = filter.doFilters(vReturnData, req);
        
        console.log("FMIACP:API:getFMIACP:Mengirim response, jumlah data:", vReturnData.length);
        res.json(vReturnData);
        
        // Update statistik
        vDataOutputRequestCount++;
        vDataOutputCount = vDataOutputCount + vReturnData.length;
    } catch (error) {
        console.error("FMIACP:API:getFMIACP:Error:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
});

// Endpoint untuk mendapatkan data FMIACP saat ini (terbaru)
app.get('/api/getFMIACPCurrent', async (req, res) => {
    try {
        console.log("FMIACP:API:getFMIACPCurrent:Request diterima");
        
        // Tambahkan timeout untuk mencegah request menggantung
        const timeout = setTimeout(() => {
            console.log("FMIACP:API:getFMIACPCurrent:Request timeout setelah 30 detik");
            res.status(504).json({ error: "Request timeout" });
        }, 30000);
        
        // Pastikan data terbaru
        console.log("FMIACP:API:getFMIACPCurrent:Memuat data terbaru...");
        await loadFMIACPData();
        
        // Bersihkan timeout
        clearTimeout(timeout);
        
        // Periksa koneksi database
        if (!pool) {
            console.log("FMIACP:API:getFMIACPCurrent:Tidak ada koneksi database");
            return res.status(503).json({ error: "Database connection not available" });
        }
        
        // Konversi data ke array
        console.log("FMIACP:API:getFMIACPCurrent:Mempersiapkan response...");
        var vReturnData = Array.from(vFMIACPDataCurrent.values());
        
        // Terapkan filter
        vReturnData = filter.doFilters(vReturnData, req);
        
        console.log("FMIACP:API:getFMIACPCurrent:Mengirim response, jumlah data:", vReturnData.length);
        res.json(vReturnData);
        
        // Update statistik
        vDataOutputRequestCount++;
        vDataOutputCount = vDataOutputCount + vReturnData.length;
    } catch (error) {
        console.error("FMIACP:API:getFMIACPCurrent:Error:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
});

// Endpoint untuk mendapatkan status aplikasi
app.get('/api/getAppStatusFMIACP', (req, res) => {
    try {
        console.log("FMIACP:API:getAppStatusFMIACP:Request diterima");
        
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
            DatabaseConnection: pool ? "Connected" : "Disconnected",
            UsageMemory: process.memoryUsage(),
            UsageCPU: process.cpuUsage(),
            CPU: vCPUPercent
        };
        
        console.log("FMIACP:API:getAppStatusFMIACP:Mengirim status aplikasi");
        res.json(vAppStatus);
    } catch (error) {
        console.error("FMIACP:API:getAppStatusFMIACP:Error:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
});

console.log("FMIACP:Memulai API endpoints...");
var server = http.createServer(app);

// Tangani error server
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.log(`FMIACP:Port ${PORT} sudah digunakan. Mencoba port alternatif...`);
        // Coba port alternatif
        server.listen(0); // Akan otomatis mencari port yang tersedia
    } else {
        console.error('FMIACP:Server error:', error);
        process.exit(1);
    }
});

// Listener saat server berhasil berjalan
server.on('listening', () => {
    const address = server.address();
    PORT = address.port;
    console.log('FMIACP:Server berjalan, versi ' + APP_VERSION + ', mendengarkan pada port ' + PORT);
    
    // Inisialisasi koneksi database setelah server berjalan
    startDBConnect().catch(err => {
        console.error("FMIACP:Gagal memulai koneksi database:", err);
    });
});

// Mulai server
server.listen(PORT);

// Jadwalkan pembaruan data secara berkala
setInterval(loadFMIACPData, vLoadDataInterval);
