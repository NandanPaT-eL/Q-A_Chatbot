import React, { useState, useRef, useEffect } from "react";
import { askQuestion, uploadFile } from "./api";
import { Upload, Loader2, FileText, Mic, MicOff, Send, X } from "lucide-react";
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
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(scrollToBottom, [chat]);

  // SpeechRecognition Initialization
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

    recognition.onstart = () => {
      setRecording(true);
      setMicError(null);
    };

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      setInputValue(transcript);
    };

    recognition.onerror = (err) => {
      console.error("Speech recognition error:", err);
      setMicError("Speech recognition failed. Try again.");
      setRecording(false);
    };

    recognition.onend = () => setRecording(false);

    recognitionRef.current = recognition;

    return () => recognition.stop();
  }, []);

  const handleSend = async (question) => {
    if (!question.trim()) return;
    setChat((prev) => [...prev, { type: "user", message: question }]);
    setWaiting(true);
    try {
      const answer = await askQuestion(question, language);
      setChat((prev) => [...prev, { type: "bot", message: answer }]);
    } catch (err) {
      setChat((prev) => [
        ...prev,
        { type: "bot", message: "Error: Failed to fetch response. Please try again." },
      ]);
    }
    setWaiting(false);
    setInputValue("");
  };

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

  const toggleRecording = () => {
    if (micError) {
      alert(micError);
      return;
    }
    if (!recognitionRef.current) return;
    if (recording) {
      recognitionRef.current.stop();
      setRecording(false);
    } else {
      recognitionRef.current.start();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim()) {
        handleSend(inputValue);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center p-6">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
          Edura AI
        </h1>
        <p className="text-slate-400 text-lg font-light">
          Intelligent document analysis and Q&A platform
        </p>
      </div>

      {/* File Upload Section */}
      {!fileUploaded ? (
        <div
          className={`w-full max-w-4xl flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-2xl mb-8 transition-all duration-300 ${
            dragOver
              ? "border-blue-500 bg-blue-500/5 backdrop-blur-sm"
              : "border-slate-600 bg-slate-800/30 hover:border-slate-500"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {uploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="animate-spin text-blue-500 w-14 h-14 mb-4" />
              <p className="text-white text-lg font-medium">Processing your document</p>
              <p className="text-slate-400 text-sm mt-2">This may take a few moments...</p>
            </div>
          ) : (
            <>
              <div className="w-20 h-20 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6">
                <Upload className="text-blue-400 w-8 h-8" />
              </div>
              <p className="text-white font-semibold text-xl mb-3">Upload Document</p>
              <p className="text-slate-400 text-center mb-4">
                Drag and drop your file here or{" "}
                <label className="text-blue-400 cursor-pointer font-medium hover:text-blue-300 transition-colors">
                  browse files
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    className="hidden"
                    onChange={(e) => processFile(e.target.files[0])}
                  />
                </label>
              </p>
              <p className="text-slate-500 text-sm">
                Supported formats: PDF, DOCX • Max size: 50MB
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="w-full max-w-4xl flex items-center justify-between p-5 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
              <FileText className="text-green-400 w-6 h-6" />
            </div>
            <div>
              <p className="text-white font-medium">{uploadedFileName}</p>
              <p className="text-slate-400 text-sm">Ready for analysis</p>
            </div>
          </div>
          <button
            onClick={() => {
              setFileUploaded(false);
              setUploadedFileName("");
              setChat([]);
            }}
            className="text-slate-400 hover:text-red-400 text-sm font-medium transition-colors px-4 py-2 rounded-lg hover:bg-red-500/10"
          >
            Remove
          </button>
        </div>
      )}

      {/* Chat Interface */}
      <div className="w-full max-w-4xl flex flex-col bg-slate-800/30 backdrop-blur-sm shadow-2xl rounded-2xl overflow-hidden border border-slate-700 flex-1 mb-24">
        {/* Chat Header */}
        <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-700">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-white font-semibold text-lg">Document Analysis</h2>
              <p className="text-slate-400 text-sm">Ask questions about your uploaded content</p>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {["English", "Hindi", "Spanish", "French", "German", "Chinese", "Japanese"].map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-gradient-to-b from-slate-900/50 to-slate-800/30">
          {chat.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-24 h-24 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6">
                <FileText className="text-blue-400 w-10 h-10" />
              </div>
              <h3 className="text-white text-xl font-semibold mb-3">Start a Conversation</h3>
              <p className="text-slate-400 max-w-md">
                Upload a document and ask questions to get detailed insights and explanations from your content.
              </p>
            </div>
          ) : (
            <>
              {chat.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] px-5 py-3 rounded-2xl backdrop-blur-sm ${
                      msg.type === "user"
                        ? "bg-blue-600 text-white rounded-br-md shadow-lg"
                        : "bg-slate-700/80 text-white rounded-bl-md border border-slate-600 shadow-lg"
                    }`}
                  >
                    {msg.type === "bot" ? (
                      <ReactMarkdown
                        components={{
                          p: ({ node, ...props }) => <p className="mb-3 leading-relaxed" {...props} />,
                          ol: ({ node, ...props }) => <ol className="list-decimal ml-5 mb-3 space-y-1" {...props} />,
                          ul: ({ node, ...props }) => <ul className="list-disc ml-5 mb-3 space-y-1" {...props} />,
                          li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
                          strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
                        }}
                        className="prose prose-invert max-w-none"
                      >
                        {msg.message}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-white leading-relaxed">{msg.message}</p>
                    )}
                  </div>
                </div>
              ))}

              {waiting && (
                <div className="flex justify-start">
                  <div className="bg-slate-700/80 text-white px-5 py-3 rounded-2xl border border-slate-600 shadow-lg">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                      </div>
                      <span className="text-slate-300 text-sm">Analyzing document...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      {/* DeepSeek-style Fixed Input Palette */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-full max-w-4xl px-6">
        <div className="bg-slate-800/90 backdrop-blur-xl border border-slate-600 rounded-2xl shadow-2xl p-2">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={fileUploaded ? "Ask anything about your document..." : "Upload a document to start chatting..."}
              disabled={!fileUploaded || waiting || recording}
              onKeyDown={handleKeyDown}
              className="flex-1 p-4 bg-transparent text-white placeholder-slate-400 focus:outline-none border-none text-lg"
            />

            <div className="flex items-center gap-2">
              {/* Voice Input Button */}
              <button
                onClick={toggleRecording}
                disabled={!fileUploaded || waiting}
                className={`p-3 rounded-xl transition-all duration-200 ${
                  recording
                    ? "bg-orange-500 text-white shadow-lg animate-pulse"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                } disabled:opacity-30 disabled:cursor-not-allowed`}
                title="Voice input"
              >
                {recording ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              {/* Send Button */}
              <button
                onClick={() => handleSend(inputValue)}
                disabled={!fileUploaded || waiting || recording || !inputValue.trim()}
                className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Send message"
              >
                <Send size={20} />
              </button>
            </div>
          </div>

          {/* Recording Indicator */}
          {recording && (
            <div className="flex items-center justify-center mt-2">
              <div className="flex items-center space-x-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                <span className="text-orange-400 text-sm font-medium">Listening... Speak now</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Suggestions */}
        {fileUploaded && chat.length === 0 && (
          <div className="flex flex-wrap gap-2 mt-3 justify-center">
            {[
              "Summarize the main points",
              "Explain key concepts",
              "What are the important topics?",
              "Provide study questions"
            ].map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSend(suggestion)}
                className="px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 rounded-xl text-sm transition-all duration-200 backdrop-blur-sm border border-slate-600"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-slate-500 text-sm">
          Designed By Nandan Patel & Nirjari Bhatt
        </p>
      </div>

      {/* Error Message */}
      {micError && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-lg backdrop-blur-sm">
          {micError}
        </div>
      )}
    </div>
  );
}