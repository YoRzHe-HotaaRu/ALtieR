#!/usr/bin/env python3
"""
OpenRouter API Test Script
Tests API key and basic functionality
"""

import os
import requests
import json

def test_openrouter_api():
    """Test OpenRouter API connectivity"""
    
    print("🧪 OpenRouter API Test")
    print("=" * 50)
    
    # Check API key
    api_key = os.getenv('OPENROUTER_API_KEY')
    if not api_key:
        print("❌ OPENROUTER_API_KEY not found in environment")
        print("   Please check your .env file")
        return False
    else:
        print(f"✅ API Key found: {api_key[:10]}...")
    
    # API configuration
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://localhost:5000",
        "X-Title": "AI Multi-Model Chatbot Test"
    }
    
    # Test payload
    test_model = "minimax/minimax-m2:free"  # Use free model for testing
    payload = {
        "model": test_model,
        "messages": [
            {"role": "user", "content": "Hello! Please respond with a short greeting."}
        ],
        "max_tokens": 100,
        "temperature": 0.7
    }
    
    print(f"\n📡 Testing model: {test_model}")
    print(f"📝 Message: {payload['messages'][0]['content']}")
    
    try:
        # Make request
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        
        print(f"\n📥 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ API call successful!")
            
            # Print raw response structure
            print(f"\n🔍 Response Structure:")
            for key, value in data.items():
                if key == "choices":
                    print(f"  - {key}: {len(value)} choices")
                    if value:
                        choice = value[0]
                        print(f"    First choice keys: {list(choice.keys())}")
                        if "message" in choice:
                            print(f"    Message keys: {list(choice['message'].keys())}")
                            if "content" in choice["message"]:
                                content = choice["message"]["content"]
                                print(f"    Content: '{content[:50]}...'")
                else:
                    print(f"  - {key}: {value}")
            
            # Try to extract content
            if "choices" in data and data["choices"]:
                choice = data["choices"][0]
                if "message" in choice and "content" in choice["message"]:
                    content = choice["message"]["content"]
                    print(f"\n🎯 Extracted Content:")
                    print(f"   '{content}'")
                    
                    if content.strip():
                        print("\n✅ SUCCESS: Content extracted successfully!")
                        return True
                    else:
                        print("\n⚠️ WARNING: Content is empty!")
                        return False
                else:
                    print("\n❌ ERROR: No content in response structure!")
                    return False
            else:
                print("\n❌ ERROR: No choices in response!")
                return False
                
        else:
            print(f"❌ API Error: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        print("⏰ Request timed out!")
        return False
    except Exception as e:
        print(f"💥 Exception: {str(e)}")
        return False

def test_all_models():
    """Test a few different models"""
    
    print("\n" + "=" * 50)
    print("🧪 Testing Multiple Models")
    print("=" * 50)
    
    models = [
        "minimax/minimax-m2:free",
        "meituan/longcat-flash-chat:free", 
        "openai/gpt-oss-20b:free"
    ]
    
    results = {}
    
    for model in models:
        print(f"\n🔍 Testing {model}...")
        try:
            result = test_single_model(model)
            results[model] = result
        except Exception as e:
            print(f"❌ Failed to test {model}: {e}")
            results[model] = False
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Summary")
    print("=" * 50)
    
    for model, success in results.items():
        status = "✅ Working" if success else "❌ Failed"
        print(f"{model}: {status}")
    
    working_count = sum(1 for success in results.values() if success)
    print(f"\n🏆 {working_count}/{len(results)} models working")

def test_single_model(model_name):
    """Test a single model"""
    
    api_key = os.getenv('OPENROUTER_API_KEY')
    if not api_key:
        return False
    
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": model_name,
        "messages": [
            {"role": "user", "content": "Say 'Hello World'"}
        ],
        "max_tokens": 50,
        "temperature": 0.7
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            if "choices" in data and data["choices"]:
                choice = data["choices"][0]
                if "message" in choice and "content" in choice["message"]:
                    content = choice["message"]["content"].strip()
                    if content:
                        print(f"   ✅ Response: '{content}'")
                        return True
        
        print(f"   ❌ No valid response")
        return False
        
    except Exception as e:
        print(f"   💥 Exception: {e}")
        return False

if __name__ == "__main__":
    print("OpenRouter API Test Script")
    print("=" * 50)
    
    # First test single model
    success = test_openrouter_api()
    
    # If successful, test multiple models
    if success:
        test_all_models()
    else:
        print("\n🚨 Single model test failed - skipping multiple model test")
    
    print("\n🏁 Test completed!")