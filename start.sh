#!/bin/bash

echo "🚀 Starting Mystery Mosaic App..."
echo

echo "📦 Installing dependencies..."
npm install

echo
echo "🔧 Starting simple server (no database required)..."
echo "📱 Open your browser to: http://localhost:3000"
echo
echo "Press Ctrl+C to stop the server"
echo

npm run start-simple
