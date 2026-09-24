param(
    [Parameter(Mandatory=$true)]
    [string]$Username,

    [Parameter(Mandatory=$true)]
    [string]$NewPassword,

    [Parameter(Mandatory=$false)]
    [switch]$MustChangeAtNextLogon = $true
)

$ErrorActionPreference = 'Stop'

try {
    $user = Get-ADUser -Identity $Username -Properties PasswordLastSet, Enabled, LockedOut
    if (-not $user) { throw "User '$Username' not found" }

    $securePass = ConvertTo-SecureString $NewPassword -AsPlainText -Force
    Set-ADAccountPassword -Identity $Username -NewPassword $securePass -Reset

    if ($MustChangeAtNextLogon) {
        Set-ADUser -Identity $Username -ChangePasswordAtLogon $true
    }

    Unlock-ADAccount -Identity $Username

    [PSCustomObject]@{
        Username        = $user.SamAccountName
        DisplayName     = $user.DisplayName
        PasswordReset   = $true
        AccountUnlocked = $true
        MustChange      = [bool]$MustChangeAtNextLogon
        Timestamp       = (Get-Date).ToString('o')
    } | ConvertTo-Json
}
catch {
    Write-Error $_.Exception.Message
    exit 1
}
