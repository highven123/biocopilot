import json
import base64
import datetime
import logging
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import serialization

logger = logging.getLogger("BioViz.Licensing")

# Matches the Public Key in src/utils/licenseManager.ts
PUBLIC_KEY_PEM = b"""-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuQq56oDG+S9EM3+W2JTi
YjYGLQVUGJvXCuomu0kbAs2sqsd3QkuOsv0mgNoa1DBjeaf9JbPOk1ZwGBuIK5JC
dakOX4GeMpYe3JnFvR3fN2Eyp4wvrCbBLycAYvNz1LUDOb1MkTAEOaffhAnXXeQu
X1FDoev9zpVfKYXPQS5v3iZzVQ1gfuOWVu/pAx3khK1BeoraF1dC6W+CEQvwgH4q
B/Y+BDBImrNTgxNK/cKuclZNTTPSq+vBU2RvjM5P2pBwUwAwn6aUSwPEwo3Z9C6o
R0+6bjXLRNwAozDcb0klYacyi3CsaZFuMRXZdNOBBsymeUxQsAzgEQs3Y+TJcTZN
qwIDAQAB
-----END PUBLIC KEY-----"""

class LicenseValidator:
    def __init__(self):
        try:
            self.public_key = serialization.load_pem_public_key(PUBLIC_KEY_PEM)
            self.is_pro = False
            self.license_data = None
        except Exception as e:
            logger.error(f"Failed to load public key: {e}")
            self.public_key = None

    def validate(self, license_key: str, machine_id: str = None) -> dict:
        """
        Validates the license key string.
        Returns: {"valid": bool, "error": str, "data": dict}
        """
        if not self.public_key:
            return {"valid": False, "error": "Internal Error: Missing Public Key"}

        try:
            # 1. Decode Envelope
            try:
                # Remove any whitespace
                license_key = license_key.strip()
                json_str = base64.b64decode(license_key).decode('utf-8')
                envelope = json.loads(json_str)
            except Exception:
                return {"valid": False, "error": "Invalid License Format (Base64/JSON)"}

            if "data" not in envelope or "signature" not in envelope:
                return {"valid": False, "error": "Malformed License Envelope"}

            license_data = envelope["data"]
            signature_b64 = envelope["signature"]

            # 2. Reconstruct Canonical Data String (matches json.dumps(sort_keys=True))
            # IMPORTANT: Must match exactly how issue_license.py created it
            data_str = json.dumps(license_data, sort_keys=True)
            
            # 3. Verify Signature
            try:
                signature = base64.b64decode(signature_b64)
                self.public_key.verify(
                    signature,
                    data_str.encode('utf-8'),
                    padding.PKCS1v15(),
                    hashes.SHA256()
                )
            except Exception as e:
                logger.warning(f"Signature verification failed: {e}")
                return {"valid": False, "error": "Invalid Signature"}

            # 4. Check Expiry
            expiry_str = license_data.get("expiry")
            if expiry_str:
                expiry_date = datetime.datetime.fromisoformat(expiry_str)
                if datetime.datetime.now() > expiry_date:
                    return {"valid": False, "error": "License Expired", "data": license_data}

            # 5. Check Machine ID (Optional enforcement)
            # If the license is bound to a machine ID, we check it.
            # If the backend receives a machine_id, we compare.
            rec_mid = license_data.get("machineId")
            if rec_mid and machine_id:
                if rec_mid != machine_id:
                     return {"valid": False, "error": "Machine ID Mismatch", "data": license_data}

            # Success
            self.is_pro = True
            if license_data.get("type") == "PRO":
                self.is_pro = True
            
            self.license_data = license_data
            logger.info(f"License validated for user: {license_data.get('email')}")
            return {"valid": True, "data": license_data}

        except Exception as e:
            logger.error(f"Validation exception: {e}")
            return {"valid": False, "error": f"Validation Error: {str(e)}"}

# Global instance
validator = LicenseValidator()
