/**
 * ACP Log Converter
 * Converts ACP ADAM logs to JSON format
 */

// Data stored in memory
let convertedData = {};

// DOM elements
document.addEventListener('DOMContentLoaded', function() {
    // Input elements
    const logFileInput = document.getElementById('logFileInput');
    const convertBtn = document.getElementById('convertBtn');
    
    // Output elements
    const resultSection = document.getElementById('resultSection');
    const conversionResult = document.getElementById('conversionResult');
    const resultTable = document.getElementById('resultTable');
    const previewCard = document.getElementById('previewCard');
    const jsonPreview = document.getElementById('jsonPreview');
    const closePreviewBtn = document.getElementById('closePreviewBtn');
    const copyJsonBtn = document.getElementById('copyJsonBtn');

    // Default timezone WIT (UTC+9)
    const DEFAULT_TIMEZONE = "+09:00";

    // Event listeners
    convertBtn.addEventListener('click', function() {
        if (logFileInput.files.length === 0) {
            alert('Please select at least one log file.');
            return;
        }

        // Convert all selected files
        convertFiles(logFileInput.files);
    });

    closePreviewBtn.addEventListener('click', function() {
        previewCard.classList.add('d-none');
    });
    
    // Add event listener for copy button
    copyJsonBtn.addEventListener('click', function() {
        const jsonText = jsonPreview.textContent;
        copyToClipboard(jsonText);
    });

    // Ensure close button uses btn-secondary class
    if (closePreviewBtn && !closePreviewBtn.classList.contains('btn-secondary')) {
        closePreviewBtn.classList.remove('btn-primary', 'btn-danger', 'btn-success', 'btn-info', 'btn-warning');
        closePreviewBtn.classList.add('btn-secondary');
    }

    // Function to copy text to clipboard
    function copyToClipboard(text) {
        // Use Clipboard API if available (modern browsers)
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text)
                .then(() => {
                    showCopySuccess();
                })
                .catch((err) => {
                    console.error('Failed to copy: ', err);
                    fallbackCopyToClipboard(text);
                });
        } else {
            // Fallback for browsers that don't support Clipboard API
            fallbackCopyToClipboard(text);
        }
    }

    // Fallback method to copy text to clipboard
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
                console.error('Fallback: Failed to copy text');
            }
        } catch (err) {
            console.error('Fallback: Failed to copy text', err);
        }
    }

    // Show success indicator after copying
    function showCopySuccess() {
        // Save original button text
        const originalText = copyJsonBtn.textContent;
        
        // Change button text and appearance
        copyJsonBtn.textContent = 'Copied!';
        copyJsonBtn.classList.remove('btn-primary');
        copyJsonBtn.classList.add('btn-success');
        
        // Restore original appearance after 2 seconds
        setTimeout(() => {
            copyJsonBtn.textContent = originalText;
            copyJsonBtn.classList.remove('btn-success');
            copyJsonBtn.classList.add('btn-primary');
        }, 2000);
    }

    // Function to convert selected files
    function convertFiles(files) {
        // Reset output
        resultTable.innerHTML = '';
        convertedData = {};
        
        let processedCount = 0;
        const totalFiles = files.length;
        
        // Process each file
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    // Parse and convert data
                    const fileContent = e.target.result;
                    const fileName = file.name;
                    const machineName = extractMachineNameFromFilename(fileName);
                    
                    // Convert log to JSON
                    const jsonData = convertLogToJson(fileContent, machineName, DEFAULT_TIMEZONE);
                    
                    // Save conversion result
                    convertedData[fileName] = jsonData;
                    
                    // Add to results table
                    addResultRow(fileName, jsonData.length);
                    
                    // Update counter
                    processedCount++;
                    
                    // Check if all files have been processed
                    if (processedCount === totalFiles) {
                        // Show conversion summary
                        resultSection.classList.remove('d-none');
                        conversionResult.textContent = `Successfully converted ${totalFiles} log file${totalFiles !== 1 ? 's' : ''} to JSON format.`;
                        conversionResult.classList.remove('alert-danger');
                        conversionResult.classList.add('alert-success');
                        
                        // Show preview of first file if available
                        if (Object.keys(convertedData).length > 0) {
                            const firstFileName = Object.keys(convertedData)[0];
                            showJsonPreview(firstFileName);
                        }
                    }
                } catch (error) {
                    console.error(`Error processing file ${file.name}:`, error);
                    resultSection.classList.remove('d-none');
                    conversionResult.textContent = `Error processing file ${file.name}: ${error.message}`;
                    conversionResult.classList.remove('alert-success');
                    conversionResult.classList.add('alert-danger');
                }
            };
            
            reader.onerror = function() {
                console.error(`Error reading file ${file.name}`);
                resultSection.classList.remove('d-none');
                conversionResult.textContent = `Error reading file ${file.name}.`;
                conversionResult.classList.remove('alert-success');
                conversionResult.classList.add('alert-danger');
            };
            
            // Read file as text
            reader.readAsText(file);
        });
    }

    // Function to add a row to the results table
    function addResultRow(fileName, entryCount) {
        const row = document.createElement('tr');
        
        // File name
        const fileNameCell = document.createElement('td');
        fileNameCell.textContent = fileName;
        row.appendChild(fileNameCell);
        
        // Entry count
        const countCell = document.createElement('td');
        countCell.textContent = entryCount;
        row.appendChild(countCell);
        
        // Action buttons
        const actionCell = document.createElement('td');
        
        // Preview button
        const previewBtn = document.createElement('button');
        previewBtn.className = 'btn btn-sm btn-info me-2';
        previewBtn.textContent = 'Preview';
        previewBtn.addEventListener('click', function() {
            // Change button color to provide feedback
            const originalClass = previewBtn.className;
            previewBtn.className = 'btn btn-sm btn-warning me-2';
            
            // Show preview
            showJsonPreview(fileName);
            
            // Restore original button color after a short delay
            setTimeout(() => {
                previewBtn.className = originalClass;
            }, 500);
        });
        actionCell.appendChild(previewBtn);
        
        // Download button
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'btn btn-sm btn-success';
        downloadBtn.textContent = 'Download';
        downloadBtn.addEventListener('click', function() {
            downloadJson(fileName);
        });
        actionCell.appendChild(downloadBtn);
        
        row.appendChild(actionCell);
        
        // Add to table
        resultTable.appendChild(row);
    }

    // Function to display JSON preview
    function showJsonPreview(fileName) {
        const jsonData = convertedData[fileName];
        jsonPreview.textContent = JSON.stringify(jsonData, null, 2);
        previewCard.classList.remove('d-none');
    }

    // Function to download JSON
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
 * Extract machine name from log filename
 * @param {string} filename - Log filename
 * @returns {string} Machine name
 */
function extractMachineNameFromFilename(filename) {
    const match = filename.match(/cps_log_(\d+)_/);
    return match ? match[1] : "unknown";
}

/**
 * Convert log content to JSON format
 * @param {string} logContent - Log file content
 * @param {string} machineName - Machine name
 * @param {string} timezone - Timezone (format: +XX:XX)
 * @returns {Array} Array of JSON objects
 */
function convertLogToJson(logContent, machineName, timezone) {
    const lines = logContent.split('\n');
    const jsonData = [];
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        
        // Parse log line
        const parsedLine = parseLogLine(trimmedLine, timezone);
        if (!parsedLine) continue;
        
        // Extract category, type, and value
        const { category, type, value } = getCategoryTypeValue(parsedLine.message);
        
        // Create JSON entry
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
 * Parse log line to get timestamp and log data
 * @param {string} line - Log line to parse
 * @param {string} timezone - Desired timezone
 * @returns {Object|null} Object with timestamp and message or null if format doesn't match
 */
function parseLogLine(line, timezone) {
    // Format: 2025-04-02 3:55:00 PM - Parking Brake System OFF
    const match = line.match(/(\d{4}-\d{2}-\d{2})\s+(\d+:\d+:\d+)\s+(AM|PM)\s+-\s+(.*)/);
    if (!match) return null;
    
    const [_, date, time, ampm, message] = match;
    
    // Convert time to 24-hour format
    let [hour, minute, second] = time.split(':').map(Number);
    if (ampm === 'PM' && hour < 12) {
        hour += 12;
    } else if (ampm === 'AM' && hour === 12) {
        hour = 0;
    }
    
    // Format timestamp with selected timezone
    const timestamp = `${date} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}.000 ${timezone}`;
    
    return {
        timestamp,
        message
    };
}

/**
 * Determine category, type, and value based on log message
 * @param {string} message - Log message
 * @returns {Object} Object with category, type, and value
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