import React from "react";

export default function LanguageSelector({ value, onChange }) {
  const languages = ["English", "Hindi", "Spanish", "French", "German", "Chinese", "Japanese"];
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
    >
      {languages.map((lang) => (
        <option key={lang} value={lang}>{lang}</option>
      ))}
    </select>
  );
}
