# AD Command Center — Deployment Guide

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Windows Server | 2019 / 2022 | The app server (not a DC) |
| Node.js | 20 LTS | Install via winget or nodejs.org |
| PowerShell | 7+ (pwsh) | Install via winget |
| IIS | Built-in | Enable via Server Manager |
| IIS URL Rewrite | 2.x | Free from iis.net |
| IIS ARR | 3.x | Free from iis.net |
| RSAT-AD-PowerShell | Built-in | `Add-WindowsCapability -Online -Name Rsat.ActiveDirectory.DS-LDS.Tools~~~~0.0.1.0` |

---

## 1. Create folder structure

```powershell
New-Item -ItemType Directory -Force -Path D:\ADScripts\user-mgmt
New-Item -ItemType Directory -Force -Path D:\ADScripts\password-unlock
New-Item -ItemType Directory -Force -Path D:\ADScripts\groups
New-Item -ItemType Directory -Force -Path D:\ADScripts\security
New-Item -ItemType Directory -Force -Path D:\ADScripts\reports
New-Item -ItemType Directory -Force -Path D:\ADScripts\compliance
New-Item -ItemType Directory -Force -Path D:\ADDashboard\data
New-Item -ItemType Directory -Force -Path D:\ADDashboard\logs
New-Item -ItemType Directory -Force -Path C:\inetpub\wwwroot\ad-dashboard
```

---

## 2. Create a dedicated service account

```powershell
# Create a low-privilege service account in AD
New-ADServiceAccount -Name svc-addashboard -RestrictToSingleComputer
# Grant WinRM access from this server to each DC
# The account must NOT be Domain Admin — grant only what scripts require
```

Set IIS Application Pool identity to `CORP\svc-addashboard`.

---

## 3. Deploy backend

```powershell
# Copy backend to server
xcopy /E /I .\ad-dashboard\backend D:\ADDashboard\backend

# Install dependencies
cd D:\ADDashboard\backend
npm install --production

# Create .env from template
Copy-Item .env.example .env
notepad .env   # Fill in ANTHROPIC_API_KEY and other values
```

### Run as Windows Service (NSSM)

```powershell
# Download NSSM (Non-Sucking Service Manager) from nssm.cc
nssm install ADDashboard "node" "D:\ADDashboard\backend\server.js"
nssm set ADDashboard AppDirectory "D:\ADDashboard\backend"
nssm set ADDashboard AppEnvironmentExtra "NODE_ENV=production"
nssm set ADDashboard ObjectName "CORP\svc-addashboard" "<password>"
nssm start ADDashboard
```

---

## 4. Build and deploy frontend

```powershell
cd .\ad-dashboard\frontend
npm install
npm run build

# Copy build output to IIS site root
xcopy /E /I .\build\* C:\inetpub\wwwroot\ad-dashboard\
Copy-Item ..\docs\IIS-web.config C:\inetpub\wwwroot\ad-dashboard\web.config
```

---

## 5. Configure IIS

1. Open IIS Manager
2. Create a new Site: `AD Dashboard`, path `C:\inetpub\wwwroot\ad-dashboard`
3. Set binding to HTTPS port 443, select your TLS certificate
4. In Authentication: **Enable** Windows Authentication, **Disable** Anonymous Authentication
5. Enable ARR proxy: Server node → Application Request Routing → Enable Proxy
6. Enable the `HTTP_X_IIS_LOGON_USER` server variable in URL Rewrite

---

## 6. Seed initial admin user

```powershell
# One-time: add the first IT Admin so they can log in and manage others
cd D:\ADDashboard\backend
node -e "
const {getDb} = require('./db/schema');
const db = getDb();
db.prepare('INSERT OR REPLACE INTO user_roles (username, role, granted_by) VALUES (?, ?, ?)').run('your.username', 'it-admin', 'bootstrap');
console.log('Done');
"
```

---

## 7. WinRM access to Domain Controllers

Run on each DC, or via GPO:

```powershell
# Allow WinRM from the app server
Enable-PSRemoting -Force
Set-Item WSMan:\localhost\Client\TrustedHosts -Value "APPSERVER01.corp.abg.com"
```

The service account `svc-addashboard` must be in the local `Remote Management Users` group on each DC.

---

## Security checklist

- [ ] `svc-addashboard` is NOT in Domain Admins
- [ ] IIS site only accessible on management VLAN or via VPN
- [ ] HTTPS with a valid internal CA certificate
- [ ] `D:\ADDashboard\.env` readable only by service account and Administrators
- [ ] `D:\ADScripts\` readable/writable by `svc-addashboard`, readable by scripts
- [ ] Firewall: TCP 3001 blocked from all external sources (IIS proxies it)
- [ ] `ANTHROPIC_API_KEY` stored in `.env` — only script text is ever sent to Claude API
