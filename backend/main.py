from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
import os
import websockets
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = FastAPI()

# Configure CORS to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for simplicity
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define the menu items with their details
MENU_ITEMS = {
    "caesar_salad": {"name": "Caesar Salad", "price": 8.99, "image": "/images/caesar_salad.jpg"},
    "cheeseburger": {"name": "Cheeseburger", "price": 12.99, "image": "/images/cheeseburger.jpg"},
    "chicken_nuggets": {"name": "Chicken Nuggets", "price": 7.99, "image": "/images/chicken_nuggets.jpg"},
    "french_fries": {"name": "French Fries", "price": 4.99, "image": "/images/french_fries.jpg"},
    "fried_chicken_wings": {"name": "Fried Chicken Wings", "price": 11.99, "image": "/images/fried_chicken_wings.jpg"},
    "hot_dog": {"name": "Hot Dog", "price": 6.99, "image": "/images/hot_dog.jpg"},
    "soft_drink": {"name": "Soft Drink", "price": 2.99, "image": "/images/soft_drink.jpg"},
    "veggie_burger": {"name": "Veggie Burger", "price": 10.99, "image": "/images/veggie_burger.jpg"}
}

@app.get("/api/menu")
async def get_menu():
    """API endpoint to get all menu items."""
    return {"items": MENU_ITEMS}

@app.websocket("/ws/voice")
async def voice_websocket(websocket: WebSocket):
    """WebSocket endpoint for handling the voice interaction with OpenAI."""
    await websocket.accept()
    
    cart = []
    current_view_index = 0
    
    try:
        openai_ws_url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01"
        headers = {
            "Authorization": f"Bearer {os.getenv('OPENAI_API_KEY')}",
            "OpenAI-Beta": "realtime=v1"
        }
        
        async with websockets.connect(openai_ws_url, extra_headers=headers) as openai_ws:
            menu_list = ", ".join([f"{item['name']} (${item['price']})" for item in MENU_ITEMS.values()])
            
            session_update = {
                "type": "session.update",
                "session": {
                    "modalities": ["text"],
                    "instructions": f"""You are a friendly fast food restaurant voice ordering assistant. 
                    
Available menu items: {menu_list}

Your capabilities are defined by the available tools. You MUST use the tools provided to fulfill user requests.
- To navigate the menu, you MUST use the 'navigate_carousel' function.
- To add items to the cart, you MUST use the 'add_to_cart' function.

Do not answer questions about the menu directly; use the tools to show the user the information. For example, if the user asks "show me the cheeseburger", call the 'navigate_carousel' function with the 'show_item' action.
""",
                    "voice": "alloy",
                    "output_audio_format": "pcm16",
                    "tools": [
                        {
                            "type": "function",
                            "name": "navigate_carousel",
                            "description": "Navigate the food carousel to show specific items or move next/previous",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "action": {"type": "string", "enum": ["next", "previous", "show_item"]},
                                    "item_name": {"type": "string", "description": "Specific item name to show"}
                                },
                                "required": ["action"]
                            }
                        },
                        {
                            "type": "function",
                            "name": "add_to_cart",
                            "description": "Add one or more items to the shopping cart",
                            "parameters": {
                                "type": "object",
                                "properties": {"items": {"type": "array", "items": {"type": "string"}}},
                                "required": ["items"]
                            }
                        },
                    ]
                }
            }
            await openai_ws.send(json.dumps(session_update))
            
            async def forward_to_openai():
                try:
                    async for message in websocket.iter_text():
                        data = json.loads(message)
                        if data.get("type") == "text":
                            print(f"➡️ Sending to OpenAI: {data.get('text')}")
                            await openai_ws.send(json.dumps({
                                "type": "conversation.item.create",
                                "item": {
                                    "type": "text",
                                    "text": data.get("text", ""),
                                    "end_of_turn": True
                                }
                            }))
                except Exception as e:
                    print(f"Error forwarding to OpenAI: {e}")
            
            async def forward_from_openai():
                nonlocal cart, current_view_index
                try:
                    async for message in openai_ws:
                        data = json.loads(message)
                        
                        if data.get("type") == "response.function_call_arguments.done":
                            func_name = data.get("name")
                            args = json.loads(data.get("arguments", "{}"))
                            print(f"🤖 Function call: {func_name}, Args: {args}")
                            
                            result = None
                            if func_name == "navigate_carousel":
                                menu_keys = list(MENU_ITEMS.keys())
                                if args["action"] == "next":
                                    current_view_index = (current_view_index + 1) % len(menu_keys)
                                    result = {"index": current_view_index, "item": MENU_ITEMS[menu_keys[current_view_index]]}
                                elif args["action"] == "previous":
                                    current_view_index = (current_view_index - 1 + len(menu_keys)) % len(menu_keys)
                                    result = {"index": current_view_index, "item": MENU_ITEMS[menu_keys[current_view_index]]}
                                elif args["action"] == "show_item":
                                    item_name_arg = args.get("item_name", "").lower().replace(" ", "").replace("_", "")
                                    matched_key = None
                                    for key in menu_keys:
                                        key_normalized = key.replace("_", "")
                                        if item_name_arg in key_normalized or key_normalized in item_name_arg:
                                            matched_key = key
                                            break
                                    if matched_key:
                                        print(f"✅ Matched '{item_name_arg}' to '{matched_key}'")
                                        current_view_index = menu_keys.index(matched_key)
                                        result = {"index": current_view_index, "item": MENU_ITEMS[matched_key]}
                                    else:
                                        print(f"❌ No match found for: '{item_name_arg}'")
                                
                                if result:
                                    await websocket.send_json({"type": "carousel_update", "data": result})
                                    await asyncio.sleep(0.01)
                            
                            elif func_name == "add_to_cart":
                                added_items = []
                                for item_name in args.get("items", []):
                                    item_key = item_name.lower().replace(" ", "_")
                                    if item_key in MENU_ITEMS:
                                        cart.append({"key": item_key, **MENU_ITEMS[item_key]})
                                        added_items.append(MENU_ITEMS[item_key]["name"])
                                result = {"cart": cart, "added": added_items}
                                await websocket.send_json({"type": "cart_update", "data": result})
                                await asyncio.sleep(0.01)
                            
                            if result:
                                await openai_ws.send(json.dumps({
                                    "type": "conversation.item.create",
                                    "item": {
                                        "type": "function_call_output",
                                        "call_id": data.get("call_id"),
                                        "output": json.dumps(result)
                                    }
                                }))

                        elif data.get("type") in ["response.text.delta", "response.text.done"]:
                            await websocket.send_json(data)

                except Exception as e:
                    print(f"Error processing message from OpenAI: {e}")
            
            await asyncio.gather(forward_to_openai(), forward_from_openai())
    
    except Exception as e:
        print(f"WebSocket connection error: {e}")
    finally:
        print("Connection closed.")
        await websocket.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)