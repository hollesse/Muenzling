# Deployment

Münzling wird über ZimaDeploy/Doco-CD auf dem Heimserver deployt. Push auf `main` baut das
Image `ghcr.io/hollesse/muenzling:main` (Workflow `.github/workflows/build.yml`), Doco-CD
rollt es aus.

- Tailnet: https://muenzling.jtoepfer.de
- Heimnetz ohne Tailscale: https://muenzling.lan.jtoepfer.de

Statische PWA (nginx), keine Secrets, keine Datenvolumes. Alle Daten liegen im Browser.
Rollback: Image-Tag in `compose.yaml` auf `sha-<commit>` pinnen.
