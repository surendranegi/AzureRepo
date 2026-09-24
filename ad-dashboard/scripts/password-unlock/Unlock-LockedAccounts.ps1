param(
    [Parameter(Mandatory=$false)]
    [string]$SearchBase = ""
)

$ErrorActionPreference = 'Stop'

$params = @{ Filter = { LockedOut -eq $true }; Properties = 'LockedOut','LastBadPasswordAttempt','DisplayName','Department' }
if ($SearchBase) { $params['SearchBase'] = $SearchBase }

$locked = Get-ADUser @params

if ($locked.Count -eq 0) {
    Write-Output "No locked accounts found."
    exit 0
}

$results = foreach ($u in $locked) {
    Unlock-ADAccount -Identity $u.SamAccountName
    [PSCustomObject]@{
        Username              = $u.SamAccountName
        DisplayName           = $u.DisplayName
        Department            = $u.Department
        LastBadPasswordAttempt= $u.LastBadPasswordAttempt
        Unlocked              = $true
    }
}

$results | ConvertTo-Json -Depth 3
