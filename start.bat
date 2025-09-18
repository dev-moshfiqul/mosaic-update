@echo off
echo 🚀 Starting Mystery Mosaic App...
echo.

echo 📦 Installing dependencies...
call npm install

echo.
echo 🔧 Starting simple server (no database required)...
echo 📱 Open your browser to: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.

call npm run start-simple
