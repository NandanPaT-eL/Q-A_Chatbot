import axios from "axios";

const API_BASE = "http://localhost:8000"; // FastAPI backend URL

// Ask a question
export async function askQuestion(question, language) {
  try {
    const res = await axios.post(`${API_BASE}/ask`, { question, language });
    return res.data.answer;
  } catch (err) {
    console.error(err);
    return "❌ Error: Unable to get response.";
  }
}

// Upload a book file
export async function uploadFile(file) {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const res = await axios.post(`${API_BASE}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    // Check if message exists in response
    return res.data.message ? true : false;
  } catch (err) {
    console.error(err);
    return false;
  }
}

