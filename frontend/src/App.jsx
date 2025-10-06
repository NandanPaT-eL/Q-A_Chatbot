import React, { useState, useRef, useEffect } from "react";
import { askQuestion, uploadFile } from "./api";
import { Upload, Loader2, FileText } from "lucide-react"; // Added Loader2 + FileText icons

export default function App() {
  const [chat, setChat] = useState([]);
  const [language, setLanguage] = useState("English");
  const [waiting, setWaiting] = useState(false);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(scrollToBottom, [chat]);

  const handleSend = async (question) => {
    setChat((prev) => [...prev, { type: "user", message: question }]);
    setWaiting(true);
    const answer = await askQuestion(question, language);
    setChat((prev) => [...prev, { type: "bot", message: answer }]);
    setWaiting(false);
  };

  const processFile = async (file) => {
    if (!file) return;
    setUploading(true); // start animation
    const success = await uploadFile(file);
    setUploading(false); // stop animation
    if (success) {
      setFileUploaded(true);
      setUploadedFileName(file.name); // store uploaded file name
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

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center p-4">
      <h1 className="text-3xl font-semibold text-white mb-6">Student Book Q&A</h1>

      {/* File Upload or File Info */}
      {!fileUploaded ? (
        <div
          className={`w-full max-w-2xl flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl mb-6 transition ${
            dragOver ? "border-blue-500 bg-gray-800" : "border-gray-600 bg-gray-900"
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
              <Loader2 className="animate-spin text-blue-500 w-12 h-12 mb-3" />
              <p className="text-white">Uploading your book...</p>
            </div>
          ) : (
            <>
              <Upload className="text-blue-500 w-12 h-12 mb-4" />
              <p className="text-white font-medium">Upload sources</p>
              <p className="text-gray-400 text-sm mb-2">
                Drag & drop or{" "}
                <label className="text-blue-400 cursor-pointer underline">
                  choose file
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    className="hidden"
                    onChange={(e) => processFile(e.target.files[0])}
                  />
                </label>{" "}
                to upload
              </p>
              <p className="text-gray-500 text-xs">
                Supported file types: PDF, DOCX
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="w-full max-w-2xl flex items-center justify-between p-4 bg-gray-800 border border-gray-600 rounded-xl mb-6 shadow-lg">
          <div className="flex items-center gap-3">
            <FileText className="text-blue-400 w-6 h-6" />
            <span className="text-white">{uploadedFileName}</span>
          </div>
          <button
            onClick={() => {
              setFileUploaded(false);
              setUploadedFileName("");
            }}
            className="text-red-400 hover:text-red-500 text-sm"
          >
            Remove
          </button>
        </div>
      )}

      {/* Chatbox */}
      <div className="w-full max-w-2xl flex flex-col bg-[#1e1e1e] shadow-xl rounded-2xl overflow-hidden border border-gray-700">
        {/* Chat Header */}
        <div className="px-4 py-3 font-semibold flex justify-between items-center bg-[#2d2d2d] text-white">
          <span>Ask Anything!</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="p-1 bg-gray-800 text-white rounded-md"
          >
            {["English", "Hindi", "Spanish", "French", "German", "Chinese", "Japanese"].map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 p-6 h-[500px] overflow-y-auto space-y-4 bg-[#1b1b1b]">
          {chat.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.type === "user" ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[70%] px-4 py-2 rounded-xl break-words ${
                  msg.type === "user"
                    ? "bg-blue-700 text-white rounded-br-none"
                    : "bg-gray-600 text-white rounded-bl-none"
                }`}
              >
                {msg.message}
              </div>
            </div>
          ))}
          {waiting && (
            <div className="self-start bg-gray-700 text-white px-4 py-2 rounded-lg max-w-xs animate-pulse">
              ...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-700 bg-[#1e1e1e]">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type your question..."
              disabled={!fileUploaded || waiting}
              className="flex-1 p-3 rounded-xl border focus:outline-none focus:ring-2 bg-[#2e2e2e] border-gray-600 text-white focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (e.target.value.trim()) {
                    handleSend(e.target.value);
                    e.target.value = "";
                  }
                }
              }}
            />
            <button
              onClick={() => {
                const input = document.querySelector("input[type='text']");
                if (input.value.trim()) {
                  handleSend(input.value);
                  input.value = "";
                }
              }}
              disabled={!fileUploaded || waiting}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
