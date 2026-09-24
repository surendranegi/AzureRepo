param(
    [Parameter(Mandatory=$true)]
    [string]$Username
)

$ErrorActionPreference = 'Stop'

$user = Get-ADUser -Identity $Username -Properties `
    DisplayName, EmailAddress, Department, Title, Manager,
    Enabled, LockedOut, PasswordExpired, PasswordLastSet,
    LastLogonDate, Created, MemberOf

if (-not $user) { throw "User '$Username' not found" }

$managerName = if ($user.Manager) { (Get-ADUser $user.Manager).DisplayName } else { $null }
$groups = ($user.MemberOf | ForEach-Object { (Get-ADGroup $_).Name }) -join ', '

[PSCustomObject]@{
    SamAccountName  = $user.SamAccountName
    DisplayName     = $user.DisplayName
    Email           = $user.EmailAddress
    Department      = $user.Department
    Title           = $user.Title
    Manager         = $managerName
    Enabled         = $user.Enabled
    LockedOut       = $user.LockedOut
    PasswordExpired = $user.PasswordExpired
    PasswordLastSet = $user.PasswordLastSet
    LastLogon       = $user.LastLogonDate
    Created         = $user.Created
    Groups          = $groups
} | ConvertTo-Json
