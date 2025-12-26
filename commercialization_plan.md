# Commercialization Roadmap: BioViz-Local v2.0 -> Commercial Product

This document outlines the necessary steps to transition `BioViz-Local` from a functional prototype to a sellable commercial software product.

## Positioning (Research Users)
**Core statement**: A reproducible result-expression tool for researchers that compresses the path from data to publication-ready figures, methods, and citations.

## 1. Licensing & Entitlement System (Critical) 🔑
**Current Status**: Hardcoded `const isPro = true;` in `src/App.tsx`.
**Gap**: No way to restrict access to paid users, manage trials, or prevent piracy.

### Action Items:
- [ ] **Design License Key Format**: Use RSA-signed keys (offline capable) or a simple online verification API.
- [ ] **Implement Validation Logic**:
    - Build a `LicenseManager` class in TypeScript (frontend) or Python (backend).
    - Bind license to **Machine ID** (e.g., `tauri-plugin-os` to get serial/UUID) to prevent sharing.
- [ ] **Feature Gating**:
    - Wrap pro features (e.g., "AI Synthesis", "Batch Analysis", "Export PPT") in a `<ProFeature>` component.
    - Implement "Trial Mode" (expired after 7 days or 10 uses).

## 2. Security & Integrity 🛡️
**Current Status**: Code is open; Python sidecar is somewhat exposed (pending Cython/PyInstaller hardening).
**Gap**: Easy to crack or repackage. macOS will reject unsigned apps.

### Action Items:
- [ ] **Code Signing & Notarization**:
    - **macOS**: Register Apple Developer ID ($99/yr), configure `codesign` and `notarize` in GitHub Actions.
    - **Windows**: Purchase EV Code Signing Certificate (expensive but necessary to avoid "Unknown Publisher" warnings).
- [ ] **Code Obfuscation**:
    - **Frontend**: Add `javascript-obfuscator` to Vite build pipeline.
    - **Backend**: Ensure Python is compiled to binary (PyInstaller) and potentially use Cython for sensitive algorithms (`.pyx`).

## 3. Update & Distribution Infrastructure 🔄
**Current Status**: Updates require manual download and reinstall.
**Gap**: Users won't update, missing critical bug fixes or new AI prompts.

### Action Items:
- [ ] **Configure Tauri Updater**:
    - Set up a static file host (S3 / GitHub Releases / Cloudflare R2) for update blobs.
    - Generate public/private keys for Tauri update signing.
- [ ] **CI/CD Pipeline**:
    - Update GitHub Actions to automatically build, sign, and publish update endpoints on tag push.

## 4. Legal & Compliance ⚖️
**Current Status**: Minimal `DisclaimerBanner`.
**Gap**: Legal liability for medical advice; Open source license violations.

### Action Items:
- [ ] **EULA (End User License Agreement)**: Force user to accept on first launch ("Not for clinical diagnosis").
- [ ] **Third-Party Attribution**: Generate a "Credits" page listing all npm/pip packages and their licenses (MIT, Apache, etc.).
- [ ] **Privacy Policy**: Explicitly state that "Local" means local, but AI features send data to OpenAI/DeepSeek (if applicable).

## 5. Support & Analytics 📊
**Current Status**: Blind execution.
**Gap**: Impossible to debug user issues remotely.

### Action Items:
- [ ] **Crash Reporting**: Integrate **Sentry** (for both Rust/Tauri and React) to catch crashes.
- [ ] **Feedback Loop**: Add a simple "Send Feedback / Bug Report" form in the app (with log attachment).

## 6. Branding & Onboarding 🚀
### Action Items:
- [ ] **Onboarding Tour**: Create a "First Run" guided tour using `react-joyride`.
- [ ] **Help Center**: Link to online documentation or bundle `UserGuide.pdf`.

---

## Recommended Immediate Priority (Next Sprint)
1.  **License System**: Implement simple offline-capable key validation.
2.  **Code Signing (macOS)**: Ensure the app runs without "Damaged" warnings.
