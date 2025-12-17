$source = "E:\ANA_BACKUP\ANA_SUPERIA_MEMOIRE"
$dest = "E:\ANA"

Write-Host "Comparaison de $source avec $dest..."
Write-Host ""

# Trouver les fichiers manquants
$sourceFiles = Get-ChildItem -Path $source -Recurse -File
$missingFiles = @()

foreach ($file in $sourceFiles) {
    $relativePath = $file.FullName.Substring($source.Length)
    $destPath = Join-Path $dest $relativePath

    if (-not (Test-Path $destPath)) {
        $missingFiles += $file
        Write-Host "MANQUANT: $relativePath"
    }
}

Write-Host ""
Write-Host "Total fichiers manquants: $($missingFiles.Count)"
Write-Host ""
Write-Host "Voulez-vous copier ces fichiers? (O/N)"
