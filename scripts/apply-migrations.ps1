# ============================================================
# Hub Supabase Migration Script
# ============================================================
# This script applies database migrations to your Supabase instance.
#
# Usage:
#   .\apply-migrations.ps1                    # Apply all migrations
#   .\apply-migrations.ps1 -Migration "003"   # Apply specific migration
#   .\apply-migrations.ps1 -DryRun            # Show SQL without executing
#
# Prerequisites:
#   1. Set environment variables in .env.local or export them:
#      - SUPABASE_PROJECT_REF (your project reference)
#      - SUPABASE_DB_PASSWORD (your database password)
#   OR
#   2. Use Supabase CLI with `supabase link`
# ============================================================

param(
    [string]$Migration = "",
    [switch]$DryRun = $false,
    [switch]$UseSupabaseCLI = $false,
    [string]$EnvFile = "..\apps\web\.env.local"
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Success { param($Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Info { param($Message) Write-Host "ℹ️  $Message" -ForegroundColor Cyan }
function Write-Warning { param($Message) Write-Host "⚠️  $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "❌ $Message" -ForegroundColor Red }

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$MigrationsDir = Join-Path $ProjectRoot "supabase\migrations"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║          Hub Supabase Migration Tool                      ║" -ForegroundColor Magenta
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""

# Check if migrations directory exists
if (-not (Test-Path $MigrationsDir)) {
    Write-Error "Migrations directory not found: $MigrationsDir"
    exit 1
}

# Get migration files
if ($Migration) {
    $MigrationFiles = Get-ChildItem -Path $MigrationsDir -Filter "*$Migration*.sql" | Sort-Object Name
    if ($MigrationFiles.Count -eq 0) {
        Write-Error "No migration file found matching: $Migration"
        exit 1
    }
} else {
    $MigrationFiles = Get-ChildItem -Path $MigrationsDir -Filter "*.sql" | Sort-Object Name
}

Write-Info "Found $($MigrationFiles.Count) migration file(s):"
foreach ($file in $MigrationFiles) {
    Write-Host "   - $($file.Name)" -ForegroundColor Gray
}
Write-Host ""

# Method 1: Using Supabase CLI
if ($UseSupabaseCLI) {
    Write-Info "Using Supabase CLI method..."

    # Check if Supabase CLI is installed
    $supabaseCmd = Get-Command supabase -ErrorAction SilentlyContinue
    if (-not $supabaseCmd) {
        Write-Error "Supabase CLI not found. Install it with: npm install -g supabase"
        Write-Host ""
        Write-Host "Alternative: Run without -UseSupabaseCLI to use direct SQL method"
        exit 1
    }

    # Check if project is linked
    $supabaseDir = Join-Path $ProjectRoot ".supabase"
    if (-not (Test-Path $supabaseDir)) {
        Write-Warning "Project not linked to Supabase. Running 'supabase link'..."
        Push-Location $ProjectRoot
        supabase link
        Pop-Location
    }

    if ($DryRun) {
        Write-Warning "DRY RUN - Would execute the following migrations:"
        foreach ($file in $MigrationFiles) {
            Write-Host ""
            Write-Host "=== $($file.Name) ===" -ForegroundColor Yellow
            Get-Content $file.FullName | Select-Object -First 50
            Write-Host "..." -ForegroundColor Gray
        }
    } else {
        Write-Info "Pushing migrations to Supabase..."
        Push-Location $ProjectRoot
        supabase db push
        Pop-Location
        Write-Success "Migrations applied successfully!"
    }

    exit 0
}

# Method 2: Direct SQL execution via Supabase REST API / psql
Write-Info "Using direct SQL method..."

# Load environment variables from .env.local
$EnvFilePath = Join-Path $ProjectRoot $EnvFile
if (Test-Path $EnvFilePath) {
    Write-Info "Loading environment from: $EnvFile"
    Get-Content $EnvFilePath | ForEach-Object {
        if ($_ -match "^\s*([^#][^=]+)=(.*)$") {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim().Trim('"').Trim("'")
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
} else {
    Write-Warning "Environment file not found: $EnvFilePath"
}

# Get required environment variables
$SupabaseUrl = $env:NEXT_PUBLIC_SUPABASE_URL
$SupabaseServiceKey = $env:SUPABASE_SERVICE_ROLE_KEY
$SupabaseProjectRef = $env:SUPABASE_PROJECT_REF
$SupabaseDbPassword = $env:SUPABASE_DB_PASSWORD

# Validate configuration
if (-not $SupabaseUrl -or -not $SupabaseServiceKey) {
    Write-Error "Missing required environment variables!"
    Write-Host ""
    Write-Host "Please set the following in your .env.local file:" -ForegroundColor Yellow
    Write-Host "  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co"
    Write-Host "  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key"
    Write-Host ""
    Write-Host "Optional (for psql method):"
    Write-Host "  SUPABASE_PROJECT_REF=your-project-ref"
    Write-Host "  SUPABASE_DB_PASSWORD=your-db-password"
    Write-Host ""
    exit 1
}

# Extract project ref from URL if not set
if (-not $SupabaseProjectRef -and $SupabaseUrl -match "https://([^.]+)\.supabase\.co") {
    $SupabaseProjectRef = $matches[1]
    Write-Info "Extracted project ref: $SupabaseProjectRef"
}

# Try psql method first (preferred for migrations)
$psqlCmd = Get-Command psql -ErrorAction SilentlyContinue
if ($psqlCmd -and $SupabaseDbPassword) {
    Write-Info "Using psql method (recommended for migrations)..."

    $DbHost = "db.$SupabaseProjectRef.supabase.co"
    $DbPort = "5432"
    $DbName = "postgres"
    $DbUser = "postgres"

    $env:PGPASSWORD = $SupabaseDbPassword

    foreach ($file in $MigrationFiles) {
        Write-Host ""
        Write-Host "Applying: $($file.Name)" -ForegroundColor Cyan

        if ($DryRun) {
            Write-Warning "DRY RUN - Would execute:"
            Get-Content $file.FullName | Select-Object -First 30
            Write-Host "..." -ForegroundColor Gray
        } else {
            try {
                $result = psql -h $DbHost -p $DbPort -d $DbName -U $DbUser -f $file.FullName 2>&1
                if ($LASTEXITCODE -ne 0) {
                    Write-Error "Failed to apply migration: $($file.Name)"
                    Write-Host $result -ForegroundColor Red
                    exit 1
                }
                Write-Success "Applied: $($file.Name)"
            } catch {
                Write-Error "Error executing migration: $_"
                exit 1
            }
        }
    }

    $env:PGPASSWORD = ""
    Write-Host ""
    Write-Success "All migrations applied successfully!"
    exit 0
}

# Fallback: Output SQL for manual execution
Write-Warning "psql not available or DB password not set."
Write-Host ""
Write-Host "Please run the following SQL in Supabase SQL Editor:" -ForegroundColor Yellow
Write-Host "https://supabase.com/dashboard/project/$SupabaseProjectRef/sql" -ForegroundColor Cyan
Write-Host ""

# Generate combined SQL output
$OutputFile = Join-Path $ProjectRoot "supabase\combined_migration.sql"
$CombinedSql = ""

foreach ($file in $MigrationFiles) {
    $CombinedSql += "-- ============================================================`n"
    $CombinedSql += "-- Migration: $($file.Name)`n"
    $CombinedSql += "-- ============================================================`n`n"
    $CombinedSql += Get-Content $file.FullName -Raw
    $CombinedSql += "`n`n"
}

# Write combined SQL to file
$CombinedSql | Out-File -FilePath $OutputFile -Encoding UTF8

Write-Success "Combined SQL saved to: $OutputFile"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/$SupabaseProjectRef/sql" -ForegroundColor Gray
Write-Host "2. Copy the contents of: $OutputFile" -ForegroundColor Gray
Write-Host "3. Paste and execute in SQL Editor" -ForegroundColor Gray
Write-Host ""

# Also try to copy to clipboard
try {
    $CombinedSql | Set-Clipboard
    Write-Success "SQL content copied to clipboard!"
} catch {
    Write-Warning "Could not copy to clipboard. Please copy manually from the file."
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""
