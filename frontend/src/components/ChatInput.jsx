import React, { useState } from "react";

export default function ChatInput({ onSend, disabled, placeholder, dark }) {
  const [text, setText] = useState("");

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text);
    setText("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyPress}
        disabled={disabled}
        placeholder={placeholder}
        className={`flex-1 p-3 rounded-xl border focus:outline-none focus:ring-2 ${
          dark
            ? "bg-[#2e2e2e] border-gray-600 text-white focus:ring-blue-500"
            : "bg-white border-gray-300 text-black focus:ring-blue-400"
        }`}
      />
      <button
        onClick={handleSend}
        disabled={disabled || !text.trim()}
        className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700"
      >
        Send
      </button>
    </div>
  );
}
