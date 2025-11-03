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

        // Split models into two columns (5 left, 4 right)
        const leftColumn = this.models.slice(0, 5);
        const rightColumn = this.models.slice(5);

        // Create left column
        const leftColumnDiv = document.createElement('div');
        leftColumnDiv.className = 'model-column left-column';
        leftColumn.forEach(model => {
            const modelElement = this.createModelElement(model);
            leftColumnDiv.appendChild(modelElement);
        });

        // Create right column
        const rightColumnDiv = document.createElement('div');
        rightColumnDiv.className = 'model-column right-column';
        rightColumn.forEach(model => {
            const modelElement = this.createModelElement(model);
            rightColumnDiv.appendChild(modelElement);
        });

        // Add columns to grid
        modelsGrid.appendChild(leftColumnDiv);
        modelsGrid.appendChild(rightColumnDiv);
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
                this.activateProgressSection();
                this.updateProgressText('Processing with 9 AI models...');
            }
        } catch (error) {
            console.error('Error starting processing:', error);
            this.showError('Failed to start processing. Please try again.');
            this.setInputDisabled(false);
            this.deactivateProgressSection();
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

    resetModelsInColumns() {
        // Handle reset for new column structure
        this.resetModels();
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
    
    activateProgressSection() {
        const progressSection = document.getElementById('progressSection');
        progressSection.classList.add('active');
        
        const progressStatus = document.getElementById('progressStatus');
        const statusText = progressStatus.querySelector('span:last-child');
        statusText.textContent = 'Processing...';
    }
    
    deactivateProgressSection() {
        const progressSection = document.getElementById('progressSection');
        progressSection.classList.remove('active');
        
        const progressStatus = document.getElementById('progressStatus');
        const statusText = progressStatus.querySelector('span:last-child');
        statusText.textContent = 'Ready to process';
    }

    async handleRequestComplete(data) {
        console.log('Request completion received:', data); // Debug log
        
        const { request_id, winner_model, all_scores } = data;
        
        // Only process completion for current request
        if (request_id !== this.currentRequestId) {
            console.log('Ignoring completion for different request');
            return;
        }
        
        try {
            // Get detailed results
            const response = await fetch(`/api/result/${request_id}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const results = await response.json();
            console.log('Results fetched successfully:', results); // Debug log
            
            this.displayResults(results);
            
            // Re-enable input
            this.setInputDisabled(false);
            
            // Deactivate progress section
            this.deactivateProgressSection();
            
        } catch (error) {
            console.error('Error getting results:', error);
            this.showError('Failed to get results. Please try again.');
            this.deactivateProgressSection();
        }
    }

    displayResults(results) {
        console.log('Displaying results:', results); // Debug log
        
        // Get DOM elements with null checks
        const resultsSection = document.getElementById('resultsSection');
        const resultsGrid = document.getElementById('resultsGrid');
        const winnerName = document.getElementById('winnerName');
        
        console.log('DOM Elements found:', {
            resultsSection: !!resultsSection,
            resultsGrid: !!resultsGrid,
            winnerName: !!winnerName
        });
        
        // Handle results section display
        if (resultsSection) {
            resultsSection.style.display = 'block';
            resultsSection.style.visibility = 'visible';
            resultsSection.style.opacity = '1';
            resultsSection.classList.add('fade-in');
        }
        
        // Update winner name if element exists
        if (winnerName) {
            winnerName.textContent = results.winner_display_name || 'Unknown';
        }
        
        // Handle results grid
        if (!resultsGrid) {
            console.error('Results grid element missing');
            return;
        }
        
        // Clear previous results
        resultsGrid.innerHTML = '';
        
        // Check if we have results
        if (!results.results || results.results.length === 0) {
            console.log('No results to display');
            resultsGrid.innerHTML = '<p style="padding: 20px; text-align: center; color: #7f8c8d;">No responses received from AI models.</p>';
            
            // Update winner spotlight even if no results
            this.updateWinnerSpotlight(results);
            return;
        }
        
        try {
            // Sort results by score (descending)
            const sortedResults = results.results.sort((a, b) => b.score - a.score);
            console.log('Sorted results:', sortedResults); // Debug log
            
            // Create result items
            sortedResults.forEach((result, index) => {
                const resultElement = this.createResultElement(result, index === 0);
                resultsGrid.appendChild(resultElement);
            });
            
            // Display summary
            this.displaySummary(results);
            
            // Update winner spotlight
            this.updateWinnerSpotlight(results);
            
        } catch (error) {
            console.error('Error creating result elements:', error);
            resultsGrid.innerHTML = '<p style="padding: 20px; text-align: center; color: #e74c3c;">Error displaying results. Please check the console for details.</p>';
        }
        
        // Force scroll to results section
        if (resultsSection) {
            setTimeout(() => {
                resultsSection.scrollIntoView({ behavior: 'smooth' });
            }, 200);
        }
    }

    updateWinnerSpotlight(results) {
        const winnerSpotlight = document.getElementById('winnerSpotlight');
        const winnerModelName = document.getElementById('winnerModelName');
        const winnerScore = document.getElementById('winnerScore');
        const winnerCategory = document.getElementById('winnerCategory');
        const winnerResponse = document.getElementById('winnerResponse');
        const winnerTime = document.getElementById('winnerTime');
        
        console.log('Winner spotlight DOM elements:', {
            winnerSpotlight: !!winnerSpotlight,
            winnerModelName: !!winnerModelName,
            winnerScore: !!winnerScore,
            winnerCategory: !!winnerCategory,
            winnerResponse: !!winnerResponse,
            winnerTime: !!winnerTime
        });
        
        // Check if all required elements exist
        if (!winnerSpotlight) {
            console.log('Winner spotlight section not found in DOM');
            return;
        }
        
        if (!results.winner_model || !results.results) {
            console.log('No winner data available for spotlight');
            return;
        }
        
        // Find the winning model's result
        const winnerResult = results.results.find(r => r.model_name === results.winner_model);
        if (!winnerResult) {
            console.log('Winner result not found');
            return;
        }
        
        // Show the winner spotlight
        winnerSpotlight.style.display = 'block';
        winnerSpotlight.classList.add('show');
        
        // Update winner details safely
        if (winnerModelName) {
            winnerModelName.textContent = winnerResult.display_name || 'Unknown';
        }
        
        if (winnerScore) {
            winnerScore.textContent = `${winnerResult.score} pts`;
        }
        
        if (winnerTime) {
            winnerTime.textContent = `Time: ${winnerResult.elapsed_time.toFixed(1)}s`;
        }
        
        // Update category badge
        if (winnerCategory) {
            winnerCategory.textContent = winnerResult.category;
            winnerCategory.className = `category-badge ${winnerResult.category}`;
        }
        
        // Format and display the response
        if (winnerResponse) {
            const formattedResponse = this.formatResponse(winnerResult.response);
            winnerResponse.innerHTML = formattedResponse;
        }
        
        console.log('✅ Winner spotlight updated:', winnerResult);
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
        
        // Hide winner spotlight
        this.hideWinnerSpotlight();
        
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
        
        // Deactivate progress section
        this.deactivateProgressSection();
    }

    hideWinnerSpotlight() {
        const winnerSpotlight = document.getElementById('winnerSpotlight');
        if (winnerSpotlight) {
            winnerSpotlight.style.display = 'none';
            winnerSpotlight.classList.remove('show');
            
            // Reset content
            const winnerModelName = document.getElementById('winnerModelName');
            const winnerScore = document.getElementById('winnerScore');
            const winnerCategory = document.getElementById('winnerCategory');
            const winnerResponse = document.getElementById('winnerResponse');
            const winnerTime = document.getElementById('winnerTime');
            
            if (winnerModelName) winnerModelName.textContent = 'Loading...';
            if (winnerScore) winnerScore.textContent = '0';
            if (winnerCategory) {
                winnerCategory.textContent = 'free';
                winnerCategory.className = 'category-badge';
            }
            if (winnerResponse) {
                winnerResponse.innerHTML = '<div class="response-loading">Waiting for results...</div>';
            }
            if (winnerTime) winnerTime.textContent = 'Time: 0.0s';
        }
    }

    showError(message) {
        // Simple error display - you could enhance this with a modal or toast
        alert(message);
    }
}

// Initialize the chatbot when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing chatbot...');
    
    // Small delay to ensure all elements are rendered
    setTimeout(() => {
        window.aiChatbot = new AIChatbot();
        console.log('✅ Chatbot initialized successfully');
    }, 100);
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