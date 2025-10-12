# oac_backend
Backend service for the OAC project

## Required Ubuntu libraries
### XSLT
```console
sudo apt install xsltproc
```

## ENV variables
Env variables overwrites parameters from the config file

### Database

#### OAC_DB_USER
Username for the OAC datbase

#### OAC_DB_PASSWORD
Password for the OAC datbase

### SMTP

#### OAC_SMTP_HOST
Host for the SMTP

#### OAC_SMTP_PORT
Port for the SMTP

#### OAC_SMTP_USER
Username for the SMTP

#### OAC_SMTP_PASSWORD
Password for the SMTP

### EXPOSED 

#### OAC_EXPOSED_PROTOCOL
Protocol exposed externally

#### OAC_EXPOSED_HOST
Host exposed externally

#### OAC_EXPOSED_PORT
Port exposed externally