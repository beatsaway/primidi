# Force push syncthis to https://github.com/beatsaway/primidi
$ErrorActionPreference = "Stop"
$root = "c:\Users\Owner\Desktop\haha\syncthis"
$log = Join-Path $root "push-log.txt"
Set-Location $root
"Started $(Get-Date)" | Out-File $log

if (-not (Test-Path .git)) {
    git init 2>&1 | Out-File $log -Append
}
git add -A 2>&1 | Out-File $log -Append
git status 2>&1 | Out-File $log -Append
git commit -m "Sync: index.html, README.md, primid_v1_06 through primid_v1_10" 2>&1 | Out-File $log -Append
try { git remote remove origin } catch {}
git remote add origin https://github.com/beatsaway/primidi.git 2>&1 | Out-File $log -Append
git branch -M main 2>&1 | Out-File $log -Append
git push -f origin main 2>&1 | Out-File $log -Append
"Done $(Get-Date)" | Out-File $log -Append
