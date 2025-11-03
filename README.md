# AI Multi-Model Chatbot - Setup Instructions

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.8 or higher
- OpenRouter API key (https://openrouter.ai/)

### Installation Steps

1. **Clone/Download the Project**
   ```bash
   # If you have the files in a directory
   cd ai-multi-model-chatbot
   ```

2. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env and add your OpenRouter API key
   # OPENROUTER_API_KEY=sk-or-v1-your-api-key-here
   ```

4. **Run the Application**
   ```bash
   python app.py
   ```

5. **Access the Chatbot**
   Open your browser and navigate to: `http://localhost:5000`

## 🏗️ Project Structure

```
ai-multi-model-chatbot/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── .env.example          # Environment configuration template
├── architecture.md       # System architecture documentation
├── templates/
│   └── index.html        # Main HTML template
└── static/
    ├── css/
    │   └── style.css     # Styling (light theme, responsive)
    └── js/
        └── main.js       # Frontend JavaScript logic
```

## 🤖 AI Models Supported

The chatbot uses 9 different AI models from OpenRouter:

### Free Models (5)
- **MiniMax M2**: minimax/minimax-m2:free
- **LongCat Flash**: meituan/longcat-flash-chat:free  
- **GPT-OSS 20B**: openai/gpt-oss-20b:free
- **GLM-4.5 Air**: z-ai/glm-4.5-air:free
- **Dolphin Mistral**: cognitivecomputations/dolphin-mistral-24b-venice-edition:free

### Premium Models (4)
- **DeepSeek V3.2**: deepseek/deepseek-v3.2-exp
- **Grok-4 Fast**: x-ai/grok-4-fast
- **AFM-4.5B**: arcee-ai/afm-4.5b
- **GPT-OSS 120B**: openai/gpt-oss-120b:exacto

## ⚙️ Features

- **Real-time Progress Tracking**: Live updates showing each model's status
- **Automated Scoring**: Response quality evaluation based on multiple factors
- **Winner Determination**: Automatic selection of best response
- **WebSocket Communication**: Real-time updates without page refresh
- **Responsive Design**: Works on desktop and mobile devices
- **Light Theme**: Clean, minimalistic interface

## 🧮 Scoring Algorithm

The scoring system evaluates responses based on:

1. **Content Quality** (40% weight): Word count and completeness
2. **Response Time** (30% weight): Faster responses get bonus points
3. **Coherence** (30% weight): Sentence structure and readability

## 🔧 Configuration Options

Edit `.env` file to customize:

```bash
# OpenRouter API Key (required)
OPENROUTER_API_KEY=your_api_key_here

# Flask settings
FLASK_ENV=development
FLASK_DEBUG=True
PORT=5000

# AI processing settings
MAX_MODELS_CONCURRENT=9
REQUEST_TIMEOUT=30
MAX_RETRIES=3
```

## 🐛 Troubleshooting

### Common Issues

1. **API Key Error**
   - Ensure your OpenRouter API key is correctly set in `.env`
   - Verify the key has access to the specified models

2. **Port Already in Use**
   ```bash
   # Change port in .env
   PORT=5001
   ```

3. **Dependencies Issues**
   ```bash
   # Create virtual environment
   python -m venv venv
   venv\Scripts\activate  # Windows
   pip install -r requirements.txt
   ```

4. **CORS Issues**
   - The app includes CORS configuration for development
   - For production, update the allowed origins in `app.py`

## 🚀 Deployment

### Local Development
```bash
python app.py
```

### Production Deployment
1. Set `FLASK_ENV=production`
2. Use a production WSGI server like Gunicorn:
   ```bash
   pip install gunicorn
   gunicorn app:app --bind 0.0.0.0:5000
   ```

### Docker Deployment
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["python", "app.py"]
```

## 📊 API Endpoints

- `GET /` - Main application page
- `POST /api/chat` - Submit chat message and start processing
- `GET /api/status/<request_id>` - Get processing status
- `GET /api/result/<request_id>` - Get final results

## 🛠️ Development

### Adding New Models
Edit `app.py` and update the `model_configs` dictionary:

```python
self.model_configs = {
    "new/model:name": {"name": "Display Name", "category": "free/premium"}
}
```

### Customizing Scoring
Modify the `calculate_score()` function in `app.py` to adjust scoring criteria.

### Styling Changes
Update `static/css/style.css` for design modifications.

## 📝 License

This project is open source. Feel free to modify and distribute.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review the logs in the terminal
3. Verify API key and network connectivity

---

**Enjoy your AI Multi-Model Chatbot! 🎉**