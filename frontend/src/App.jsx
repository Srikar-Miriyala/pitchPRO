import React from "react";
import IdeaForm from "./components/IdeaForm";
import ResultsPanel from "./components/ResultsPanel";

export default function App(){
  const [job, setJob] = React.useState(null);

  return (
    <div>
      <header className="app-header">
        <img className="logo" src="/logo.svg" alt="PitchPro" />
        <div style={{display:"flex", flexDirection:"column"}}>
          <div style={{fontWeight:700, color:"white"}}>PitchPro</div>
          <div style={{color:"rgba(255,255,255,0.55)", fontSize:12}}>Idea → Research → Budget → Presentation</div>
        </div>
      </header>

      <main className="stage">
        <div className="neon-card">
          <div className="h1">Type what’s in your mind…</div>
          <div className="hint">Describe the idea briefly — PitchPro will analyze and prepare a professional deck.</div>

          <IdeaForm onJobCreated={setJob} />

          <div className={`output-area ${job ? "show" : ""}`} style={{display: job ? "block" : "none"}}>
            {job && <ResultsPanel job={job} />}
          </div>
        </div>
      </main>
    </div>
  );
}
