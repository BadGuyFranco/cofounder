# Visual C++ Build Tools (Windows Only)

Required on Windows before installing PyTorch, torchaudio, and other compiled Python packages.

## Check If Installed

This is difficult to detect programmatically. If the user has never installed Visual Studio or Visual C++ Build Tools, assume it's not installed.

## Installation

Tell the user:

"Windows needs C++ libraries to run the transcriber. Here's how to install them:

1. Go to https://visualstudio.microsoft.com/visual-cpp-build-tools/
2. Click Download Build Tools
3. Run the installer
4. Select 'Desktop development with C++' and click Install
5. When installation completes, restart your PC
6. Come back here and type 'continue'

This is a one-time setup; you won't need to do it again."

STOP and wait for the user to type "continue" before proceeding.

## After Restart

Once the user returns and types "continue", proceed with the original task (e.g., installing Transcriber packages).
