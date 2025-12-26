# Phase 3: Commercial Capabilities - Licensing System

**Goal**: Transform BioViz-Local into a commercial product by implementing a robust licensing system to manage access and feature gating.

## User Review Required
> [!IMPORTANT]
> **License Key Strategy**: I propose using **RSA-2048 Signed Keys** (JWT-like format) for offline validation.
> *   **Format**: `LICENSE_KEY_STRING` (Base64 encoded JSON with signature).
> *   **Validation**: The app will have the **Public Key** embedded. It verifies the signature of the license key offline.
> *   **Binding**: Keys will be bound to a unique **Machine ID** to prevent sharing.

> [!WARNING]
> **Implementation Scope**: This plan covers the **Client-Side Validation** only. A separate "License Generator" script (for you, the admin) is needed to issue keys, which I will provide as a Python script.

## Proposed Changes

### 1. Licensing Logic (Frontend)
#### [NEW] [src/utils/licenseManager.ts]
*   **`LicenseManager` Class**:
    *   `validateLicense(key: string): Promise<LicenseResult>`
    *   `getMachineId(): Promise<string>` (Uses `@tauri-apps/plugin-os` or fallback).
    *   `saveLicense(key: string)` / `loadLicense()`
    *   **Public Key**: Hardcoded here (for verification).

#### [MODIFY] [src/App.tsx](file:///Users/haifeng/BioViz-Local/src/App.tsx)
*   **State**: Add `isPro` state (loaded from `LicenseManager` on startup).
*   **UI**: Replace hardcoded `isPro = true` with dynamic check.
*   **License Modal**: Add a "Register Product" modal in the Help menu or popup on startup if trial expired.

#### [NEW] [src/components/LicenseModal.tsx]
*   Input field for License Key.
*   Display Machine ID (for user to copy and send to you).
*   "Activate" button.

### 2. Feature Gating
#### [MODIFY] [src/components/ProFeature.tsx] (Create/Refactor)
*   Wrapper component `<ProFeature>` that disables/hides children if `!isPro`.
*   Show "Upgrade to Pro" tooltip/overlay.

#### [MODIFY] [src/utils/sessionExport.ts]
*   Gate "Interactive HTML Export" behind Pro license.

### 3. Admin Tools (Backend/Script)
#### [NEW] [scripts/generate_keys.py]
*   Generates a Private/Public RSA key pair.
*   **Private Key**: Keep safe (for you to sign licenses).
*   **Public Key**: To be pasted into `licenseManager.ts`.

#### [NEW] [scripts/issue_license.py]
*   Input: `User Name`, `Machine ID`, `Expiry Date`.
*   Output: Signed License Key string.

## Verification Plan
### Automated Tests
*   Run unit tests on `validateLicense` with valid and invalid keys.

### Manual Verification
1.  **Trial Mode**: Verify app starts in "Free/Trial" mode (restricted features).
2.  **Activation**:
    *   Generate a key using `issue_license.py`.
    *   Enter key in app.
    *   Verify successful activation and `isPro` status.
3.  **Machine ID Check**: Attempt to use the same key on a "different" machine ID (mocked) -> Should fail.
