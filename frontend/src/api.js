import axios from "axios";

// ✅ Auto-switch between local and deployed backend
const API_BASE =
  process.env.NODE_ENV === "production"
    ? import.meta.env.VITE_API_URL
    : "http://127.0.0.1:8000"; // Local FastAPI backend

// 🧠 Ask a question
export async function askQuestion(question, language) {
  try {
    const res = await axios.post(`${API_BASE}/ask`, { question, language });
    return res.data.answer;
  } catch (err) {
    console.error("❌ Error in askQuestion:", err);
    return "⚠️ Unable to get response from the server.";
  }
}

// 📚 Upload a book file
export async function uploadFile(file) {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await axios.post(`${API_BASE}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    // Return true if server responded successfully
    return res.data.message ? true : false;
  } catch (err) {
    console.error("❌ Error in uploadFile:", err);
    return false;
  }
}

console.log("📡 Using backend:", API_BASE);
