# smartSofa — Agent Notes

## Secrets / Credentials

- **GitHub PAT** is stored in `github.txt` at the project root (gitignored).
  Use it for `git push`, GitHub API calls (e.g. downloading Actions artifacts),
  etc. Read it on demand — do not echo it back into chat or commit it.
  Example:
  ```bash
  TOKEN=$(cat github.txt)
  curl -H "Authorization: token $TOKEN" https://api.github.com/...
  ```

- **iOS code signing** materials live under `cert/`:
  - `cert.p12` (P12_PASSWORD=`kaidi`)
  - `SmartHome_Control_Provisioning_Profile.mobileprovision`
  - Team `AVAA63GHH3`, bundle id `com.smarthome.control`

## Repo

- Remote: `https://github.com/zqf2004111/smartSofa.git`, branch `main`.

## Build cheatsheet

- Web + Android debug APK:
  `npm run build && npx cap sync android && cd android && ./gradlew assembleDebug`
  → `android/app/build/outputs/apk/debug/app-debug.apk` (~7s incremental)
- iOS: triggered via GitHub Actions `.github/workflows/ios.yml` on push.
- Test devices online: Xiaomi `6c5ee48`, Samsung `R5CWC3WXRYZ`.

## Conventions

- User communicates in Chinese; reply concise Chinese + technical points.
- Do not run `git commit / push / reset / rebase` without explicit confirmation
  unless the user has just asked for it in the current turn.
