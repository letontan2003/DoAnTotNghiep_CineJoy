# Real-time crash log capture with better Ctrl+C handling
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CineJoy Crash Log Capture (Real-time)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check device
$devicesOutput = adb devices 2>&1 | Out-String
if ($devicesOutput -notmatch "\tdevice\s*$") {
    Write-Host "ERROR: No device connected!" -ForegroundColor Red
    exit 1
}

Write-Host "Device connected!" -ForegroundColor Green
Write-Host ""

# Clear buffer
Write-Host "Clearing logcat buffer..." -ForegroundColor Yellow
adb logcat -c

Write-Host ""
Write-Host "Starting logcat capture..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "INSTRUCTIONS:" -ForegroundColor Yellow
Write-Host "1. Launch the CineJoy app on your device NOW" -ForegroundColor White
Write-Host "2. Wait for the app to crash" -ForegroundColor White
Write-Host "3. Press Ctrl+C TWICE to stop capturing" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Start logcat in background and filter
$job = Start-Job -ScriptBlock {
    adb logcat -v time
}

try {
    while ($job.State -eq "Running") {
        $output = Receive-Job -Job $job -ErrorAction SilentlyContinue
        if ($output) {
            foreach ($line in $output) {
                if ($line -match "cinejoy|ReactNative|ReactNativeJS|Error|Exception|FATAL|AndroidRuntime|crash" -or 
                    $line -match "com\.cinejoy\.app") {
                    Write-Host $line
                }
            }
        }
        Start-Sleep -Milliseconds 100
    }
} finally {
    Stop-Job -Job $job -ErrorAction SilentlyContinue
    Remove-Job -Job $job -ErrorAction SilentlyContinue
    Write-Host ""
    Write-Host "Capture stopped." -ForegroundColor Yellow
}

