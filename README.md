# 🚀 PitchPro AI — Intelligent Pitch Deck Generator

PitchPro AI is an advanced AI-powered platform that transforms business ideas into comprehensive investor-ready pitch decks within minutes. The system automatically generates complete presentations including financial projections, budget breakdowns, revenue models, and professional slides tailored to your specific industry.

---

## 🧩 Key Features

- **🎯 Smart Business Detection** - Automatically classifies your idea (Tech, Manufacturing, Healthcare, etc.) and generates industry-specific content
- **📊 Realistic Financial Modeling** - Creates 3-year financial projections with Indian market context and rupee-based budgeting
- **🎨 Professional Presentations** - Generates complete PowerPoint decks with structured slides and speaker notes
- **💼 Industry-Specific Templates** - Customized budget breakdowns and profit models for different business types
- **⚡ Real-time Processing** - Live progress tracking with WebSocket-based status updates
- **📥 Instant Downloads** - Direct PPTX download with professionally formatted slides
- **🌐 Multi-Audience Support** - Tailors content for investors, customers, or partners

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-------------|
| **Frontend** | React.js, Vite, Modern CSS with Glass-morphism UI |
| **Backend** | FastAPI, Python 3.11+ |
| **AI/ML** | Google Gemini API, Advanced Prompt Engineering |
| **Processing** | Async Background Jobs, RESTful APIs |
| **Document Generation** | python-pptx |
| **Styling** | Custom CSS, Gradient Designs, Responsive Layout |

---


### Core Workflow:
1. **Idea Submission** - User describes business idea through React interface
2. **AI Analysis** - Gemini API processes idea and generates structured JSON content
3. **Business Classification** - Smart detection of business type for tailored content
4. **Financial Modeling** - Automatic generation of realistic revenue/cost projections
5. **Slide Assembly** - Dynamic PowerPoint creation with professional formatting
6. **Real-time Updates** - Live progress tracking during generation process

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 16+
- Google Gemini API Key

### Installation

1. **Clone Repository**
```bash
git clone https://github.com/your-username/pitchpro-ai.git
cd pitchpro-ai

cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set environment variables
export GEMINI_API_KEY="your-api-key"
export GEMINI_MODEL="gemini-1.5-flash"

uvicorn main:app --reload --port 8000

cd frontend
npm install
npm run dev

```
**Access Application**
```
Frontend: http://localhost:5173

Backend API: http://localhost:8000

API Docs: http://localhost:8000/docs
```

🔧 Configuration
Environment Variables

# Backend
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
VITE_API_BASE=http://localhost:8000

# Frontend
VITE_API_BASE=http://localhost:8000

## 🏗️ System Architecture
