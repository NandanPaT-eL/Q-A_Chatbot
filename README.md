# RAG-based Student Study Assistant Chatbot

## Overview
This project implements a Retrieval-Augmented Generation (RAG) based chatbot for students.  
It allows students to upload study materials (PDF/DOCX) and ask questions in natural language.  

By combining document retrieval with Large Language Models (LLMs), the chatbot provides concise, student-friendly explanations.  
Additionally, the system can translate answers into any language selected by the user, making it accessible to students from diverse backgrounds.  

---

## Features
- Upload study material (PDF/DOCX)  
- Ask questions in natural language  
- Retrieves relevant content using embeddings & vector database  
- Generates clear explanations using LLMs  
- Supports multi-language translation of answers  
- Maintains chat history for context-aware responses  
- Streamlit-based UI (current) → Will be migrated to MERN-based website (next phase)  

---

## System Architecture

<img width="3840" height="1347" alt="Untitled diagram _ Mermaid Chart-2025-10-01-183727" src="https://github.com/user-attachments/assets/1b7874d4-751a-4676-87a2-e21f67006eb2" />


---

## Problem Statement
Students often struggle to search through large textbooks and understand complex concepts quickly. Traditional search is inefficient, and explanations are not student-friendly.

---

## Objectives
- Build a chatbot that processes PDF/DOCX study material.  
- Allow students to ask questions naturally.  
- Provide concise, easy-to-understand explanations.  
- Enable multi-language support for accessibility.  

---

## Tech Stack

### Current Implementation (Streamlit App)
- Frontend/UI: Streamlit  
- Backend: Python  
- Document Processing: PyPDFLoader, Docx2txtLoader  
- Text Splitting: RecursiveCharacterTextSplitter  
- Embeddings: HuggingFace (all-MiniLM-L6-v2)  
- Vector Database: ChromaDB  
- LLM: Groq (LLaMA 3.3–70B)  
- Language Translation: HuggingFace MarianMT / M2M100  

### Next Phase (MERN Website)
- Frontend: React.js (Next.js optional)  
- Backend: Node.js + Express  
- Database: MongoDB (for storing user data, chat history, preferences)  
- File Handling: Multer / GridFS (for PDF/DOCX uploads)  
- RAG Pipeline Integration: Python FastAPI/Flask microservice for NLP tasks  
- LLM API: Groq or OpenAI as backend service  
- Translation API: HuggingFace or Google Translate API  

---

## Installation & Setup

### 1. Clone Repository
```bash
git clone https://github.com/your-username/rag-student-chatbot.git
cd rag-student-chatbot
```

### 2. Create Virtual Environment
```bash
python -m venv venv
source venv/bin/activate   # On Linux/Mac
venv\Scripts\activate      # On Windows
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Environment Variables
Create a `.env` file and add:
```env
GROQ_API_KEY=your_groq_api_key
HUGGINGFACEHUB_API_TOKEN=your_huggingface_api_key
```

### 5. Run Streamlit App
```bash
streamlit run app.py
```

---

## Future Work (MERN Website)
- [ ] Develop React frontend for a modern UI  
- [ ] Build Node.js + Express backend for handling requests  
- [ ] Connect with MongoDB for persistent chat history  
- [ ] Integrate Python microservice for RAG pipeline  
- [ ] Add voice input/output for interactive learning  
- [ ] Deploy to cloud (AWS/GCP/Render/Vercel)  

---

## Expected Outcomes
- Faster learning and better understanding of study materials  
- Multi-language accessibility for diverse students  
- Interactive Q&A experience with context awareness  

---

## Authors
- Nandan Patel (12202040501046)  
- Nirjari Bhatt (12202040501047)  

---

## Subject
Natural Language Processing (NLP) – Academic Project  

---
