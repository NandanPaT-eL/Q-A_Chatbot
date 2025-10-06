import React, { useState, useRef, useEffect } from "react";
import { askQuestion, uploadFile } from "./api";
import { Upload, Loader2, FileText, Mic, MicOff, Send, Bot, User, Languages, X, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function App() {
  const [chat, setChat] = useState([]);
  const [language, setLanguage] = useState("English");
  const [waiting, setWaiting] = useState(false);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [recording, setRecording] = useState(false);
  const [micError, setMicError] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Scroll to bottom when chat updates
  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(scrollToBottom, [chat]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      setMicError("Speech Recognition not supported in this browser.");
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setRecording(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputValue(transcript);
      handleSend(transcript);
    };
    recognition.onerror = (err) => {
      console.error(err);
      setMicError("Speech recognition failed. Try again.");
      setRecording(false);
    };
    recognition.onend = () => setRecording(false);

    recognitionRef.current = recognition;
    return () => recognition.stop();
  }, []);

  // Send question to API
  const handleSend = async (question) => {
    if (!question.trim()) return;
    setChat((prev) => [...prev, { type: "user", message: question }]);
    setWaiting(true);
    setInputValue("");
    setIsTyping(true);

    try {
      const answer = await askQuestion(question, language);
      // Simulate typing delay for rich experience
      setTimeout(() => {
        setChat((prev) => [
          ...prev,
          { type: "bot", message: answer || "No response received." },
        ]);
        setWaiting(false);
        setIsTyping(false);
      }, 800);
    } catch (err) {
      setChat((prev) => [
        ...prev,
        { type: "bot", message: "Error: Failed to fetch response." },
      ]);
      setWaiting(false);
      setIsTyping(false);
    }
  };

  // Handle file upload
  const processFile = async (file) => {
    if (!file) return;
    setUploading(true);
    const success = await uploadFile(file);
    setUploading(false);
    if (success) {
      setFileUploaded(true);
      setUploadedFileName(file.name);
    } else {
      setFileUploaded(false);
      setUploadedFileName("");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    processFile(e.dataTransfer.files[0]);
  };

  // Toggle microphone recording
  const toggleRecording = () => {
    if (micError) {
      setMicError(micError);
      setTimeout(() => setMicError(null), 3000);
      return;
    }
    if (!recognitionRef.current) return;
    recording ? recognitionRef.current.stop() : recognitionRef.current.start();
  };

  const handleSubmit = () => {
    if (inputValue.trim()) {
      handleSend(inputValue);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  const textareaRef = useRef(null);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="p-6 border-b border-white/10 bg-gradient-to-r from-white/5 to-white/2 backdrop-blur-xl">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-400 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/30">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-green-400 to-cyan-400 rounded-full border-2 border-slate-900 shadow-lg"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">
                  Edura AI
                </h1>
                <p className="text-gray-300 text-sm font-light">
                  Intelligent document analysis powered by AI
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-2xl px-4 py-2 border border-white/10">
              <Languages className="w-4 h-4 text-cyan-400" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
              >
                {["English", "Hindi", "Spanish", "French", "German", "Chinese", "Japanese"].map(
                  (lang) => (
                    <option key={lang} value={lang} className="bg-slate-800">
                      {lang}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full p-6 gap-6 overflow-hidden">
          {/* File Upload Section */}
          {!fileUploaded && (
            <div
              className={`relative group transition-all duration-500 ${
                dragOver ? 'scale-105' : 'scale-100'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500 opacity-0 group-hover:opacity-100"></div>
              <div
                className={`relative p-12 border-2 border-dashed rounded-3xl backdrop-blur-xl bg-white/5 transition-all duration-500 ${
                  dragOver
                    ? "border-cyan-400 bg-cyan-500/10 scale-105"
                    : "border-white/20 hover:border-cyan-400/50 hover:bg-white/10"
                }`}
              >
                {uploading ? (
                  <div className="flex flex-col items-center text-center">
                    <div className="relative mb-6">
                      <Loader2 className="w-16 h-16 text-cyan-400 animate-spin" />
                      <div className="absolute inset-0 bg-cyan-400/20 rounded-full blur-lg"></div>
                    </div>
                    <p className="text-white font-semibold text-lg mb-2">Processing Document</p>
                    <p className="text-gray-400">Your file is being analyzed...</p>
                  </div>
                ) : (
                  <>
                    <div className="text-center mb-8">
                      <div className="relative inline-block mb-6">
                        <div className="w-24 h-24 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                          <Upload className="w-10 h-10 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-green-400 to-cyan-400 rounded-full flex items-center justify-center shadow-lg">
                          <Sparkles className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-3">
                        Upload Your Document
                      </h2>
                      <p className="text-gray-300 text-lg mb-6 max-w-md mx-auto">
                        Drag & drop or{" "}
                        <label className="text-cyan-400 cursor-pointer font-semibold hover:text-cyan-300 transition-colors">
                          choose file
                          <input
                            type="file"
                            accept=".pdf,.docx,.txt"
                            className="hidden"
                            onChange={(e) => processFile(e.target.files[0])}
                          />
                        </label>{" "}
                        to begin intelligent analysis
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                      {[
                        { icon: "📄", text: "PDF Documents" },
                        { icon: "📝", text: "Word Files" },
                        { icon: "🔍", text: "Smart Analysis" }
                      ].map((item, index) => (
                        <div key={index} className="text-center p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-cyan-400/30 transition-all duration-300 group/item">
                          <div className="text-2xl mb-2 group-hover/item:scale-110 transition-transform">{item.icon}</div>
                          <p className="text-gray-300 text-sm">{item.text}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* File Uploaded Indicator */}
          {fileUploaded && (
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-cyan-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative flex justify-between items-center p-6 backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 group-hover:border-green-400/30 transition-all duration-300">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-cyan-400 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/20">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-lg">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <div>
                    <p className="text-white font-semibold text-lg">{uploadedFileName}</p>
                    <p className="text-green-400 font-medium flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      Ready for analysis
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setFileUploaded(false);
                    setUploadedFileName("");
                    setChat([]);
                  }}
                  className="p-3 bg-white/5 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-2xl transition-all duration-300 border border-white/10 hover:border-red-400/30 group/button"
                >
                  <X className="w-5 h-5 group-hover/button:scale-110 transition-transform" />
                </button>
              </div>
            </div>
          )}

          {/* Chat Container */}
          <div className="flex-1 flex flex-col overflow-hidden backdrop-blur-xl bg-white/5 rounded-3xl border border-white/10 shadow-2xl">
            {/* Chat Header */}
            <div className="flex justify-between items-center p-6 border-b border-white/10 bg-gradient-to-r from-white/5 to-white/2 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Document Analysis</h3>
                  <p className="text-cyan-400 text-sm font-medium">Ask anything about your document</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                AI Assistant Ready
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {chat.length === 0 && fileUploaded && (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-3xl flex items-center justify-center mb-6">
                    <Bot className="w-10 h-10 text-cyan-400" />
                  </div>
                  <h3 className="text-white font-bold text-xl mb-3">Start a Conversation</h3>
                  <p className="text-gray-400 max-w-md">
                    Ask questions about your uploaded document and get intelligent insights powered by AI
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-8 max-w-lg">
                    {[
                      "Summarize the main points",
                      "Explain key concepts",
                      "What are the important findings?",
                      "Provide detailed analysis"
                    ].map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSend(suggestion)}
                        className="p-3 text-left text-sm bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 hover:border-cyan-400/30 text-gray-300 hover:text-white transition-all duration-300"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chat.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-4 group ${
                    msg.type === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.type === "bot" && (
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  )}

                  <div
                    className={`max-w-[75%] relative group/message ${
                      msg.type === "user" ? "order-first" : ""
                    }`}
                  >
                    <div
                      className={`p-5 rounded-3xl shadow-2xl backdrop-blur-sm ${
                        msg.type === "user"
                          ? "bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-br-none"
                          : "bg-white/10 border border-white/10 text-white rounded-bl-none"
                      } group-hover/message:shadow-xl transition-all duration-300`}
                    >
                      {msg.type === "bot" ? (
                        <ReactMarkdown
                          components={{
                            p: ({ node, ...props }) => <p className="mb-4 leading-relaxed last:mb-0" {...props} />,
                            ol: ({ node, ...props }) => <ol className="list-decimal ml-5 mb-4 space-y-2" {...props} />,
                            ul: ({ node, ...props }) => <ul className="list-disc ml-5 mb-4 space-y-2" {...props} />,
                            li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                            code: ({ node, ...props }) => (
                              <code className="bg-black/30 px-2 py-1 rounded-lg text-sm font-mono border border-white/10" {...props} />
                            ),
                            pre: ({ node, ...props }) => (
                              <pre className="bg-black/30 p-4 rounded-xl overflow-x-auto my-4 border border-white/10" {...props} />
                            ),
                            h1: ({ node, ...props }) => <h1 className="text-xl font-bold mb-4 mt-6 first:mt-0" {...props} />,
                            h2: ({ node, ...props }) => <h2 className="text-lg font-bold mb-3 mt-5" {...props} />,
                            h3: ({ node, ...props }) => <h3 className="font-bold mb-2 mt-4" {...props} />,
                          }}
                        >
                          {msg.message}
                        </ReactMarkdown>
                      ) : (
                        <div className="flex items-center gap-3">
                          <User className="w-4 h-4 opacity-80" />
                          <p className="leading-relaxed">{msg.message}</p>
                        </div>
                      )}
                    </div>

                    {/* Message glow effect */}
                    <div
                      className={`absolute inset-0 rounded-3xl blur-xl opacity-0 group-hover/message:opacity-30 transition-opacity duration-500 ${
                        msg.type === "user"
                          ? "bg-blue-400/50"
                          : "bg-purple-400/50"
                      }`}
                    ></div>
                  </div>

                  {msg.type === "user" && (
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                        <User className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="bg-white/10 border border-white/10 rounded-3xl rounded-bl-none p-5 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-gray-400">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-100"></div>
                        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-200"></div>
                      </div>
                      <span className="font-medium">Analyzing document...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 border-t border-white/10 bg-gradient-to-r from-white/5 to-white/2">
              <div className="flex gap-4 items-end">
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={fileUploaded ? "Ask anything about your document..." : "Upload a document to start chatting..."}
                    disabled={!fileUploaded || waiting || recording}
                    rows="1"
                    className="w-full p-5 pr-16 rounded-2xl border border-white/20 bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 resize-none transition-all duration-300 backdrop-blur-xl disabled:opacity-50 disabled:cursor-not-allowed scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
                  />

                  <div className="absolute right-4 bottom-4 flex gap-2">
                    <button
                      onClick={toggleRecording}
                      disabled={!fileUploaded || waiting}
                      className={`p-3 rounded-xl transition-all duration-300 ${
                        recording
                          ? "bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse"
                          : "text-gray-400 hover:text-white hover:bg-white/10 hover:shadow-lg"
                      } disabled:opacity-30 disabled:cursor-not-allowed`}
                    >
                      {recording ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!fileUploaded || waiting || recording || !inputValue.trim()}
                  className="group relative p-5 bg-gradient-to-br from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-2xl transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg hover:shadow-cyan-500/25 hover:scale-105 active:scale-95"
                >
                  <Send size={20} className="group-hover:scale-110 transition-transform" />
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
              </div>

              {fileUploaded && (
                <p className="text-gray-400 text-xs mt-3 text-center font-light">
                  Press Enter to send • Shift + Enter for new line • Click microphone for voice input
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mic Error Toast */}
      {micError && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-red-500/20 backdrop-blur-xl border border-red-400/30 text-red-300 px-6 py-4 rounded-2xl animate-in fade-in duration-300 shadow-2xl shadow-red-500/20 z-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-500/20 rounded-xl flex items-center justify-center">
              <MicOff size={16} className="text-red-400" />
            </div>
            <div>
              <p className="font-semibold">Microphone Error</p>
              <p className="text-sm opacity-90">{micError}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}