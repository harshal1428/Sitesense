import os
from dotenv import load_dotenv

# Try from SiteSence root
load_dotenv(".env")
print(f"Supabase URL: {os.getenv('SUPABASE_URL')}")
print(f"Anthropic API: {os.getenv('ANTHROPIC_API_KEY')[:5]}...")
