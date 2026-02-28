#!/bin/bash

# Zyro-Checker Launcher (Linux/macOS)

echo "Starting Zyro-Checker..."

# Check if node is installed
if ! command -v node &> /dev/null
then
    echo "Error: Node.js could not be found. Please install it to run this application."
    exit
fi

# Run the application
node server.js

