@echo off
echo ========================================
echo Move Project to Shorter Path
echo ========================================
echo.
echo This will move your project from:
echo C:\Users\Prashin\Desktop\PROJECTS\biznes\business-app
echo.
echo To:
echo C:\dev\biz
echo.
echo Press Ctrl+C to cancel, or
pause
echo.

echo Creating C:\dev directory...
if not exist "C:\dev" mkdir "C:\dev"

echo.
echo Moving project files...
echo This may take a few minutes...
echo.

xcopy /E /I /H /Y "C:\Users\Prashin\Desktop\PROJECTS\biznes\business-app" "C:\dev\biz"

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo SUCCESS! Project moved to C:\dev\biz
    echo ========================================
    echo.
    echo Next steps:
    echo 1. Close this terminal
    echo 2. Open a new terminal
    echo 3. Run: cd C:\dev\biz
    echo 4. Run: npm install
    echo 5. Run: npm run android:bundle
    echo.
) else (
    echo.
    echo ERROR: Failed to copy files
    echo.
)
pause

