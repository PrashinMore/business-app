@echo off
echo ========================================
echo Generate Release Keystore
echo ========================================
echo.
echo This will generate a release keystore for signing your Android app.
echo.
echo IMPORTANT: Keep this keystore safe! You'll need it for all future updates.
echo.
echo Press Ctrl+C to cancel, or
pause
echo.

cd android\app

echo Generating release keystore...
echo.
keytool -genkeypair -v -storetype PKCS12 -keystore release.keystore -alias release-key -keyalg RSA -keysize 2048 -validity 10000 -storepass release123 -keypass release123 -dname "CN=Business App, OU=Development, O=Business, L=City, ST=State, C=US"

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo SUCCESS! Keystore generated
    echo ========================================
    echo.
    echo Keystore: android\app\release.keystore
    echo Alias: release-key
    echo Store Password: release123
    echo Key Password: release123
    echo.
    echo IMPORTANT: 
    echo 1. Change these passwords for production!
    echo 2. Backup this keystore file safely
    echo 3. Update keystore.properties with your passwords
    echo.
) else (
    echo.
    echo ERROR: Failed to generate keystore
    echo Make sure Java JDK is installed and keytool is in PATH
    echo.
)

cd ..\..

pause

