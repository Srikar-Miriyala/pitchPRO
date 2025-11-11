// components/IdeaForm.jsx
import React from "react";
import axios from "axios";

export default function IdeaForm({ onJobCreated }){
  const [idea, setIdea] = React.useState("");
  const [audience, setAudience] = React.useState("investors");
  const [tone, setTone] = React.useState("professional");
  const [loading, setLoading] = React.useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

  async function submitIdea(){
    if (!idea.trim()) return alert("Please enter an idea.");
    setLoading(true);
    onJobCreated(null);

    try {
      const resp = await axios.post(`${API_BASE}/api/v1/pitches`, {
        idea, audience, tone
      }, { timeout: 60000 }); // Increased timeout for real generation
      
      const data = resp.data;
      onJobCreated({ job_id: data.job_id, status: data.status });
    } catch(err){
      console.error(err);
      alert("Failed to submit job: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="neon-input-wrapper">
        <textarea
          className="neon-textarea"
          placeholder="Type what's in your mind — e.g. 'AI-powered micro-loans marketplace for Indian MSMEs'..."
          value={idea}
          onChange={(e)=>setIdea(e.target.value)}
        />
      </div>

      <div className="controls">
        <select className="select" value={audience} onChange={(e)=>setAudience(e.target.value)}>
          <option value="investors">Investors</option>
          <option value="customers">Customers</option>
          <option value="partners">Partners</option>
        </select>

        <select className="select" value={tone} onChange={(e)=>setTone(e.target.value)}>
          <option value="professional">Professional</option>
          <option value="casual">Casual</option>
          <option value="concise">Concise</option>
          <option value="visionary">Visionary</option>
          <option value="enthusiastic">Enthusiastic</option>
        </select>

        <button className="btn-neon" onClick={submitIdea} disabled={loading}>
          {loading ? "Generating Pitch Deck…" : "Generate Pitch Deck"}
        </button>
      </div>
    </div>
  );
}