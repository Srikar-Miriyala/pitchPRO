# 🚀 PitchPro — AI Startup Pitch Generator

PitchPro is an AI-powered tool that converts any startup idea into a complete investor-ready pitch deck (PPTX/PDF) including executive summary, financial projections, and investor Q&A.

---

## 🧩 Features
- **Idea-to-Deck Generation:** Input your startup idea, get a structured pitch deck.
- **LLM-Powered Content:** Uses multi-step LangChain orchestration with Gemini/OpenAI APIs.
- **Financial Model Generator:** Automatically creates 3-year revenue projections.
- **Downloadable PPTX:** Built dynamically using `python-pptx`.
- **Slide Regeneration:** Edit or regenerate specific slides on demand.
- **Async Background Processing:** Job queue with progress tracking (Redis + RQ).

---

## 🛠️ Tech Stack
| Layer | Technology |
|-------|-------------|
| Backend | FastAPI |
| AI Orchestration | LangChain + Gemini API |
| Frontend | Streamlit / React |
| Task Queue | Redis + RQ |
| PPT Export | python-pptx |
| Deployment | Docker + Vercel / Render |

---

## 🧠 Architecture Overview
```mermaid
flowchart LR
User -->|idea text| API
API --> Queue
Queue --> Worker
Worker -->|LLM Orchestration| PPTBuilder
PPTBuilder --> S3[(Output Storage)]
S3 -->|Download| User
