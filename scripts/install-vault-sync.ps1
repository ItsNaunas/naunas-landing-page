# Schedules scripts/vault-sync.mjs twice a day (08:30 and 17:30 laptop time) so Ask Naunas knows the vault.
# Run once:  powershell -ExecutionPolicy Bypass -File scripts\install-vault-sync.ps1
# Remove:    Unregister-ScheduledTask -TaskName "Naunas vault sync AM","Naunas vault sync PM" -Confirm:$false

$node = (Get-Command node).Source
$script = Join-Path $PSScriptRoot 'vault-sync.mjs'
$logDir = Join-Path $env:LOCALAPPDATA 'naunas'
New-Item -ItemType Directory -Force $logDir | Out-Null
$arg = "/c `"`"$node`" `"$script`" >> `"$logDir\vault-sync.log`" 2>&1`""
$action = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument $arg
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 5)
foreach ($t in @(@{ n = 'Naunas vault sync AM'; at = '08:30' }, @{ n = 'Naunas vault sync PM'; at = '17:30' })) {
  Register-ScheduledTask -TaskName $t.n -Action $action -Trigger (New-ScheduledTaskTrigger -Daily -At $t.at) -Settings $settings `
    -Description 'Sends the vault summary to Ask Naunas (scripts/vault-sync.mjs)' -Force | Out-Null
}
Get-ScheduledTask -TaskName 'Naunas vault sync*' | Select-Object TaskName, State
Write-Host "Running it once now..."
& $node $script
