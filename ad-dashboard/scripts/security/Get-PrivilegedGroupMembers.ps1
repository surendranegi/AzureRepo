param(
    [Parameter(Mandatory=$false)]
    [string]$GroupName = "Domain Admins"
)

$ErrorActionPreference = 'Stop'

$privilegedGroups = @(
    'Domain Admins', 'Enterprise Admins', 'Schema Admins',
    'Administrators', 'Account Operators', 'Backup Operators'
)

$targetGroups = if ($GroupName -eq 'ALL') { $privilegedGroups } else { @($GroupName) }

$results = foreach ($grp in $targetGroups) {
    try {
        $members = Get-ADGroupMember -Identity $grp -Recursive | Where-Object { $_.objectClass -eq 'user' }
        foreach ($m in $members) {
            $u = Get-ADUser $m -Properties LastLogonDate, Enabled, PasswordLastSet
            [PSCustomObject]@{
                Group           = $grp
                Username        = $u.SamAccountName
                DisplayName     = $u.DisplayName
                Enabled         = $u.Enabled
                LastLogon       = $u.LastLogonDate
                PasswordLastSet = $u.PasswordLastSet
            }
        }
    }
    catch {
        Write-Warning "Could not query group '$grp': $_"
    }
}

$results | ConvertTo-Json -Depth 3
