"""
AI Multi-Model Chatbot - Flask Backend
Orchestrates multiple OpenRouter AI models for chat responses
"""

import os
import json
import uuid
import time
import threading
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import requests
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['SECRET_KEY'] = 'ai-chatbot-secret-key'
CORS(app, cors_allowed_origins="*")
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Global state management
class ChatState:
    def __init__(self):
        self.active_requests = {}
        self.model_configs = {
            "minimax/minimax-m2:free": {"name": "MiniMax M2", "category": "free"},
            "meituan/longcat-flash-chat:free": {"name": "LongCat Flash", "category": "free"},
            "openai/gpt-oss-20b:free": {"name": "GPT-OSS 20B", "category": "free"},
            "z-ai/glm-4.5-air:free": {"name": "GLM-4.5 Air", "category": "free"},
            "cognitivecomputations/dolphin-mistral-24b-venice-edition:free": {"name": "Dolphin Mistral", "category": "free"},
            "deepseek/deepseek-v3.2-exp": {"name": "DeepSeek V3.2", "category": "premium"},
            "x-ai/grok-4-fast": {"name": "Grok-4 Fast", "category": "premium"},
            "arcee-ai/afm-4.5b": {"name": "AFM-4.5B", "category": "premium"},
            "openai/gpt-oss-120b:exacto": {"name": "GPT-OSS 120B", "category": "premium"}
        }
    
    def create_request(self, user_message):
        request_id = str(uuid.uuid4())
        self.active_requests[request_id] = {
            "user_message": user_message,
            "start_time": time.time(),
            "status": "processing",
            "models": {}
        }
        return request_id
    
    def update_model_status(self, request_id, model_name, status, data=None):
        if request_id in self.active_requests:
            self.active_requests[request_id]["models"][model_name] = {
                "status": status,
                "start_time": time.time(),
                "data": data or {}
            }
    
    def complete_model(self, request_id, model_name, response, elapsed_time, score):
        if request_id in self.active_requests:
            self.active_requests[request_id]["models"][model_name].update({
                "status": "completed",
                "response": response,
                "elapsed_time": elapsed_time,
                "score": score,
                "end_time": time.time()
            })
    
    def get_request_status(self, request_id):
        return self.active_requests.get(request_id, {})
    
    def complete_request(self, request_id, winner_model, all_scores):
        if request_id in self.active_requests:
            self.active_requests[request_id].update({
                "status": "completed",
                "winner_model": winner_model,
                "all_scores": all_scores,
                "total_time": time.time() - self.active_requests[request_id]["start_time"]
            })

chat_state = ChatState()

class OpenRouterClient:
    """OpenRouter API client for making requests to multiple AI models"""
    
    def __init__(self):
        self.api_key = os.getenv('OPENROUTER_API_KEY')
        self.base_url = "https://openrouter.ai/api/v1/chat/completions"
        
        if not self.api_key:
            logger.error("🚨 OPENROUTER_API_KEY not found in environment variables!")
            logger.error("Please check your .env file and ensure OPENROUTER_API_KEY is set")
        else:
            logger.info(f"✅ OpenRouter API key loaded: {self.api_key[:20]}...")
        
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://localhost:5000",
            "X-Title": "AI Multi-Model Chatbot"
        }
    
    def make_request(self, model_name, message, timeout=30):
        """Make a request to OpenRouter API"""
        logger.info(f"🚀 Making request to {model_name} with message: '{message[:50]}...'")
        
        # Check API key first
        if not self.api_key:
            logger.error(f"🚨 No API key available for {model_name}")
            return {
                "success": False,
                "error": "No OpenRouter API key configured",
                "elapsed_time": 0,
                "content": ""
            }
        
        payload = {
            "model": model_name,
            "messages": [
                {"role": "user", "content": message}
            ],
            "max_tokens": 1000,
            "temperature": 0.7
        }
        
        try:
            start_time = time.time()
            logger.info(f"📡 Sending POST request to {self.base_url}")
            
            response = requests.post(
                self.base_url,
                headers=self.headers,
                json=payload,
                timeout=timeout
            )
            
            logger.info(f"📥 Response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"📊 Raw API response: {data}")
                
                elapsed_time = time.time() - start_time
                
                # Enhanced response parsing with multiple fallbacks
                content = ""
                
                # Try different response structures
                if "choices" in data and data["choices"]:
                    choice = data["choices"][0]
                    if "message" in choice and "content" in choice["message"]:
                        content = choice["message"]["content"]
                        logger.info(f"✅ Content extracted via message.content: '{content[:100]}...'")
                    elif "text" in choice:
                        content = choice["text"]
                        logger.info(f"✅ Content extracted via text: '{content[:100]}...'")
                    elif "content" in choice:
                        content = choice["content"]
                        logger.info(f"✅ Content extracted via content: '{content[:100]}...'")
                
                # Log final content
                if content:
                    logger.info(f"🎯 Final content length: {len(content)} chars")
                    logger.info(f"🎯 Content preview: '{content[:100]}...'")
                else:
                    logger.warning(f"⚠️ No content found in response for {model_name}")
                    logger.warning(f"⚠️ Available keys: {list(data.keys())}")
                
                return {
                    "success": True,
                    "content": content,
                    "elapsed_time": elapsed_time,
                    "usage": data.get("usage", {}),
                    "raw_response": data
                }
            else:
                logger.error(f"❌ API Error {response.status_code}: {response.text}")
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}: {response.text}",
                    "elapsed_time": time.time() - start_time,
                    "content": ""
                }
        except requests.exceptions.Timeout:
            logger.error(f"⏰ Request timeout for {model_name}")
            return {
                "success": False,
                "error": "Request timeout",
                "elapsed_time": timeout,
                "content": ""
            }
        except Exception as e:
            logger.error(f"💥 Exception in {model_name}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "elapsed_time": time.time() - start_time,
                "content": ""
            }

# Initialize OpenRouter client
openrouter_client = OpenRouterClient()

def calculate_score(response_data):
    """Calculate a quality score for the response"""
    if not response_data.get("success"):
        return 0
    
    content = response_data.get("content", "")
    elapsed_time = response_data.get("elapsed_time", 0)
    
    # Base score from content quality
    content_score = min(len(content.split()), 100) / 100  # Word count normalized
    
    # Time bonus (faster is better, but not too fast)
    time_score = max(0, 1 - (elapsed_time / 30))  # Normalized by max 30s
    
    # Coherence score (simple heuristic based on sentence structure)
    sentences = content.split('.')
    coherence_score = min(len(sentences) / 10, 1)  # Prefer responses with proper sentence structure
    
    # Final weighted score
    final_score = (content_score * 0.4) + (time_score * 0.3) + (coherence_score * 0.3)
    return round(final_score * 100, 2)

def process_single_model(request_id, model_name, user_message):
    """Process a single AI model request"""
    logger.info(f"🔄 Starting processing for {model_name}")
    
    # Update status to processing
    socketio.emit('model_update', {
        'request_id': request_id,
        'model': model_name,
        'status': 'processing',
        'progress': 50
    })
    
    # Make API request
    response_data = openrouter_client.make_request(model_name, user_message)
    
    # Log response details
    logger.info(f"📋 Response from {model_name}:")
    logger.info(f"  - Success: {response_data.get('success', False)}")
    logger.info(f"  - Content length: {len(response_data.get('content', ''))}")
    logger.info(f"  - Content preview: '{response_data.get('content', '')[:100]}...'")
    logger.info(f"  - Error: {response_data.get('error', 'None')}")
    
    # Calculate score
    score = calculate_score(response_data)
    logger.info(f"📊 Score for {model_name}: {score}")
    
    # Extract response content safely
    response_content = response_data.get("content", "")
    if not response_content:
        logger.warning(f"⚠️ Empty response content from {model_name}")
    
    # Complete the request
    chat_state.complete_model(
        request_id,
        model_name,
        response_content,
        response_data.get("elapsed_time", 0),
        score
    )
    
    # Emit completion update
    socketio.emit('model_update', {
        'request_id': request_id,
        'model': model_name,
        'status': 'completed',
        'progress': 100,
        'score': score
    })
    
    logger.info(f"✅ Completed {model_name} with score {score}")
    
    return {
        "model": model_name,
        "response": response_data,
        "score": score
    }

def determine_winner(model_results):
    """Determine the winning model based on scores"""
    if not model_results:
        return None
    
    best_result = max(model_results, key=lambda x: x["score"])
    return best_result["model"]

# WebSocket event handlers
@socketio.on('connect')
def handle_connect():
    emit('status', {'message': 'Connected to AI Chatbot Server'})

@socketio.on('disconnect')
def handle_disconnect():
    emit('status', {'message': 'Disconnected from server'})

# REST API endpoints
@app.route('/')
def index():
    """Serve the main HTML page"""
    return render_template('index.html')

@app.route('/debug')
def debug_page():
    """Serve the debug page"""
    return render_template('debug.html')

@app.route('/api/debug/test', methods=['GET'])
def debug_test():
    """Test endpoint to check OpenRouter API setup"""
    logger.info("🧪 Running debug test...")
    
    # Check environment
    api_key = os.getenv('OPENROUTER_API_KEY')
    debug_info = {
        "api_key_status": "✅ Set" if api_key else "❌ Missing",
        "api_key_prefix": api_key[:10] + "..." if api_key else "None",
        "available_models": list(chat_state.model_configs.keys()),
        "client_initialized": openrouter_client.api_key is not None
    }
    
    # Try a simple test with first free model
    test_model = "minimax/minimax-m2:free"
    
    if api_key:
        logger.info(f"🧪 Testing with model: {test_model}")
        try:
            test_response = openrouter_client.make_request(test_model, "Hello, test message", timeout=10)
            debug_info["test_response"] = {
                "success": test_response.get("success", False),
                "content_length": len(test_response.get("content", "")),
                "error": test_response.get("error", "None"),
                "elapsed_time": test_response.get("elapsed_time", 0)
            }
            if test_response.get("content"):
                debug_info["test_response"]["content_preview"] = test_response.get("content")[:100]
        except Exception as e:
            debug_info["test_error"] = str(e)
    
    return jsonify(debug_info)

@app.route('/api/chat', methods=['POST'])
def handle_chat():
    """Handle chat requests and trigger multi-model processing"""
    data = request.get_json()
    user_message = data.get('message', '').strip()
    
    if not user_message:
        return jsonify({'error': 'Message is required'}), 400
    
    # Log the chat request
    logger.info(f"📝 Chat request received: '{user_message[:50]}...'")
    
    # Create new request
    request_id = chat_state.create_request(user_message)
    logger.info(f"🆔 Created request ID: {request_id}")
    
    # Initialize model statuses
    for model_name in chat_state.model_configs.keys():
        chat_state.update_model_status(request_id, model_name, "pending")
    
    # Start processing in background
    def process_all_models():
        logger.info(f"🚀 Starting multi-model processing for {user_message[:50]}...")
        model_results = []
        
        # Process all models in parallel
        with ThreadPoolExecutor(max_workers=9) as executor:
            future_to_model = {
                executor.submit(process_single_model, request_id, model_name, user_message): model_name
                for model_name in chat_state.model_configs.keys()
            }
            
            for future in as_completed(future_to_model):
                try:
                    result = future.result()
                    model_results.append(result)
                    logger.info(f"✅ {result['model']} completed with score {result['score']}")
                except Exception as e:
                    model_name = future_to_model[future]
                    logger.error(f"❌ Error processing {model_name}: {e}")
        
        # Determine winner
        winner = determine_winner(model_results)
        logger.info(f"🏆 Winner determined: {winner}")
        
        # Complete the request
        all_scores = {result["model"]: result["score"] for result in model_results}
        chat_state.complete_request(request_id, winner, all_scores)
        
        # Emit final result
        socketio.emit('request_complete', {
            'request_id': request_id,
            'winner_model': winner,
            'all_scores': all_scores
        })
        
        logger.info(f"🎉 Request {request_id} completed! Winner: {winner}")
    
    # Start background processing
    threading.Thread(target=process_all_models, daemon=True).start()
    
    return jsonify({
        'request_id': request_id,
        'message': 'Processing started',
        'models': list(chat_state.model_configs.keys())
    })

@app.route('/api/status/<request_id>', methods=['GET'])
def get_status(request_id):
    """Get the status of a specific request"""
    status = chat_state.get_request_status(request_id)
    return jsonify(status)

@app.route('/api/result/<request_id>', methods=['GET'])
def get_result(request_id):
    """Get the final result of a completed request"""
    status = chat_state.get_request_status(request_id)
    
    if status.get("status") != "completed":
        return jsonify({'error': 'Request not completed yet'}), 400
    
    # Format results for frontend
    results = []
    for model_name, model_data in status.get("models", {}).items():
        if model_data.get("status") == "completed":
            model_info = chat_state.model_configs.get(model_name, {})
            results.append({
                "model_name": model_name,
                "display_name": model_info.get("name", model_name),
                "category": model_info.get("category", "unknown"),
                "response": model_data.get("response", ""),
                "elapsed_time": model_data.get("elapsed_time", 0),
                "score": model_data.get("score", 0)
            })
    
    return jsonify({
        "request_id": request_id,
        "user_message": status.get("user_message", ""),
        "winner_model": status.get("winner_model", ""),
        "winner_display_name": chat_state.model_configs.get(
            status.get("winner_model", ""), {}
        ).get("name", status.get("winner_model", "")),
        "results": results,
        "total_time": status.get("total_time", 0),
        "all_scores": status.get("all_scores", {})
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"🚀 AI Multi-Model Chatbot Server starting on port {port}")
    socketio.run(app, debug=True, host='0.0.0.0', port=port)