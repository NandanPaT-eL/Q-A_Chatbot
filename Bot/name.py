import os
import re
import shutil
import tempfile
import warnings

import streamlit as st
from langchain_community.document_loaders import Docx2txtLoader, PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.embeddings import HuggingFaceEmbeddings
from langchain.vectorstores import Chroma
from langchain_groq.chat_models import ChatGroq
from langchain.prompts import ChatPromptTemplate
from langchain.schema.runnable import RunnableLambda

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
    st.session_state.chat_history = []

if "rag_chain" not in st.session_state:
    st.session_state.rag_chain = None

if "has_greeted" not in st.session_state:
    st.session_state.has_greeted = False

# ==============================
# Helper Functions
# ==============================
def docs2str(docs):
    return "\n".join(doc.page_content.strip() for doc in docs)

def format_history():
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
            "context": RunnableLambda(lambda x: retriever.get_relevant_documents(x["question"])) | RunnableLambda(docs2str),
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

uploaded_file = st.file_uploader("📂 Upload your book", type=["pdf", "docx"])

if uploaded_file:
    if st.session_state.rag_chain is None:
        with st.spinner("🔍 Processing book... Please wait."):
            st.session_state.rag_chain = build_rag_chain(uploaded_file)
        st.success("✅ Book processed successfully! You can now ask questions.")

    # Show greeting once
    if not st.session_state.has_greeted:
        st.session_state.chat_history.append(
            ("", "👋 Hello! I'm your Study Assistant. Ask me anything about the uploaded book.")
        )
        st.session_state.has_greeted = True

    # Placeholder for dynamic chat display
    chat_placeholder = st.empty()

    # Chat input in a form to prevent flash
    with st.form(key="chat_form", clear_on_submit=True):
        question = st.text_input("💬 Type your question here:")
        submit_button = st.form_submit_button("Send")

    if submit_button and question:
        # Handle casual messages
        casual_patterns = {
            r"\b(hello|hi|hey)\b": "Hello! 👋 Ask me anything about the book.",
            r"\b(thank you|thanks|tysm|thx)\b": "You're welcome! Happy studying 📚",
            r"\b(bye|goodbye|see you|exit|quit|farewell)\b": "Goodbye 👋 Come back anytime!"
        }

        answer = None
        for pattern, response in casual_patterns.items():
            if re.search(pattern, question.lower()):
                answer = response
                break

        # Call RAG chain if not casual
        if answer is None:
            try:
                raw_response = st.session_state.rag_chain.invoke({
                    "question": question,
                    "history": format_history()
                })
                answer = raw_response.content
            except Exception as e:
                answer = f"❌ Error: {e}"

        # Append question & answer once
        st.session_state.chat_history.append((question, answer))

    # Display full chat
    chat_placeholder.markdown(
        "\n".join([
            f"<div style='padding:8px; border-radius:5px; margin-bottom:4px;'><b>👨‍🎓 Student:</b> {u}</div>"
            f"<div style='padding:8px; border-radius:5px; margin-bottom:8px;'><b>🤖 Assistant:</b> {b}</div>"
            for u, b in st.session_state.chat_history
        ]),
        unsafe_allow_html=True
    )

    # Auto-scroll
    st.markdown("<script>window.scrollTo(0, document.body.scrollHeight);</script>", unsafe_allow_html=True)
