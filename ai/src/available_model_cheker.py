import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

for model in client.models.list():
    print(f"Name: {model.name}")
    print(f"  Supported actions: {model.supported_actions}")
    print()
