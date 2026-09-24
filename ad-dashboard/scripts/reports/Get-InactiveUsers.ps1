param(
    [Parameter(Mandatory=$false)]
    [int]$DaysInactive = 90,

    [Parameter(Mandatory=$false)]
    [string]$SearchBase = ""
)

$ErrorActionPreference = 'Stop'

$cutoff = (Get-Date).AddDays(-$DaysInactive)

$params = @{
    Filter     = { LastLogonDate -lt $cutoff -and Enabled -eq $true }
    Properties = 'LastLogonDate','Department','Manager','EmailAddress'
}
if ($SearchBase) { $params['SearchBase'] = $SearchBase }

$users = Get-ADUser @params

$results = $users | ForEach-Object {
    [PSCustomObject]@{
        Username    = $_.SamAccountName
        DisplayName = $_.DisplayName
        Department  = $_.Department
        Email       = $_.EmailAddress
        LastLogon   = $_.LastLogonDate
        DaysInactive= if ($_.LastLogonDate) { [int]((Get-Date) - $_.LastLogonDate).TotalDays } else { 'Never' }
    }
}

Write-Output "Found $($results.Count) inactive users (threshold: $DaysInactive days)"
$results | ConvertTo-Json -Depth 3
