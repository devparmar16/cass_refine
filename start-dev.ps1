# IEEE CASS Development Environment Starter
Write-Host "🚀 Starting IEEE CASS Development Environment..." -ForegroundColor Green
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Check if npm is available
try {
    $npmVersion = npm --version
    Write-Host "✅ npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm is not available" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Starting server and client together..." -ForegroundColor Yellow
Write-Host "Server will run on: http://localhost:5001" -ForegroundColor Cyan
Write-Host "Client will run on: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""

# Start both server and client
npm run dev:full 