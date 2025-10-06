import React from "react";

export default function ChatBubble({ message, type, dark }) {
  const userClasses = dark
    ? "self-end bg-blue-800 text-white rounded-br-none"
    : "self-end bg-blue-100 text-black rounded-br-none";

  const botClasses = dark
    ? "self-start bg-gray-700 text-white rounded-bl-none"
    : "self-start bg-gray-200 text-black rounded-bl-none";

  return (
    <div className={`max-w-[80%] px-4 py-2 rounded-xl break-words ${type === "user" ? userClasses : botClasses}`}>
      {message}
    </div>
  );
}
