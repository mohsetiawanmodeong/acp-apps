/**
 * ACP Log Converter
 * Mengonversi log dari ACP ADAM ke format JSON
 */

// Data yang akan disimpan dalam memori
let convertedData = {};

// DOM elements
document.addEventListener('DOMContentLoaded', function() {
    // Input elements
    const logFileInput = document.getElementById('logFileInput');
    const convertBtn = document.getElementById('convertBtn');
    const customMachineNameCheck = document.getElementById('customMachineNameCheck');
    const customMachineNameDiv = document.getElementById('customMachineNameDiv');
    const customMachineName = document.getElementById('customMachineName');
    const timezoneSelect = document.getElementById('timezoneSelect');
    
    // Output elements
    const resultSection = document.getElementById('resultSection');
    const conversionResult = document.getElementById('conversionResult');
    const resultTable = document.getElementById('resultTable');
    const previewCard = document.getElementById('previewCard');
    const jsonPreview = document.getElementById('jsonPreview');
    const closePreviewBtn = document.getElementById('closePreviewBtn');
    const copyJsonBtn = document.getElementById('copyJsonBtn');

    // Event listeners
    customMachineNameCheck.addEventListener('change', function() {
        customMachineNameDiv.classList.toggle('d-none', !this.checked);
    });

    convertBtn.addEventListener('click', function() {
        if (logFileInput.files.length === 0) {
            alert('Silakan pilih file log terlebih dahulu.');
            return;
        }

        // Konversi semua file yang dipilih
        convertFiles(logFileInput.files);
    });

    closePreviewBtn.addEventListener('click', function() {
        previewCard.classList.add('d-none');
    });
    
    // Tambahkan event listener untuk tombol copy
    copyJsonBtn.addEventListener('click', function() {
        const jsonText = jsonPreview.textContent;
        copyToClipboard(jsonText);
    });

    // Pastikan tombol tutup menggunakan class btn-secondary
    if (closePreviewBtn && !closePreviewBtn.classList.contains('btn-secondary')) {
        closePreviewBtn.classList.remove('btn-primary', 'btn-danger', 'btn-success', 'btn-info', 'btn-warning');
        closePreviewBtn.classList.add('btn-secondary');
    }

    // Fungsi untuk menyalin teks ke clipboard
    function copyToClipboard(text) {
        // Menggunakan Clipboard API jika tersedia (modern browsers)
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text)
                .then(() => {
                    showCopySuccess();
                })
                .catch((err) => {
                    console.error('Gagal menyalin: ', err);
                    fallbackCopyToClipboard(text);
                });
        } else {
            // Fallback untuk browser yang tidak mendukung Clipboard API
            fallbackCopyToClipboard(text);
        }
    }

    // Fallback method untuk menyalin teks ke clipboard
    function fallbackCopyToClipboard(text) {
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            const success = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (success) {
                showCopySuccess();
            } else {
                console.error('Fallback: Gagal menyalin teks');
            }
        } catch (err) {
            console.error('Fallback: Gagal menyalin teks', err);
        }
    }

    // Menampilkan indikator sukses setelah menyalin
    function showCopySuccess() {
        // Simpan teks asli tombol
        const originalText = copyJsonBtn.textContent;
        
        // Ubah teks dan tampilan tombol
        copyJsonBtn.textContent = 'Tersalin!';
        copyJsonBtn.classList.remove('btn-primary');
        copyJsonBtn.classList.add('btn-success');
        
        // Kembalikan ke tampilan asli setelah 2 detik
        setTimeout(() => {
            copyJsonBtn.textContent = originalText;
            copyJsonBtn.classList.remove('btn-success');
            copyJsonBtn.classList.add('btn-primary');
        }, 2000);
    }

    // Fungsi untuk mengonversi file yang dipilih
    function convertFiles(files) {
        // Reset output
        resultTable.innerHTML = '';
        convertedData = {};
        
        let processedCount = 0;
        const totalFiles = files.length;
        
        // Proses setiap file
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    // Parse dan konversi data
                    const fileContent = e.target.result;
                    const fileName = file.name;
                    const machineNameFromFile = extractMachineNameFromFilename(fileName);
                    const machineName = customMachineNameCheck.checked ? customMachineName.value : machineNameFromFile;
                    const timezone = timezoneSelect.value;
                    
                    // Konversi log ke JSON
                    const jsonData = convertLogToJson(fileContent, machineName, timezone);
                    
                    // Simpan hasil konversi
                    convertedData[fileName] = jsonData;
                    
                    // Tambahkan ke tabel hasil
                    addResultRow(fileName, jsonData.length);
                    
                    // Update counter
                    processedCount++;
                    
                    // Cek apakah semua file sudah diproses
                    if (processedCount === totalFiles) {
                        // Tampilkan ringkasan hasil konversi
                        resultSection.classList.remove('d-none');
                        conversionResult.textContent = `Berhasil mengonversi ${totalFiles} file log menjadi format JSON.`;
                        
                        // Tampilkan preview JSON dari file pertama jika ada
                        if (Object.keys(convertedData).length > 0) {
                            const firstFileName = Object.keys(convertedData)[0];
                            showJsonPreview(firstFileName);
                        }
                    }
                } catch (error) {
                    console.error(`Error processing file ${file.name}:`, error);
                    resultSection.classList.remove('d-none');
                    conversionResult.textContent = `Error saat memproses file ${file.name}: ${error.message}`;
                    conversionResult.classList.remove('alert-success');
                    conversionResult.classList.add('alert-danger');
                }
            };
            
            reader.onerror = function() {
                console.error(`Error reading file ${file.name}`);
                resultSection.classList.remove('d-none');
                conversionResult.textContent = `Error saat membaca file ${file.name}.`;
                conversionResult.classList.remove('alert-success');
                conversionResult.classList.add('alert-danger');
            };
            
            // Baca file sebagai teks
            reader.readAsText(file);
        });
    }

    // Fungsi untuk menambahkan baris di tabel hasil
    function addResultRow(fileName, entryCount) {
        const row = document.createElement('tr');
        
        // Nama file
        const fileNameCell = document.createElement('td');
        fileNameCell.textContent = fileName;
        row.appendChild(fileNameCell);
        
        // Jumlah entri
        const countCell = document.createElement('td');
        countCell.textContent = entryCount;
        row.appendChild(countCell);
        
        // Tombol aksi
        const actionCell = document.createElement('td');
        
        // Tombol preview
        const previewBtn = document.createElement('button');
        previewBtn.className = 'btn btn-sm btn-info me-2';
        previewBtn.textContent = 'Preview';
        previewBtn.addEventListener('click', function() {
            showJsonPreview(fileName);
        });
        actionCell.appendChild(previewBtn);
        
        // Tombol download
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'btn btn-sm btn-success';
        downloadBtn.textContent = 'Download';
        downloadBtn.addEventListener('click', function() {
            downloadJson(fileName);
        });
        actionCell.appendChild(downloadBtn);
        
        row.appendChild(actionCell);
        
        // Tambahkan ke tabel
        resultTable.appendChild(row);
    }

    // Fungsi untuk menampilkan preview JSON
    function showJsonPreview(fileName) {
        const jsonData = convertedData[fileName];
        jsonPreview.textContent = JSON.stringify(jsonData, null, 2);
        previewCard.classList.remove('d-none');
    }

    // Fungsi untuk mendownload JSON
    function downloadJson(fileName) {
        const jsonData = convertedData[fileName];
        const outputFileName = fileName.replace('.txt', '.json');
        
        const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = outputFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
});

/**
 * Ekstrak nama mesin dari nama file log
 * @param {string} filename - Nama file log
 * @returns {string} Nama mesin
 */
function extractMachineNameFromFilename(filename) {
    const match = filename.match(/cps_log_(\d+)_/);
    return match ? match[1] : "unknown";
}

/**
 * Konversi isi log menjadi format JSON
 * @param {string} logContent - Isi file log
 * @param {string} machineName - Nama mesin
 * @param {string} timezone - Zona waktu (format: +XX:XX)
 * @returns {Array} Array objek JSON
 */
function convertLogToJson(logContent, machineName, timezone) {
    const lines = logContent.split('\n');
    const jsonData = [];
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        
        // Parse baris log
        const parsedLine = parseLogLine(trimmedLine, timezone);
        if (!parsedLine) continue;
        
        // Ekstrak category, type, dan value
        const { category, type, value } = getCategoryTypeValue(parsedLine.message);
        
        // Buat entri JSON
        const jsonEntry = {
            "MACHINE_NAME": machineName,
            "START_TIME": parsedLine.timestamp,
            "CATEGORY": category,
            "TYPE": type,
            "MEASUREMENT": "BIT",
            "VALUE": value
        };
        
        jsonData.push(jsonEntry);
    }
    
    return jsonData;
}

/**
 * Parse baris log untuk mendapatkan timestamp dan data log
 * @param {string} line - Baris log yang akan di-parse
 * @param {string} timezone - Zona waktu yang diinginkan
 * @returns {Object|null} Objek dengan timestamp dan message atau null jika format tidak sesuai
 */
function parseLogLine(line, timezone) {
    // Format: 2025-04-02 3:55:00 PM - Parking Brake System OFF
    const match = line.match(/(\d{4}-\d{2}-\d{2})\s+(\d+:\d+:\d+)\s+(AM|PM)\s+-\s+(.*)/);
    if (!match) return null;
    
    const [_, date, time, ampm, message] = match;
    
    // Konversi waktu ke format 24 jam
    let [hour, minute, second] = time.split(':').map(Number);
    if (ampm === 'PM' && hour < 12) {
        hour += 12;
    } else if (ampm === 'AM' && hour === 12) {
        hour = 0;
    }
    
    // Format timestamp dengan timezone yang dipilih
    const timestamp = `${date} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}.000 ${timezone}`;
    
    return {
        timestamp,
        message
    };
}

/**
 * Tentukan category, type, dan value berdasarkan pesan log
 * @param {string} message - Pesan log
 * @returns {Object} Objek dengan category, type, dan value
 */
function getCategoryTypeValue(message) {
    let category = "";
    let type = "";
    let value = "";
    
    if (message.includes("Parking Brake System")) {
        category = "DO-0";
        type = "PARKING_BRAKE";
        value = message.includes("ON") ? "1" : "0";
    } else if (message.includes("Wall Collision FRONT")) {
        category = "DI-0";
        type = "FRONT_SAFE_ZONE";
        value = message.includes("OFF") ? "0" : "1";
    } else if (message.includes("Wall Collision REAR")) {
        category = "DI-2";
        type = "REAR_SAFE_ZONE";
        value = message.includes("OFF") ? "0" : "1";
    }
    
    return { category, type, value };
} 