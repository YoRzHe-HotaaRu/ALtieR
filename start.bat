@echo off
echo Starting AI Multi-Model Chatbot...
echo.

REM Check if .env file exists
if not exist ".env" (
    echo Creating .env file...
    copy ".env.example" ".env"
    echo.
    echo WARNING: Please edit .env and add your OpenRouter API key before starting!
    echo Example: OPENROUTER_API_KEY=sk-or-v1-your-api-key-here
    echo.
    echo Opening .env file for editing...
    notepad .env
    pause
)

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate

REM Install/update dependencies
echo Installing dependencies...
pip install -r requirements.txt

echo.
echo Starting the AI Multi-Model Chatbot...
echo Access the application at: http://localhost:5000
echo Press Ctrl+C to stop the server.
echo.

REM Start the application
python app.py

pause