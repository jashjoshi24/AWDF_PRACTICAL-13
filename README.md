# Practical 13: AI API Integration into a Web Application

**Course**: Advanced Web Development Frameworks (ITUE301)  
**Department**: IT/CE/CSE/AIML - CSPIT, CHARUSAT  
**Semester**: 5th  

---

## 📌 Objective
To securely integrate a third-party Generative AI API (OpenAI / Gemini) into a full-stack Task Management application from a Node/Express backend, implement **graceful degradation** when the external dependency fails, enforce **server-side rate limiting**, and practice **Responsible AI governance**.

---

## 🏗️ Architecture & Security Flow Diagram

```text
React / Web Frontend
       │
       ▼ (User clicks "Generate with AI" - sends only the task title)
Express Backend POST /api/ai/generate-description
       │
       ├── Rate Limiter Check (Max 5 req/min per client)
       ├── API Key safely stored in backend .env (NEVER exposed to frontend!)
       │
       ▼
Third-Party AI Service (OpenAI / Gemini)
       │
   ┌───┴───────────────────────────────────────────┐
   ▼                                               ▼
[SUCCESS (200)]                             [FAILURE / TIMEOUT / INVALID KEY]
Parse response & extract description         Catch error in try/catch block
   │                                               │
   │                                               ▼ (Graceful Degradation)
   │                                        Generate template suggestion
   │                                        without crashing application
   └───────────────────────┬───────────────────────┘
                           │
                           ▼
Send clean JSON to Frontend: { description, priority, fallback: boolean }
                           │
                           ▼
Frontend UI renders editable suggestion in textarea with Responsible AI Disclaimer!
```

---

## 💡 Key Features Implemented

1. **Secure Server-Side API Key Storage**:
   - `OPENAI_API_KEY` is loaded exclusively inside [routes/aiRoutes.js](file:///d:/REACT-AWDF/prac13/routes/aiRoutes.js) via `process.env`.
   - The key is **never** embedded in client bundles or transmitted over browser network requests.

2. **Graceful Degradation on API Failure (Steps 3 & 6)**:
   - If the AI API returns `401 Unauthorized` (invalid/expired key), `429 Too Many Requests` (quota exhausted), or times out, the `try/catch` block prevents the server from crashing.
   - Generates an intelligent template suggestion and returns HTTP `200` with `fallback: true`.
   - The user can still proceed with their task management workflow unimpeded.

3. **Editable Suggestion ("Human in the Loop" - Step 5)**:
   - The returned text is populated into an editable textarea. The student has complete control to modify, accept, or reject the AI-generated text.

4. **Supplementary Problem 1: Frontend Loading State**:
   - Shows an animated spinner and disables the generate button while the network request is in flight.

5. **Supplementary Problem 2: Server-Side Rate Limiter**:
   - Implemented in [middleware/rateLimiter.js](file:///d:/REACT-AWDF/prac13/middleware/rateLimiter.js) (sliding window of 60 seconds, max 5 requests per IP) to prevent accidental quota exhaustion or denial-of-service.

6. **Supplementary Problem 3: Responsible AI Disclaimer**:
   - Displays a clear visual banner:  
     `⚠️ AI Disclaimer: The description below is an AI-generated suggestion. Please review and edit before saving.`

---

## 🧠 Key Viva Questions & Responsible AI Analysis

### Q1: Why must the AI API key be called from the backend rather than directly from the React frontend?
> **Answer**:  
> Any code running in the browser (HTML, JavaScript, React components, Network tab) is completely public and accessible to anyone via Chrome DevTools (`F12`). If an API key is stored in frontend code, malicious users can extract it in seconds and drain the owner's billing quota or perform unauthorized API operations.  
> Keeping the key in the backend (`.env`) ensures it never leaves the server's secure execution environment. The client only interacts with our authorized Express endpoints.

### Q2: What does 'graceful degradation' mean in this context, and why does it matter for a feature that depends on a third-party service outside your control?
> **Answer**:  
> **Graceful degradation** is an architectural pattern where an application continues to function in a limited or fallback capacity when an external component fails, rather than completely crashing or freezing the UI.  
> Third-party AI services are subject to outages, latency spikes, rate limits, and billing quotas. Without graceful degradation (e.g. try/catch fallback), an OpenAI outage would completely break the task creation workflow for all users. With graceful degradation, the app seamlessly provides template suggestions and allows manual task entry.

### Q3: What are the privacy and governance implications of sending task data to an external AI API, and what kind of data should never be sent this way?
> **Answer**:  
> When sending data to commercial AI APIs, prompts may be logged, monitored, or processed on external cloud infrastructure.  
> **Data that should NEVER be sent to third-party AI APIs**:
> 1. **Personally Identifiable Information (PII)**: Social Security numbers, phone numbers, home addresses, government IDs.
> 2. **Authentication Secrets**: Passwords, API tokens, cryptographic private keys, session cookies.
> 3. **Proprietary & Protected Data**: Protected Health Information (PHI/HIPAA), confidential client financial data, unreleased intellectual property.

---

## 🚀 Steps to Run

Follow these commands in your terminal to set up, run, and test Practical 13:

### 1. Ensure MongoDB Daemon is Running
```bash
mongod
```
* MongoDB connection string defaults to `mongodb://127.0.0.1:27017/taskdb`

### 2. Configure Environment Variables (Optional for Live Gemini API)
Create or verify `.env` in `prac13/`:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/taskdb
GEMINI_API_KEY=your_gemini_api_key_here
```
*(If no API key is provided, the backend automatically uses its realistic intelligent heuristic mock engine with 0 downtime!)*

### 3. Navigate to Practical Directory
```bash
cd prac13
```

### 4. Install Dependencies
```bash
npm install
```

### 5. Start the Application Server
```bash
npm start
```
* Server starts on: `http://localhost:5000`
* Console confirms:
  ```text
  MongoDB connected successfully
  Server running at http://localhost:5000
  AI Service initialized with timeout: 8000ms
  ```

### 6. Access Interactive Task Management UI
* Open `http://localhost:5000` in your web browser.

---

## 📸 Screenshots to Include in Lab File / Report

Capture and paste the following screenshots into your practical document:

1. **Screenshot 1 - Server Startup & AI Route Initialization**:
   - *Capture*: Terminal window showing `npm start`, MongoDB connection, and AI route registration.
2. **Screenshot 2 - Successful AI Suggestion Generation (Happy Path)**:
   - *Capture*: Browser window at `http://localhost:5000` entering title `"Implement CI/CD pipeline in GitHub"` and clicking `"✨ Generate with AI"`, showing the populated description, priority badge, and AI Disclaimer banner.
3. **Screenshot 3 - Postman Request to `/api/ai/suggest` (HTTP 200)**:
   - *Capture*: Postman executing `POST http://localhost:5000/api/ai/suggest` with `{ "title": "Database indexing" }` showing HTTP `200 OK` and returned JSON `{ "description": "...", "priority": "high", "isAiGenerated": true }`.
4. **Screenshot 4 - Graceful Degradation on API Failure (Step 6 Proof)**:
   - *Capture*: In browser UI, checking **"Simulate AI API Failure"** and clicking `"✨ Generate with AI"`. Capture the fallback alert message demonstrating the app remains fully functional without crashing.
5. **Screenshot 5 - Task Persisted with AI Metadata**:
   - *Capture*: Browser task list showing the newly created task with its distinct purple `[✨ AI-Assisted]` badge.
6. **Screenshot 6 - MongoDB Compass Verification of AI Flags**:
   - *Capture*: MongoDB Compass viewing the `tasks` collection showing the document with `isAiGenerated: true` and `aiModel: "gemini-1.5-flash"`.

#   A W D F _ P R A C T I C A L - 1 3  
 