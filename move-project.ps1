# Script to move project to shorter path
# Run: powershell -ExecutionPolicy Bypass -File move-project.ps1

$sourcePath = "C:\Users\Prashin\Desktop\PROJECTS\biznes\business-app"
$targetPath = "C:\dev\biz"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Moving Project to Shorter Path" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Source: $sourcePath" -ForegroundColor Yellow
Write-Host "Target: $targetPath" -ForegroundColor Yellow
Write-Host ""

# Check if source exists
if (-not (Test-Path $sourcePath)) {
    Write-Host "ERROR: Source path does not exist!" -ForegroundColor Red
    exit 1
}

# Check if target already exists
if (Test-Path $targetPath) {
    Write-Host "WARNING: Target path already exists!" -ForegroundColor Yellow
    $response = Read-Host "Do you want to delete it and continue? (yes/no)"
    if ($response -ne "yes") {
        Write-Host "Cancelled." -ForegroundColor Yellow
        exit 0
    }
    Remove-Item -Path $targetPath -Recurse -Force
}

# Create parent directory
$targetParent = Split-Path -Parent $targetPath
if (-not (Test-Path $targetParent)) {
    New-Item -ItemType Directory -Path $targetParent -Force | Out-Null
    Write-Host "Created directory: $targetParent" -ForegroundColor Green
}

Write-Host "Copying project files..." -ForegroundColor Cyan
Write-Host "This may take a few minutes..." -ForegroundColor Yellow
Write-Host ""

try {
    # Use robocopy for better performance and reliability
    $robocopyArgs = @(
        $sourcePath,
        $targetPath,
        "/E",           # Copy subdirectories including empty ones
        "/COPYALL",     # Copy all file information
        "/R:3",         # Retry 3 times on failure
        "/W:1",         # Wait 1 second between retries
        "/MT:8",        # Multi-threaded with 8 threads
        "/NFL",         # No file list
        "/NDL",         # No directory list
        "/NP"           # No progress
    )
    
    $result = & robocopy @robocopyArgs 2>&1
    $exitCode = $LASTEXITCODE
    
    # Robocopy returns 0-7 for success, 8+ for errors
    if ($exitCode -le 7) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "SUCCESS! Project copied to $targetPath" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Close this terminal" -ForegroundColor White
        Write-Host "2. Open a new terminal" -ForegroundColor White
        Write-Host "3. Run: cd C:\dev\biz" -ForegroundColor White
        Write-Host "4. Run: npm install" -ForegroundColor White
        Write-Host "5. Run: npm run android:bundle" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "ERROR: Copy failed with exit code $exitCode" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

