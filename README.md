# AIVisualAgent - Gourmet Express

A real-time, voice-controlled fast-food ordering system powered by OpenAI's real-time API. This project demonstrates how a visual interface can be controlled entirely by natural language commands.

The application, "Gourmet Express," features a visual menu carousel and a shopping cart. Users can speak commands like "Show me the cheeseburger," "Go to the next item," or "Add two orders of fries to my cart," and the AI will understand the intent and update the UI accordingly.

## 🌟 Features

* **Voice Control:** Uses the browser's built-in SpeechRecognition to capture user voice.
* **AI-Driven UI:** Leverages **OpenAI's GPT-4o-realtime** model to understand user commands and call specific functions to control the frontend.
* **Real-time Streaming:** Uses WebSockets for bi-directional, low-latency communication between the frontend, backend, and the OpenAI API.
* **Dynamic Interface:** The React frontend instantly reacts to backend WebSocket messages to:
    * Navigate the menu carousel.
    * Update the shopping cart.
    * Display live transcripts and AI responses.
* **Backend Tooling:** The FastAPI backend provides the AI with "tools" (`Maps_carousel`, `add_to_cart`) that the AI can choose to call, translating its "intent" into concrete actions.

## 🤖 How It Works

1.  The user clicks the **mic button** in the React frontend. The browser's SpeechRecognition API captures their speech and transcribes it to text.
2.  The transcribed text is sent to the **FastAPI backend** via a WebSocket (`/ws/voice`).
3.  The FastAPI server, in turn, streams this text to the **OpenAI real-time API**.
4.  OpenAI processes the text. Based on its instructions, it decides whether to respond with text or to use one of the provided tools (e.g., `Maps_carousel`).
5.  If OpenAI calls a tool, the FastAPI backend executes the corresponding Python function (e.g., updating the cart list or changing the current menu index).
6.  The backend then broadcasts a WebSocket message (e.g., `cart_update` or `carousel_update`) to the frontend.
7.  The React frontend's `useEffect` hook listens for these messages and updates the React state, causing the UI to change instantly.

## 💻 Tech Stack

* **Frontend:**
    * **React**
    * **Vite** (Frontend Tooling)
    * **Tailwind CSS** (Styling)
    * **Lucide-react** (Icons)
* **Backend:**
    * **Python**
    * **FastAPI** (Web Framework)
    * **Uvicorn** (ASGI Server)
    * **WebSockets** (Real-time Communication)
* **AI:**
    * **OpenAI GPT-4o-realtime-preview**
    * OpenAI Python Client

---

## 🚀 Getting Started

Follow these instructions to get the project running on your local machine.

### Prerequisites

* **Python 3.8+** and `pip`
* **Node.js** (v18 or higher) and `npm`
* An **OpenAI API Key** with access to the real-time models.

### 1. Backend Setup (FastAPI)

First, set up and run the Python backend.

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Create and activate a virtual environment:**
    ```bash
    # On macOS/Linux
    python3 -m venv venv
    source venv/bin/activate

    # On Windows
    python -m venv venv
    .\venv\Scripts\activate
    ```

3.  **Install the required Python packages:**
    ```bash
    pip install -r requirements.txt
    ```
    *(This will install FastAPI, Uvicorn, OpenAI, and other dependencies.)*

4.  **Create an environment file:**
    Create a new file named `.env` in the `backend` directory.

5.  **Add your OpenAI API Key** to the `.env` file:
    ```
    OPENAI_API_KEY="sk-YourSecretKeyGoesHere"
    ```

6.  **Run the backend server:**
    ```bash
    uvicorn main:app --host 0.0.0.0 --port 8000
    ```
    Your backend is now running on `http://localhost:8000`.

### 2. Frontend Setup (React)

In a **new terminal**, set up and run the React frontend.

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```

2.  **Install the required npm packages:**
    ```bash
    npm install
    ```

3.  **Run the frontend development server:**
    ```bash
    npm run dev
    ```
    Your frontend is now running.

### 3. View the Application

Open your browser and go to:

**http://localhost:3000**

The `vite.config.js` is already pre-configured to proxy WebSocket requests from the frontend (port 3000) to the backend (port 8000). You can now click the mic icon and start ordering!
