# AI Multi-Model Chatbot Architecture

## System Flow Diagram

```mermaid
graph TB
    A[User Input] --> B[Flask Backend]
    B --> C[Multi-Model Orchestrator]
    
    C --> D1[Model 1: minimax/minimax-m2:free]
    C --> D2[Model 2: meituan/longcat-flash-chat:free]
    C --> D3[Model 3: openai/gpt-oss-20b:free]
    C --> D4[Model 4: z-ai/glm-4.5-air:free]
    C --> D5[Model 5: cognitivecomputations/dolphin-mistral-24b-venice-edition:free]
    C --> D6[Model 6: deepseek/deepseek-v3.2-exp]
    C --> D7[Model 7: x-ai/grok-4-fast]
    C --> D8[Model 8: arcee-ai/afm-4.5b]
    C --> D9[Model 9: openai/gpt-oss-120b:exacto]
    
    D1 --> E[Scoring Engine]
    D2 --> E
    D3 --> E
    D4 --> E
    D5 --> E
    D6 --> E
    D7 --> E
    D8 --> E
    D9 --> E
    
    E --> F[Winner Determination]
    F --> G[Real-time Updates]
    G --> H[Frontend Display]
    
    H --> I[Chat Window]
    H --> J[Progress Window]
    H --> K[Results Window]
```

## Components Overview

### Backend (Flask)
- **Multi-Model Orchestrator**: Manages parallel API calls to all 9 models
- **OpenRouter API Client**: Handles authentication and rate limiting
- **Scoring Engine**: Evaluates responses based on automated metrics
- **WebSocket/ SSE Handler**: Real-time progress updates

### Frontend (Vanilla JS)
- **Chat Interface**: User input and message display
- **Progress Tracker**: Live model status display
- **Results Viewer**: Show all responses and winner

### Scoring Metrics
- Response time (speed factor)
- Content quality (length, coherence)
- Relevance scoring
- Automated winner algorithm

## Technology Stack
- **Backend**: Flask + Python
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **API**: OpenRouter API integration
- **Real-time**: WebSocket or Server-Sent Events
- **Styling**: Light theme, minimalistic design