
import asyncio
from database import get_admin_client

async def test():
    client = await get_admin_client()
    res = await client.table("tenants").select("id, name, bot_id").execute()
    print("Available Tenants in DB:")
    if not res.data:
        print(" -> NONE! You need to create a bot first.")
    for t in res.data:
        print(f" -> ID: {t['id']} | Name: {t['name']} | Bot ID: {t['bot_id']}")

if __name__ == "__main__":
    asyncio.run(test())
