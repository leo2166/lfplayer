@echo off
setlocal EnableDelayedExpansion

:: This script normalizes audio files from a source directory to a destination directory using ffmpeg.
:: It uses a two-pass loudnorm filter for accurate results and converts output to MP3.

:: Usage: normalize_audio.bat "source_directory" "destination_directory"

if "%~1"=="" (
    echo Usage: %0 "source_directory" "destination_directory"
    goto :eof
)
if "%~2"=="" (
    echo Usage: %0 "source_directory" "destination_directory"
    goto :eof
)

set "SOURCE_DIR=%~1"
set "DEST_DIR=%~2"

if not exist "%SOURCE_DIR%\" (
    echo Source directory not found: "%SOURCE_DIR%"
    goto :eof
)

if not exist "%DEST_DIR%\" (
    echo Destination directory not found, creating it...
    mkdir "%DEST_DIR%"
)

echo Source: %SOURCE_DIR%
echo Destination: %DEST_DIR%
echo Normalizing...

:: Supported audio file extensions
set "EXTENSIONS=.mp3 .wav .flac .m4a .aac .ogg"

for %%X in (%EXTENSIONS%) do (
    for /r "%SOURCE_DIR%" %%F in (*%%X) do (
        echo.
        echo Processing file: "%%F"

        :: Create the destination path, keeping the subfolder structure and changing the extension to .mp3
        set "FULL_PATH=%%F"
        set "REL_PATH=!FULL_PATH:%SOURCE_DIR%\=നായ"
        set "DEST_FILE_PATH=%DEST_DIR%\!REL_PATH!"

        :: Create the specific subdirectory if it doesn't exist
        for %%P in ("!DEST_FILE_PATH!") do (
            if not exist "%%~dpP" (
                mkdir "%%~dpP"
            )
        )
        
        :: Two-pass normalization using loudnorm filter
        :: Pass 1: Analyze the audio and get stats
        ffmpeg -i "%%F" -vn -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2> pass1.log
        
        :: Extract measured stats from the log using findstr
        set "INPUT_I=" & set "INPUT_TP=" & set "INPUT_LRA=" & set "INPUT_THRESH="
        for /f "tokens=2 delims=:," %%V in ('findstr /c:"input_i" pass1.log') do set "INPUT_I=%%V"
        for /f "tokens=2 delims=:," %%V in ('findstr /c:"input_tp" pass1.log') do set "INPUT_TP=%%V"
        for /f "tokens=2 delims=:," %%V in ('findstr /c:"input_lra" pass1.log') do set "INPUT_LRA=%%V"
        for /f "tokens=2 delims=:," %%V in ('findstr /c:"input_thresh" pass1.log') do set "INPUT_THRESH=%%V"
        
        :: Check if stats were extracted
        if not defined INPUT_I (
            echo WARNING: Could not read normalization stats for "%%F". Skipping file.
        ) else (
            :: Pass 2: Apply the normalization using the measured stats
            echo Applying normalization...
            ffmpeg -i "%%F" -vn -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_i=!INPUT_I!:measured_tp=!INPUT_TP!:measured_lra=!INPUT_LRA!:measured_thresh=!INPUT_THRESH!" -ar 44100 -c:a libmp3lame -b:a 320k "%%~dpnF.mp3" -y

            echo Saved to: "%%~dpnF.mp3"
        )
    )
)

:: Cleanup
if exist pass1.log del pass1.log

echo.
echo Normalization complete.
endlocal