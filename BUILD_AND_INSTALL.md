# QuickTeam — Build & Install Guide (v1.1.0)

Everything is prepared for the **1.1.0** release. Version has been bumped in `app.json`
and `package.json`; build numbers (`versionCode` / `buildNumber`) are managed remotely by
EAS and auto-increment on every production build (`eas.json` → `appVersionSource: "remote"`,
`production.autoIncrement: true`).

You are logged in to EAS as **blank037** (Apple team: *BlankTrading UG* — `9U85F8KUSS`).

There are **three** builds to make. Run them from the project root (`C:\git\QuickTeamMobile`).

---

## 1. Android — Google Play (production, `.aab`)

```powershell
eas build --platform android --profile production
```

- Produces an **Android App Bundle (.aab)** for the Play Store.
- First run will ask to generate/store an Android Keystore — let EAS manage it (say yes).
- Submit to Play afterwards with:
  ```powershell
  eas submit --platform android --profile production
  ```
  (uses `./play-service-account.json`, internal track — see `eas.json`).

## 2. Apple — App Store (production)

```powershell
eas build --platform ios --profile production
```

- Produces a store-ready `.ipa`.
- EAS will handle the Distribution certificate & App Store provisioning profile
  (log in with your Apple ID `leo.solomon@web.de` when prompted).
- Submit to App Store Connect afterwards with:
  ```powershell
  eas submit --platform ios --profile production
  ```

## 3. iPhone — build you can install on your own phone (`preview`, internal)

This is a standalone ad-hoc build (no Metro/laptop needed once installed). It requires
your iPhone to be **registered** first — right now **no devices are registered** on the team.

**Step A — register your iPhone (one-time):**

```powershell
eas device:create
```

Choose *Website / URL*: EAS gives you a link/QR code. Open it **on the iPhone**, install
the profile (Settings → General → VPN & Device Management → install), and the phone's UDID
is added to the team. Verify with:

```powershell
eas device:list --apple-team-id 9U85F8KUSS
```

**Step B — build for the device:**

```powershell
eas build --platform ios --profile preview
```

- `preview` = internal distribution → produces an ad-hoc `.ipa` signed for your
  registered device(s).
- When it finishes, EAS prints a URL / QR code.

**Step C — install on the iPhone:**

- Open that URL (or scan the QR) **on the iPhone** in Safari and tap **Install**.
- The app appears on your home screen. First launch: if iOS shows "Untrusted Developer",
  go to Settings → General → VPN & Device Management → trust *BlankTrading UG*.

> Tip: if you register the iPhone (Step A) **before** the App Store production build too,
> nothing changes for the store build — device registration only affects ad-hoc/preview builds.

---

## Order to run them

1. `eas device:create` (register the iPhone) — do this first so build #3 can sign for it.
2. `eas build --platform ios --profile preview`   ← the one for your iPhone
3. `eas build --platform ios --profile production` ← App Store
4. `eas build --platform android --profile production` ← Play Store

You can also queue all builds and walk away — each prints a progress URL you can watch in
the browser, and finished artifacts appear on your Expo project's **Builds** page.

## Notes

- **Nothing is built yet** — the commands above are ready to run when you are.
- iOS builds #2 and #3 use the **same** bundle identifier (`com.blank037.QuickTeamMobile`);
  that's fine — different distribution methods, same app.
- If a build asks about credentials interactively, the safe default is to let **EAS manage**
  them.
