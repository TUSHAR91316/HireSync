import React, { useState, useRef } from 'react';

/**
 * HireSync Candidate Resume Uploader Component (`src/components/candidate/ResumeUploader.js`)
 *
 * Drag-and-drop PDF resume upload component with:
 * - PDF file format validation (application/pdf)
 * - File size limit validation (max 5MB)
 * - Visual upload progress bar & status notifications
 * - Invokes `onUploadSuccess(parseResult, fileUrl)` callback on success
 */
export default function ResumeUploader({ onUploadSuccess, jobRequirements = {} }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null);
  const fileInputRef = useRef(null);

  const MAX_SIZE_BYTES = 5242880; // 5MB limit

  const validateFile = (file) => {
    if (!file) return false;
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      setErrorMessage('Invalid file format. Please upload a PDF resume (.pdf).');
      return false;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setErrorMessage('File size exceeds the 5MB limit. Please upload a smaller PDF.');
      return false;
    }
    setErrorMessage(null);
    return true;
  };

  const processUpload = async (file) => {
    if (!validateFile(file)) return;

    setIsUploading(true);
    setUploadProgress(15);

    try {
      const formData = new FormData();
      formData.append('resume', file);
      if (jobRequirements) {
        formData.append('jobRequirements', JSON.stringify(jobRequirements));
      }

      setUploadProgress(45);

      const response = await fetch('/api/candidate/resume/upload', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(85);

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to upload and parse resume.');
      }

      setUploadProgress(100);

      setTimeout(() => {
        setIsUploading(false);
        if (onUploadSuccess) {
          onUploadSuccess(data.parseResult, data.fileUrl);
        }
      }, 400);
    } catch (err) {
      setIsUploading(false);
      setUploadProgress(0);
      setErrorMessage(err.message || 'An unexpected error occurred during upload.');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      processUpload(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-md border border-gray-100">
      <h2 className="text-xl font-bold text-gray-800 mb-2">Upload Your Resume (PDF)</h2>
      <p className="text-sm text-gray-500 mb-4">
        HireSync will parse your resume automatically to evaluate eligibility and match score.
      </p>

      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 flex items-center justify-between">
          <span>⚠️ {errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-500 hover:text-red-700 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/50'
            : 'border-gray-300 hover:border-indigo-400 bg-gray-50/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-2xl font-bold">
            📄
          </div>
          <div>
            <p className="text-base font-semibold text-gray-700">
              Drag & drop your PDF resume here, or{' '}
              <span className="text-indigo-600 underline">browse</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">Only PDF format supported (Max size: 5MB)</p>
          </div>
        </div>
      </div>

      {isUploading && (
        <div className="mt-6">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Uploading & Parsing Resume...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
