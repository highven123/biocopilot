import json
import base64
import datetime
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import serialization

def issue_license():
    try:
        with open("private_key.pem", "rb") as f:
            private_key = serialization.load_pem_private_key(
                f.read(),
                password=None
            )
    except FileNotFoundError:
        print("❌ Error: private_key.pem not found. Run generate_keys.py first.")
        return

    print("--- 📝 Issue New License ---")
    name = input("User Name: ")
    email = input("Email: ")
    machine_id = input("Machine ID (Optional, press Enter to skip): ")
    days = input("Validity (days, default 365): ") or "365"
    
    expiry_date = (datetime.datetime.now() + datetime.timedelta(days=int(days))).isoformat()

    license_data = {
        "name": name,
        "email": email,
        "machineId": machine_id if machine_id else None,
        "expiry": expiry_date,
        "issued": datetime.datetime.now().isoformat(),
        "type": "PRO"
    }

    # Canonical JSON string
    data_str = json.dumps(license_data, sort_keys=True)
    
    # Sign data
    signature = private_key.sign(
        data_str.encode('utf-8'),
        padding.PKCS1v15(),
        hashes.SHA256()
    )

    # Combine data and signature
    final_license = {
        "data": license_data,
        "signature": base64.b64encode(signature).decode('utf-8')
    }

    # Encode entire object to base64 for easy copy-pasting
    license_string = base64.b64encode(json.dumps(final_license).encode('utf-8')).decode('utf-8')

    print("\n✅ License Generated!")
    print("-" * 60)
    print(license_string)
    print("-" * 60)

if __name__ == "__main__":
    issue_license()
