import React from "react";

export default function FileUploader({ onUpload }) {
  return (
    <div className="my-4">
      <input
        type="file"
        accept=".pdf,.docx"
        onChange={(e) => onUpload(e.target.files[0])}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4
        file:rounded-lg file:border-0 file:text-sm file:font-semibold
        file:bg-blue-500 file:text-white hover:file:bg-blue-600"
      />
    </div>
  );
}
