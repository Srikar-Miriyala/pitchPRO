# demo_streamlit.py
import streamlit as st
import requests
import time
from urllib.parse import urljoin

# ---------- Config ----------
API_BASE = st.secrets.get("API_BASE", "http://127.0.0.1:8000")
POLL_INTERVAL = 1.5  # seconds

st.set_page_config(page_title="PitchPro - Demo", layout="centered")

st.title("PitchPro — MVP Demo")
st.write("Enter a startup idea and generate a pitch deck (PPTX). This demo uses the local mock LLM.")

with st.form("pitch_form"):
    idea = st.text_area("Idea", value="AI-powered micro-loans marketplace for Indian MSMEs", height=120)
    audience = st.selectbox("Audience", ["investors", "customers", "partners"], index=0)
    tone = st.selectbox("Tone", ["professional", "casual", "concise"], index=0)
    use_mock = st.checkbox("Use mock LLM (local)", value=True)
    submitted = st.form_submit_button("Generate Pitch (PPTX)")

if submitted:
    if not idea.strip():
        st.warning("Please enter an idea.")
    else:
        payload = {
            "idea": idea,
            "audience": audience,
            "tone": tone,
            "use_mock_llm": bool(use_mock),
        }
        try:
            with st.spinner("Submitting job..."):
                resp = requests.post(urljoin(API_BASE, "/api/v1/pitches"), json=payload, timeout=10)
                resp.raise_for_status()
                data = resp.json()
                job_id = data.get("job_id")
            if not job_id:
                st.error("Server did not return a job_id. Response: " + str(data))
            else:
                st.success(f"Job queued: {job_id}")
                # Poll status
                status_box = st.empty()
                progress = st.progress(0)
                start = time.time()
                status = None
                for i in range(1, 600):  # safety: limit polling cycles
                    try:
                        sresp = requests.get(urljoin(API_BASE, f"/api/v1/pitches/{job_id}/status"), timeout=10)
                        sresp.raise_for_status()
                        sdata = sresp.json()
                        status = sdata.get("status")
                        status_box.info(f"Status: {status}")
                        # Show download_url if present
                        download_url = sdata.get("download_url")
                        if status == "done":
                            progress.progress(100)
                            status_box.success("Done — pitch generated.")
                            # determine download url: prefer download_url, else construct default
                            if download_url:
                                url = download_url
                                # make absolute if needed
                                if url.startswith("/"):
                                    url = API_BASE.rstrip("/") + url
                            else:
                                # try standard filenames; try pitch_fixed.pptx then pitch.pptx
                                url1 = API_BASE.rstrip("/") + f"/static/output/{job_id}/pitch_fixed.pptx"
                                url2 = API_BASE.rstrip("/") + f"/static/output/{job_id}/pitch.pptx"
                                # Try HEAD on url1 then url2
                                for candidate in (url1, url2):
                                    try:
                                        h = requests.head(candidate, timeout=6)
                                        if h.status_code == 200:
                                            url = candidate
                                            break
                                    except Exception:
                                        continue
                                else:
                                    url = None
                            if url:
                                st.write("Download PPTX:")
                                # Fetch file bytes
                                try:
                                    file_bytes = requests.get(url, timeout=30).content
                                    filename = url.split("/")[-1]
                                    st.download_button("Download PPTX", data=file_bytes, file_name=filename, mime="application/vnd.openxmlformats-officedocument.presentationml.presentation")
                                    st.write(f"Direct link: [{filename}]({url})")
                                except Exception as e:
                                    st.error(f"Could not fetch PPTX from {url}: {e}")
                                    st.write(f"Try opening this URL in a browser: {url}")
                            else:
                                st.warning("No downloadable PPTX found on server. Check output/<job_id> folder.")
                            break
                        elif status == "processing":
                            # update progress bar lightly
                            elapsed = time.time() - start
                            pct = min(95, int(min(90, elapsed) / 10 * 100))
                            progress.progress(pct)
                        elif status == "error":
                            status_box.error(f"Job errored: {sdata.get('error')}")
                            break
                    except Exception as e:
                        status_box.error(f"Error polling status: {e}")
                        break
                    time.sleep(POLL_INTERVAL)
                else:
                    status_box.error("Polling timed out.")
        except Exception as e:
            st.exception(e)

st.markdown("---")
st.caption(f"API base: {API_BASE} — ensure your FastAPI server is running and static files are mounted at /static/output/")
