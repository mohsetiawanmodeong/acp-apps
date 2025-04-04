const sql = require('mssql/msnodesqlv8');
const config = require('config');

/**
 * Test file untuk koneksi database SQL Server
 * Menggunakan konfigurasi dari default.json
 * 
 * File ini menguji:
 * 1. Koneksi ke database
 * 2. Query sederhana
 * 3. Keberadaan stored procedure
 * 4. Akses ke tabel FMIACP
 */
async function testConnection() {
    try {
        // Ambil konfigurasi dari file config dan buat objek baru
        const dbConfigSource = config.get('dbConfig');
        
        // Buat objek konfigurasi baru yang mutable
        const dbConfig = {
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
        
        console.log('======= TEST KONEKSI DATABASE =======');
        console.log('Driver:', dbConfig.driver);
        console.log('Server:', dbConfig.server);
        console.log('Database:', dbConfig.database);
        console.log('User:', dbConfig.user);
        console.log('Options:', JSON.stringify(dbConfig.options));
        
        console.log('\n[TEST 1] Mencoba koneksi ke database...');
        const pool = await sql.connect(dbConfig);
        console.log('✅ Koneksi berhasil dibuat!');
        
        console.log('\n[TEST 2] Menjalankan query sederhana...');
        const result = await pool.request().query('SELECT @@VERSION AS version');
        console.log('✅ Query berhasil:');
        console.log('SQL Server version:', result.recordset[0].version);
        
        console.log('\n[TEST 3] Memeriksa stored procedure mrcFMIACPMerge...');
        const spResult = await pool.request()
            .query("SELECT OBJECT_ID('dbo.mrcFMIACPMerge') as spid");
        
        if (spResult.recordset[0].spid) {
            console.log('✅ Stored procedure mrcFMIACPMerge ditemukan!');
            
            console.log('\n[TEST 4] Menguji akses ke tabel FMIACP...');
            const tableResult = await pool.request()
                .query('SELECT TOP 1 * FROM [gbc_mrcapps].[dbo].[FMIACP]');
            
            if (tableResult.recordset && tableResult.recordset.length > 0) {
                console.log('✅ Tabel FMIACP berhasil diakses!');
                console.log('Sample record:');
                console.log('- ID:', tableResult.recordset[0].ID);
                console.log('- MACHINE_NAME:', tableResult.recordset[0].MACHINE_NAME);
                console.log('- TYPE:', tableResult.recordset[0].TYPE);
                console.log('- CATEGORY:', tableResult.recordset[0].CATEGORY);
            } else {
                console.log('❌ Tabel FMIACP tidak memiliki data');
            }
        } else {
            console.log('❌ PERINGATAN: Stored procedure mrcFMIACPMerge tidak ditemukan!');
        }
        
        await pool.close();
        console.log('\n✅ Koneksi database ditutup');
        console.log('\n===== SEMUA TEST BERHASIL =====');
    } catch (err) {
        console.error('\n❌ ERROR KONEKSI DATABASE:');
        console.error('- Nama Error:', err.name);
        console.error('- Pesan Error:', err.message);
        console.error('- Kode Error:', err.code);
        
        if (err.originalError) {
            console.error('Detail error lebih lanjut:');
            console.error('- Pesan:', err.originalError.message);
            console.error('- Kode:', err.originalError.code);
        }
        console.error('\n===== TEST GAGAL =====');
    }
}

// Jalankan test koneksi
testConnection(); 