/**
 * AI Multi-Model Chatbot - Frontend JavaScript
 * Handles real-time communication with Flask backend and UI updates
 */

class AIChatbot {
    constructor() {
        this.socket = null;
        this.currentRequestId = null;
        this.models = [
            { name: "MiniMax M2", id: "minimax/minimax-m2:free", category: "free" },
            { name: "LongCat Flash", id: "meituan/longcat-flash-chat:free", category: "free" },
            { name: "GPT-OSS 20B", id: "openai/gpt-oss-20b:free", category: "free" },
            { name: "GLM-4.5 Air", id: "z-ai/glm-4.5-air:free", category: "free" },
            { name: "Dolphin Mistral", id: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free", category: "free" },
            { name: "DeepSeek V3.2", id: "deepseek/deepseek-v3.2-exp", category: "premium" },
            { name: "Grok-4 Fast", id: "x-ai/grok-4-fast", category: "premium" },
            { name: "AFM-4.5B", id: "arcee-ai/afm-4.5b", category: "premium" },
            { name: "GPT-OSS 120B", id: "openai/gpt-oss-120b:exacto", category: "premium" }
        ];
        
        this.init();
    }

    init() {
        this.initializeSocket();
        this.initializeEventListeners();
        this.initializeModelsDisplay();
    }

    initializeSocket() {
        // Initialize Socket.IO connection
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.updateConnectionStatus(true);
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.updateConnectionStatus(false);
        });

        this.socket.on('status', (data) => {
            console.log('Server status:', data);
        });

        this.socket.on('model_update', (data) => {
            this.handleModelUpdate(data);
        });

        this.socket.on('request_complete', (data) => {
            this.handleRequestComplete(data);
        });
    }

    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connectionStatus');
        const indicator = statusElement.querySelector('.status-indicator');
        const text = statusElement.querySelector('span:last-child');
        
        if (connected) {
            indicator.classList.add('connected');
            text.textContent = 'Connected';
        } else {
            indicator.classList.remove('connected');
            text.textContent = 'Disconnected';
        }
    }

    initializeEventListeners() {
        // Chat form submission
        const chatForm = document.getElementById('chatForm');
        chatForm.addEventListener('submit', (e) => this.handleChatSubmit(e));

        // Clear results button
        const clearButton = document.getElementById('clearResults');
        clearButton.addEventListener('click', () => this.clearResults());

        // Enter key handling
        const messageInput = document.getElementById('messageInput');
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleChatSubmit(e);
            }
        });
    }

    initializeModelsDisplay() {
        const modelsGrid = document.getElementById('modelsGrid');
        modelsGrid.innerHTML = '';

        this.models.forEach(model => {
            const modelElement = this.createModelElement(model);
            modelsGrid.appendChild(modelElement);
        });
    }

    createModelElement(model) {
        const modelDiv = document.createElement('div');
        modelDiv.className = 'model-item';
        modelDiv.id = `model-${this.getModelShortId(model.id)}`;
        
        modelDiv.innerHTML = `
            <div class="model-info">
                <div class="model-name">${model.name}</div>
                <div class="model-status">Waiting to start</div>
            </div>
            <div class="model-meta">
                <span class="model-badge ${model.category}">${model.category}</span>
                <span class="model-time" id="time-${this.getModelShortId(model.id)}">0.0s</span>
            </div>
        `;
        
        return modelDiv;
    }

    getModelShortId(modelId) {
        return modelId.split('/').pop().replace(/:/g, '-');
    }

    async handleChatSubmit(event) {
        event.preventDefault();
        
        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();
        
        if (!message) return;
        
        // Add user message to chat
        this.addMessage(message, 'user');
        
        // Clear input and disable
        messageInput.value = '';
        this.setInputDisabled(true);
        
        // Show loading overlay
        this.showLoadingOverlay(true);
        
        // Start processing
        await this.startProcessing(message);
    }

    addMessage(message, sender) {
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `${sender}-message fade-in`;
        messageDiv.textContent = message;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    setInputDisabled(disabled) {
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        
        messageInput.disabled = disabled;
        sendButton.disabled = disabled;
    }

    showLoadingOverlay(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (show) {
            overlay.classList.add('show');
        } else {
            overlay.classList.remove('show');
        }
    }

    async startProcessing(message) {
        try {
            // Send request to server
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message })
            });

            const data = await response.json();
            
            if (data.request_id) {
                this.currentRequestId = data.request_id;
                this.resetModels();
                this.updateProgressText('Processing with 9 AI models...');
            }
        } catch (error) {
            console.error('Error starting processing:', error);
            this.showError('Failed to start processing. Please try again.');
            this.setInputDisabled(false);
            this.showLoadingOverlay(false);
        }
    }

    resetModels() {
        this.models.forEach(model => {
            const modelElement = document.getElementById(`model-${this.getModelShortId(model.id)}`);
            if (modelElement) {
                modelElement.className = 'model-item';
                const statusElement = modelElement.querySelector('.model-status');
                statusElement.textContent = 'Initializing...';
            }
        });
        this.updateOverallProgress(0);
    }

    handleModelUpdate(data) {
        const { request_id, model, status, progress, score } = data;
        
        // Only process updates for current request
        if (request_id !== this.currentRequestId) return;
        
        const modelElement = document.getElementById(`model-${this.getModelShortId(model)}`);
        if (!modelElement) return;
        
        const statusElement = modelElement.querySelector('.model-status');
        const timeElement = document.getElementById(`time-${this.getModelShortId(model)}`);
        
        // Update status and styling
        modelElement.className = `model-item ${status}`;
        
        switch (status) {
            case 'processing':
                statusElement.textContent = 'Processing...';
                break;
            case 'completed':
                statusElement.innerHTML = `Completed <span style="color: #27ae60; font-weight: 600;">(${score || 0} pts)</span>`;
                break;
            case 'error':
                statusElement.textContent = 'Error occurred';
                break;
        }
        
        // Update time
        if (timeElement && progress !== undefined) {
            const elapsedTime = (progress / 100) * 30; // Estimate based on progress
            timeElement.textContent = `${elapsedTime.toFixed(1)}s`;
        }
        
        // Update overall progress
        this.updateOverallProgress(progress);
    }

    updateOverallProgress(progress) {
        const progressFill = document.getElementById('overallProgress');
        const progressText = document.getElementById('progressText');
        
        progressFill.style.width = `${progress}%`;
        
        if (progress === 0) {
            progressText.textContent = 'Ready to process';
        } else if (progress < 100) {
            progressText.textContent = `Processing... ${progress}%`;
        } else {
            progressText.textContent = 'All models completed!';
        }
    }

    updateProgressText(text) {
        const progressText = document.getElementById('progressText');
        progressText.textContent = text;
    }

    async handleRequestComplete(data) {
        const { request_id, winner_model, all_scores } = data;
        
        // Only process completion for current request
        if (request_id !== this.currentRequestId) return;
        
        try {
            // Get detailed results
            const response = await fetch(`/api/result/${request_id}`);
            const results = await response.json();
            
            this.displayResults(results);
            
            // Hide loading overlay and re-enable input
            this.showLoadingOverlay(false);
            this.setInputDisabled(false);
            
        } catch (error) {
            console.error('Error getting results:', error);
            this.showError('Failed to get results. Please try again.');
        }
    }

    displayResults(results) {
        const resultsSection = document.getElementById('resultsSection');
        const resultsGrid = document.getElementById('resultsGrid');
        const winnerBadge = document.getElementById('winnerBadge');
        const winnerName = document.getElementById('winnerName');
        
        // Show results section
        resultsSection.style.display = 'block';
        resultsSection.classList.add('fade-in');
        
        // Update winner display
        winnerName.textContent = results.winner_display_name;
        
        // Clear previous results
        resultsGrid.innerHTML = '';
        
        // Sort results by score (descending)
        const sortedResults = results.results.sort((a, b) => b.score - a.score);
        
        // Create result items
        sortedResults.forEach((result, index) => {
            const resultElement = this.createResultElement(result, index === 0);
            resultsGrid.appendChild(resultElement);
        });
        
        // Display summary
        this.displaySummary(results);
        
        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    createResultElement(result, isWinner) {
        const resultDiv = document.createElement('div');
        resultDiv.className = `result-item slide-up${isWinner ? ' winner' : ''}`;
        
        const timeFormatted = result.elapsed_time.toFixed(1);
        const scoreColor = result.score >= 80 ? 'high-score' : '';
        
        resultDiv.innerHTML = `
            <div class="result-header">
                <div class="model-name">
                    ${isWinner ? '🏆 ' : ''}${result.display_name}
                    <span class="model-badge ${result.category}">${result.category}</span>
                </div>
                <div class="result-meta">
                    <span class="score-badge ${scoreColor}">${result.score} pts</span>
                    <span class="result-time">${timeFormatted}s</span>
                </div>
            </div>
            <div class="result-body">
                <div class="result-response">${this.formatResponse(result.response)}</div>
                <div class="result-stats">
                    <span>⏱️ Response time: ${timeFormatted}s</span>
                    <span>🎯 Score: ${result.score}/100</span>
                    <span>📊 Category: ${result.category}</span>
                </div>
            </div>
        `;
        
        return resultDiv;
    }

    formatResponse(response) {
        // Simple formatting for better readability
        return response
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/^(.+)/, '<p>$1')
            .replace(/(.+)$/, '$1</p>');
    }

    displaySummary(results) {
        const summaryDiv = document.getElementById('resultsSummary');
        const completedModels = results.results.length;
        const totalTime = results.total_time.toFixed(1);
        const averageScore = (results.results.reduce((sum, r) => sum + r.score, 0) / completedModels).toFixed(1);
        const winnerScore = results.results.find(r => r.model_name === results.winner_model)?.score || 0;
        
        summaryDiv.innerHTML = `
            <h3>📈 Processing Summary</h3>
            <div class="summary-stats">
                <div class="stat-item">
                    <span class="stat-value">${completedModels}</span>
                    <span class="stat-label">Models Completed</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${totalTime}s</span>
                    <span class="stat-label">Total Time</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${averageScore}</span>
                    <span class="stat-label">Average Score</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${winnerScore}</span>
                    <span class="stat-label">Winner Score</span>
                </div>
            </div>
        `;
    }

    clearResults() {
        const resultsSection = document.getElementById('resultsSection');
        resultsSection.style.display = 'none';
        resultsSection.classList.remove('fade-in');
        
        // Reset progress
        this.updateOverallProgress(0);
        this.updateProgressText('Ready to process');
        
        // Reset models
        this.models.forEach(model => {
            const modelElement = document.getElementById(`model-${this.getModelShortId(model.id)}`);
            if (modelElement) {
                modelElement.className = 'model-item';
                const statusElement = modelElement.querySelector('.model-status');
                statusElement.textContent = 'Waiting to start';
            }
        });
    }

    showError(message) {
        // Simple error display - you could enhance this with a modal or toast
        alert(message);
    }
}

// Initialize the chatbot when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.aiChatbot = new AIChatbot();
});

// Handle page visibility changes to maintain WebSocket connection
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && window.aiChatbot) {
        // Reconnect if needed
        if (!window.aiChatbot.socket.connected) {
            window.aiChatbot.socket.connect();
        }
    }
});

// Prevent form submission on page refresh
window.addEventListener('beforeunload', (e) => {
    if (window.aiChatbot && window.aiChatbot.currentRequestId) {
        // Optionally notify server about cleanup
        e.preventDefault();
        e.returnValue = '';
    }
});