param($FilePath)
$lines = [System.IO.File]::ReadAllLines($FilePath)
$startIndex = 0
for ($i = 0; $i -lt $lines.Count; $i++) {
    if (-not [string]::IsNullOrWhiteSpace($lines[$i]) -and -not $lines[$i].TrimStart().StartsWith("#")) {
        # Check if the line is not part of a commented multiline block at the top if any? 
        # Actually for python, block comments are """...""". Wait, llm_service.py starts with """\nLLM Service. This script will NOT skip it because it doesn't start with #. That's actually perfect! The active code in llm_service.py starts with """. 
        $startIndex = $i
        break
    }
}
$newLines = $lines[$startIndex..($lines.Count-1)]
[System.IO.File]::WriteAllLines($FilePath, $newLines)
Write-Host "Cleaned up $FilePath starting at line $startIndex"
