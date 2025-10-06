import os
import re
import shutil
import tempfile
import warnings

import streamlit as st
import pypdf
from langchain_community.document_loaders import Docx2txtLoader, PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_groq.chat_models import ChatGroq
from langchain.prompts import ChatPromptTemplate
from langchain.schema.runnable import RunnableLambda
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

os.environ["STREAMLIT_WATCHDOG"] = "0"

# ==============================
# Setup
# ==============================
os.environ["TOKENIZERS_PARALLELISM"] = "false"
os.environ["GROQ_API_KEY"] = "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"
os.environ["HUGGINGFACEHUB_API_TOKEN"] = "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"

warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=FutureWarning)

st.set_page_config(page_title="📚 Student Book Q&A", layout="wide")

# ==============================
# Session State
# ==============================
if "chat_history" not in st.session_state:
    st.session_state.chat_history = []  # store in English

if "rag_chain" not in st.session_state:
    st.session_state.rag_chain = None

if "has_greeted" not in st.session_state:
    st.session_state.has_greeted = False

if "language" not in st.session_state:
    st.session_state.language = None

# ==============================
# Translation Models - Improved
# ==============================
LANG_MODEL_MAP = {
    "English": None,  # no translation
    "Hindi": "Helsinki-NLP/opus-mt-en-hi",
    "Spanish": "Helsinki-NLP/opus-mt-en-es",
    "French": "Helsinki-NLP/opus-mt-en-fr",
    "German": "Helsinki-NLP/opus-mt-en-de",
    "Chinese": "Helsinki-NLP/opus-mt-en-zh",
    "Japanese": "Helsinki-NLP/opus-mt-en-ja"
}

# Cache for translation models
TRANSLATION_CACHE = {}


def get_translation_model(target_lang):
    """Get or load translation model for target language"""
    if target_lang == "English":
        return None

    if target_lang not in TRANSLATION_CACHE:
        try:
            model_name = LANG_MODEL_MAP[target_lang]
            tokenizer = AutoTokenizer.from_pretrained(model_name)
            model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
            TRANSLATION_CACHE[target_lang] = (tokenizer, model)
        except Exception as e:
            st.error(f"❌ Failed to load translation model for {target_lang}: {e}")
            return None
    return TRANSLATION_CACHE[target_lang]


def translate_text(text, source_lang, target_lang):
    """Translate text between languages with error handling"""
    if source_lang == target_lang or not text.strip():
        return text

    try:
        # For non-English to English translation
        if target_lang == "English":
            model_name = "Helsinki-NLP/opus-mt-mul-en"
            if model_name not in TRANSLATION_CACHE:
                tokenizer = AutoTokenizer.from_pretrained(model_name)
                model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
                TRANSLATION_CACHE[model_name] = (tokenizer, model)
            tokenizer, model = TRANSLATION_CACHE[model_name]
        else:
            # English to other languages
            translator = get_translation_model(target_lang)
            if translator is None:
                return text
            tokenizer, model = translator

        # Tokenize and translate
        inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
        outputs = model.generate(
            inputs["input_ids"],
            max_length=512,
            num_beams=4,
            early_stopping=True
        )
        translated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
        return translated_text

    except Exception as e:
        st.error(f"❌ Translation error ({source_lang}→{target_lang}): {e}")
        return text  # Return original text on error


def translate_to_en(text, source_lang):
    """Translate any language to English"""
    if source_lang == "English":
        return text
    return translate_text(text, source_lang, "English")


def translate_from_en(text, target_lang):
    """Translate English to target language"""
    if target_lang == "English":
        return text
    return translate_text(text, "English", target_lang)


# ==============================
# Helper Functions
# ==============================
def docs2str(docs):
    return "\n".join(doc.page_content.strip() for doc in docs)


def format_history():
    """Return English history for RAG chain."""
    return "\n".join([f"User: {u}\nBot: {b}" for u, b in st.session_state.chat_history]) or "No previous conversation."


def build_rag_chain(uploaded_file):
    temp_dir = tempfile.mkdtemp()
    file_path = os.path.join(temp_dir, uploaded_file.name)

    # Save file locally
    with open(file_path, "wb") as f:
        f.write(uploaded_file.getbuffer())

    # Load document
    if uploaded_file.name.endswith(".docx"):
        loader = Docx2txtLoader(file_path)
    elif uploaded_file.name.endswith(".pdf"):
        loader = PyPDFLoader(file_path)
    else:
        st.error("❌ Only PDF or DOCX supported right now.")
        return None

    documents = loader.load()

    # Split text
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1500,
        chunk_overlap=500,
        length_function=len
    )
    splits = text_splitter.split_documents(documents)

    # Embeddings
    embedding_function = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

    # Chroma DB
    chroma_dir = os.path.join(temp_dir, "chroma_db")
    if os.path.exists(chroma_dir):
        shutil.rmtree(chroma_dir)

    vectorstore = Chroma.from_documents(
        collection_name="student_book_rag",
        documents=splits,
        embedding=embedding_function,
        persist_directory=chroma_dir
    )

    retriever = vectorstore.as_retriever(search_kwargs={"k": 8})

    # LLM
    llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0.1, max_tokens=2048)

    # Prompt
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
                "context": RunnableLambda(lambda x: retriever.get_relevant_documents(x["question"])) | RunnableLambda(
                    docs2str),
                "question": RunnableLambda(lambda x: x["question"]),
                "history": RunnableLambda(lambda x: x["history"]),
            }
            | prompt
            | llm
    )

    return rag_chain


# ==============================
# UI
# ==============================
st.title("📖 Student Book Q&A Chatbot")
st.write("Upload a book (PDF/DOCX) and ask any questions about it.")

# Language Selection
if st.session_state.language is None:
    st.session_state.language = st.selectbox(
        "🌐 Select your preferred language for conversation:",
        options=list(LANG_MODEL_MAP.keys())
    )

uploaded_file = st.file_uploader("📂 Upload your book", type=["pdf", "docx"])

if uploaded_file:
    if st.session_state.rag_chain is None:
        with st.spinner("🔍 Processing book... Please wait."):
            st.session_state.rag_chain = build_rag_chain(uploaded_file)
        st.success("✅ Book processed successfully! You can now ask questions.")

    # Show greeting once
    if not st.session_state.has_greeted:
        greeting_en = "Hello! I'm your Study Assistant. Ask me anything about the uploaded book."
        greeting_display = translate_from_en(greeting_en, st.session_state.language)
        st.session_state.chat_history.append(("", greeting_en))  # stored in English
        st.session_state.has_greeted = True
        st.markdown(
            f"<div style='padding:8px; border-radius:5px; margin-bottom:8px;'><b>🤖 Assistant:</b> {greeting_display}</div>",
            unsafe_allow_html=True)

    # Display chat history in selected language
    chat_display = []
    for q, a in st.session_state.chat_history:
        # Display user question in selected language (translate if necessary)
        if st.session_state.language == "English":
            user_display = q
        else:
            user_display = translate_from_en(q, st.session_state.language) if q else ""

        # Display assistant answer in selected language
        if st.session_state.language == "English":
            assistant_display = a
        else:
            assistant_display = translate_from_en(a, st.session_state.language)

        if q:  # Only show user message if there's content
            chat_display.append(
                f"<div style='padding:8px; border-radius:5px; margin-bottom:4px;'><b>👨‍🎓 Student:</b> {user_display}</div>")
        if a:  # Only show assistant message if there's content
            chat_display.append(
                f"<div style='padding:8px; border-radius:5px; margin-bottom:8px;'><b>🤖 Assistant:</b> {assistant_display}</div>")

    # Render chat
    st.markdown("\n".join(chat_display), unsafe_allow_html=True)

    # Chat input
    with st.form(key="chat_form", clear_on_submit=True):
        question = st.text_input("💬 Type your question here:")
        submit_button = st.form_submit_button("Send")

    if submit_button and question:
        # Translate question to English for processing
        question_en = question
        if st.session_state.language != "English":
            question_en = translate_to_en(question, st.session_state.language)

        # Handle casual messages
        casual_patterns = {
            r"\b(hello|hi|hey)\b": "Hello! 👋 Ask me anything about the book.",
            r"\b(thank you|thanks|tysm|thx)\b": "You're welcome! Happy studying 📚",
            r"\b(bye|goodbye|see you|exit|quit|farewell)\b": "Goodbye 👋 Come back anytime!"
        }

        answer_en = None
        for pattern, response in casual_patterns.items():
            if re.search(pattern, question_en.lower()):
                answer_en = response
                break

        # Call RAG chain if not casual
        if answer_en is None:
            try:
                raw_response = st.session_state.rag_chain.invoke({
                    "question": question_en,
                    "history": format_history()
                })
                answer_en = raw_response.content
            except Exception as e:
                answer_en = f"❌ Error: {e}"

        # Store in English history
        st.session_state.chat_history.append((question_en, answer_en))

        # Force rerun to update display
        st.rerun()

    # Auto-scroll
    st.markdown("<script>window.scrollTo(0, document.body.scrollHeight);</script>", unsafe_allow_html=True)