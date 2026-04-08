
from jose import jwt
from config import settings

def test():
    token = settings.SUPABASE_ANON_KEY
    secret = settings.SUPABASE_JWT_SECRET
    
    print(f"Token (preview): {token[:20]}...")
    print(f"Secret (preview): {secret[:10]}...")
    
    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            options={"verify_aud": False, "verify_signature": True}
        )
        print("Signature verification: PASSED ✅")
        print(f"Payload: {payload}")
    except Exception as e:
        print(f"Signature verification: FAILED ❌ — {e}")
        
    # Test if secret needs to be bytes
    try:
        payload = jwt.decode(
            token,
            secret.encode(),
            algorithms=["HS256"],
            options={"verify_aud": False, "verify_signature": True}
        )
        print("Signature verification (bytes secret): PASSED ✅")
    except Exception as e:
        print(f"Signature verification (bytes secret): FAILED ❌ — {e}")

if __name__ == "__main__":
    test()
