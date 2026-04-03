import os
from google import genai
from dotenv import load_dotenv
from pathlib import Path

# 1. Define path explicitly
env_path = Path('.') / '.env'

print(f"Looking for .env at: {env_path.absolute()}")

if not env_path.exists():
    print("❌ ERROR: .env file NOT FOUND at that location!")
else:
    print("✅ .env file found.")

# 2. Load with override
load_dotenv(dotenv_path=env_path, override=True)

# 3. Check loaded values
key = os.getenv("GEMINI_API_KEY")
model = os.getenv("GEMINI_MODEL")

print(f"Loaded GEMINI_API_KEY: ...{key[-6:] if key else 'None'}")
print(f"Loaded GEMINI_MODEL: {model}")

if not key:
    print("❌ ERROR: Key is empty!")
    exit()

# 4. List models using the new google-genai SDK
try:
    client = genai.Client(api_key=key)
    print("\nAttempting to list models...")
    for m in client.models.list():
        print(f"- {m.name}")
except Exception as e:
    print(f"\n❌ API Error: {e}")