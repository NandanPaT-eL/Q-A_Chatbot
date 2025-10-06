import os
import re
import shutil
import tempfile
import warnings
from typing import List

from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from dotenv import load_dotenv  # ✅ Add this line

from langchain_community.document_loaders import Docx2txtLoader, PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_groq.chat_models import ChatGroq
from langchain.prompts import ChatPromptTemplate
from langchain.schema.runnable import RunnableLambda
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
from fastapi.middleware.cors import CORSMiddleware

# ==============================
# Environment Setup
# ==============================
load_dotenv()  # ✅ Load .env file automatically

os.environ["TOKENIZERS_PARALLELISM"] = "false"

# ✅ Fetch secrets from .env
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
HUGGINGFACE_API_TOKEN = os.getenv("HUGGINGFACE_API_TOKEN")

if not GROQ_API_KEY or not HUGGINGFACE_API_TOKEN:
    raise ValueError("❌ Missing API credentials! Check your .env file.")

os.environ["GROQ_API_KEY"] = GROQ_API_KEY
os.environ["HUGGINGFACEHUB_API_TOKEN"] = HUGGINGFACE_API_TOKEN

# Suppress warnings
warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=FutureWarning)

# ==============================
# FastAPI App
# ==============================
app = FastAPI(title="📖 Student Book Q&A Chatbot Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # change to ["http://localhost:3000"] for local React
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================
# Globals
# ==============================
chat_history: List[tuple] = []
rag_chain = None

# ==============================
# Translation Setup
# ==============================
LANG_MODEL_MAP = {
    "English": None,
    "Hindi": "Helsinki-NLP/opus-mt-en-hi",
    "Spanish": "Helsinki-NLP/opus-mt-en-es",
    "French": "Helsinki-NLP/opus-mt-en-fr",
    "German": "Helsinki-NLP/opus-mt-en-de",
    "Chinese": "Helsinki-NLP/opus-mt-en-zh",
    "Japanese": "Helsinki-NLP/opus-mt-en-ja"
}

TRANSLATION_CACHE = {}

def get_translation_model(target_lang):
    if target_lang == "English":
        return None
    if target_lang not in TRANSLATION_CACHE:
        model_name = LANG_MODEL_MAP[target_lang]
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
        TRANSLATION_CACHE[target_lang] = (tokenizer, model)
    return TRANSLATION_CACHE[target_lang]

def translate_text(text, source_lang, target_lang):
    if source_lang == target_lang or not text.strip():
        return text
    try:
        if target_lang == "English":
            model_name = "Helsinki-NLP/opus-mt-mul-en"
            if model_name not in TRANSLATION_CACHE:
                tokenizer = AutoTokenizer.from_pretrained(model_name)
                model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
                TRANSLATION_CACHE[model_name] = (tokenizer, model)
            tokenizer, model = TRANSLATION_CACHE[model_name]
        else:
            tokenizer, model = get_translation_model(target_lang)
        inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
        outputs = model.generate(inputs["input_ids"], max_length=512, num_beams=4, early_stopping=True)
        return tokenizer.decode(outputs[0], skip_special_tokens=True)
    except Exception:
        return text

def translate_to_en(text, source_lang):
    return text if source_lang == "English" else translate_text(text, source_lang, "English")

def translate_from_en(text, target_lang):
    return text if target_lang == "English" else translate_text(text, "English", target_lang)

# ==============================
# Helper Functions
# ==============================
def docs2str(docs):
    return "\n".join(doc.page_content.strip() for doc in docs)

def format_history():
    return "\n".join([f"User: {u}\nBot: {b}" for u, b in chat_history]) or "No previous conversation."

def build_rag_chain(file_path):
    global rag_chain

    loader = Docx2txtLoader(file_path) if file_path.endswith(".docx") else PyPDFLoader(file_path)
    documents = loader.load()

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1500, chunk_overlap=500)
    splits = text_splitter.split_documents(documents)

    embedding_function = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    chroma_dir = os.path.join(tempfile.mkdtemp(), "chroma_db")
    vectorstore = Chroma.from_documents(
        collection_name="student_book_rag",
        documents=splits,
        embedding=embedding_function,
        persist_directory=chroma_dir
    )
    retriever = vectorstore.as_retriever(search_kwargs={"k": 8})

    llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0.1, max_tokens=2048)

    template = """
You are a helpful study assistant for students.
The student uploaded a book, and you will answer based on it.

Conversation so far:
{history}

When answering:
- Do NOT copy text word-for-word from the book. Rephrase clearly.
- Explain concepts in a simple way as if teaching a student.
- Keep answers concise but informative.
- Use numbered points for lists.
- Be friendly, professional, and encouraging.

Context from the book:
{context}

Student Question: {question}

Your Helpful Answer:
"""
    prompt = ChatPromptTemplate.from_template(template)

    rag_chain = (
        {
            "context": RunnableLambda(lambda x: retriever.get_relevant_documents(x["question"])) | RunnableLambda(docs2str),
            "question": RunnableLambda(lambda x: x["question"]),
            "history": RunnableLambda(lambda x: x["history"]),
        }
        | prompt
        | llm
    )

    return rag_chain

# ==============================
# Request Models
# ==============================
class QuestionRequest(BaseModel):
    question: str
    language: str = "English"

# ==============================
# API Endpoints
# ==============================
@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    contents = await file.read()
    temp_dir = tempfile.mkdtemp()
    file_path = os.path.join(temp_dir, file.filename)
    with open(file_path, "wb") as f:
        f.write(contents)
    build_rag_chain(file_path)
    return {"message": f"{file.filename} uploaded and processed successfully!"}

@app.post("/ask")
async def ask_question(req: QuestionRequest):
    global chat_history, rag_chain
    if rag_chain is None:
        return {"error": "No book uploaded yet."}

    question_en = translate_to_en(req.question, req.language)

    casual_patterns = {
        r"\b(hello|hi|hey)\b": "Hello! 👋 Ask me anything about the book.",
        r"\b(thank you|thanks|tysm|thx)\b": "You're welcome! Happy studying 📚",
        r"\b(bye|goodbye|see you|exit|quit|farewell)\b": "Goodbye 👋 Come back anytime!"
    }

    answer_en = next((resp for pat, resp in casual_patterns.items() if re.search(pat, question_en.lower())), None)

    if not answer_en:
        answer_en = rag_chain.invoke({
            "question": question_en,
            "history": format_history()
        }).content

    answer_display = translate_from_en(answer_en, req.language)
    chat_history.append((question_en, answer_en))
    return {"answer": answer_display, "history": chat_history}
