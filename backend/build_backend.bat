@echo off
setlocal
cd /d "%~dp0"

echo Installing PyInstaller...
python -m pip install pyinstaller
if errorlevel 1 exit /b %errorlevel%

echo Building standalone backend binary...
python -m PyInstaller pyinstaller.spec --clean --noconfirm
if errorlevel 1 exit /b %errorlevel%

set "DICTIONARY_DIR=dist\bookwalka-backend\_internal\unidic_lite\dicdir"
if not exist "%DICTIONARY_DIR%\mecabrc" goto :missing_dictionary
if not exist "%DICTIONARY_DIR%\sys.dic" goto :missing_dictionary
if not exist "%DICTIONARY_DIR%\matrix.bin" goto :missing_dictionary

echo Done! The output is inside backend\dist\bookwalka-backend
exit /b 0

:missing_dictionary
echo ERROR: The packaged unidic_lite dictionary is incomplete: %DICTIONARY_DIR% 1>&2
exit /b 1
