import { KJUR } from 'jsrsasign';

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuQq56oDG+S9EM3+W2JTi
YjYGLQVUGJvXCuomu0kbAs2sqsd3QkuOsv0mgNoa1DBjeaf9JbPOk1ZwGBuIK5JC
dakOX4GeMpYe3JnFvR3fN2Eyp4wvrCbBLycAYvNz1LUDOb1MkTAEOaffhAnXXeQu
X1FDoev9zpVfKYXPQS5v3iZzVQ1gfuOWVu/pAx3khK1BeoraF1dC6W+CEQvwgH4q
B/Y+BDBImrNTgxNK/cKuclZNTTPSq+vBU2RvjM5P2pBwUwAwn6aUSwPEwo3Z9C6o
R0+6bjXLRNwAozDcb0klYacyi3CsaZFuMRXZdNOBBsymeUxQsAzgEQs3Y+TJcTZN
qwIDAQAB
-----END PUBLIC KEY-----`;

export interface LicenseData {
    name: string;
    email: string;
    machineId?: string;
    expiry: string;
    issued: string;
    type: string;
}

export interface LicenseResult {
    valid: boolean;
    error?: string;
    data?: LicenseData;
}

export class LicenseManager {
    private static STORAGE_KEY = 'bioviz_license_key';
    private static MACHINE_ID_KEY = 'bioviz_machine_id';

    // Get or create a persistent Machine ID (UUID v4-like)
    static getMachineId(): string {
        let id = localStorage.getItem(this.MACHINE_ID_KEY);
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem(this.MACHINE_ID_KEY, id);
        }
        return id;
    }

    static saveLicense(key: string) {
        localStorage.setItem(this.STORAGE_KEY, key);
    }

    static loadLicense(): string | null {
        return localStorage.getItem(this.STORAGE_KEY);
    }

    static async validateLicense(licenseKey: string): Promise<LicenseResult> {
        try {
            // 1. Decode Base64
            const jsonStr = atob(licenseKey);
            const payload = JSON.parse(jsonStr);

            if (!payload.data || !payload.signature) {
                return { valid: false, error: 'Invalid license format.' };
            }

            // Helper: Convert Base64 to Hex for jsrsasign
            const base64ToHex = (str: string) => {
                const raw = atob(str);
                let result = '';
                for (let i = 0; i < raw.length; i++) {
                    const hex = raw.charCodeAt(i).toString(16);
                    result += (hex.length === 2 ? hex : '0' + hex);
                }
                return result;
            };

            // 3. Verify Signature
            const sig = new KJUR.crypto.Signature({ alg: "SHA256withRSA" });
            sig.init(PUBLIC_KEY);

            // Reconstruct the exact string that was signed (Python json.dumps defaults)
            const pythonDump = (obj: any): string => {
                const keys = Object.keys(obj).sort();
                const parts = keys.map(k => {
                    let val = obj[k];
                    if (val === null) val = 'null';
                    else if (typeof val === 'string') val = `"${val}"`;
                    // Note: Boolean/Numbers would need handling if added later
                    return `"${k}": ${val}`;
                });
                return `{${parts.join(', ')}}`;
            };

            const dataStringToVerify = pythonDump(payload.data);

            // Debug logging
            console.log('[License] Verifying string:', dataStringToVerify);

            sig.updateString(dataStringToVerify);

            // jsrsasign verify expects HEX signature, but we have Base64
            const signatureHex = base64ToHex(payload.signature);
            const isValid = sig.verify(signatureHex);

            if (!isValid) {
                console.warn('[License] Signature verification failed.');
                return { valid: false, error: 'Signature verification failed.' };
            }

            // 3. Check Expiry
            const expiryDate = new Date(payload.data.expiry);
            if (new Date() > expiryDate) {
                return { valid: false, error: 'License expired.', data: payload.data };
            }

            // 4. Check Machine ID (if present)
            const currentMachineId = this.getMachineId();
            if (payload.data.machineId && payload.data.machineId !== currentMachineId) {
                return { valid: false, error: 'License locked to another machine.', data: payload.data };
            }

            return { valid: true, data: payload.data };

        } catch (e) {
            console.error(e);
            return { valid: false, error: 'Malformed license key.' };
        }
    }
}
