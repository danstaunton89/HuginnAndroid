@echo off
echo Downloading keystore from EAS...
echo.

cd C:\Repos\healthtracker\mobile

echo Please follow these steps:
echo.
echo 1. Run this command:
echo    eas credentials -p android
echo.
echo 2. Choose: "Keystore: Manage everything needed to build your project"
echo.
echo 3. Choose: "Download existing keystore"
echo.
echo 4. Save the keystore as "upload-keystore.jks" in the mobile folder
echo.
echo 5. Note down the keystore password, key alias, and key password
echo.
echo Press any key after downloading the keystore...
pause

echo.
echo Creating keystore configuration...

echo MYAPP_UPLOAD_STORE_FILE=upload-keystore.jks > android\keystore.properties
echo MYAPP_UPLOAD_KEY_ALIAS=Enter_Your_Key_Alias_Here >> android\keystore.properties
echo MYAPP_UPLOAD_STORE_PASSWORD=Enter_Your_Store_Password_Here >> android\keystore.properties
echo MYAPP_UPLOAD_KEY_PASSWORD=Enter_Your_Key_Password_Here >> android\keystore.properties

echo.
echo Now edit android\keystore.properties with your keystore details
echo Then run build-release-signed.bat
pause