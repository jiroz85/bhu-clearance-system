import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

interface VerificationResult {
  certificateNumber: string;
  valid: boolean;
  status?: string;
  student?: {
    name: string;
    studentId: string;
    department: string;
    year: string;
  };
  issuedAt?: string;
  fileIntegrity?: "AUTHENTIC" | "TAMPERED" | "INVALID_CERTIFICATE";
  tampered?: boolean;
}

const CertificateVerification: React.FC = () => {
  const [certificateNumber, setCertificateNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleVerify = async () => {
    if (!certificateNumber.trim()) {
      setError("Please enter a certificate number");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await api.get(
        `/certificate/verify/${certificateNumber}`,
      );
      // Handle wrapped response format
      const data = response.data.data || response.data;
      setResult(data);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyWithFile = async () => {
    if (!certificateNumber.trim()) {
      setError("Please enter a certificate number");
      return;
    }

    if (!file) {
      setError("Please select a PDF file to verify");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await api.post(
        `/certificate/verify/${certificateNumber}/file`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      // Handle wrapped response format
      const data = response.data.data || response.data;
      setResult(data);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(
        axiosError.response?.data?.message || "File verification failed",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        setError("Please select a PDF file");
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "AUTHENTIC":
        return "✅";
      case "TAMPERED":
        return "❌";
      case "INVALID_CERTIFICATE":
        return "⚠️";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Bule Hora University
          </h1>
          <h2 className="text-base font-semibold text-gray-700 mb-2">
            Certificate Verification
          </h2>
          <p className="text-gray-600">
            Verify the authenticity of BHU clearance certificates
          </p>
          {/* Back to Login Button */}
          <div className="mt-6">
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
            >
              ← Back to Login
            </button>
          </div>
        </div>

        {/* Verification Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Certificate Number
            </label>
            <input
              type="text"
              value={certificateNumber}
              onChange={(e) => setCertificateNumber(e.target.value)}
              placeholder="e.g., BHU-CERT-2026-EC0EBB49"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Certificate PDF (Optional - for file integrity check)
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {file && (
              <p className="text-sm text-gray-600 mt-1">
                Selected: {file.name}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleVerify}
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify Certificate"}
            </button>

            {file && (
              <button
                onClick={handleVerifyWithFile}
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? "Checking..." : "Verify with File"}
              </button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {/* Verification Result */}
        {result && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-base font-semibold mb-4">
              Verification Result
            </h3>

            {/* Certificate Validity */}
            <div className="mb-4">
              <span className="font-medium">Certificate Status: </span>
              <span
                className={`font-bold ${result.valid ? "text-green-600" : "text-red-600"}`}
              >
                {result.valid ? "✅ VALID" : "❌ INVALID"}
              </span>
            </div>

            {/* File Integrity */}
            {result.fileIntegrity && (
              <div
                className={`mb-4 p-4 rounded-lg border-2 ${
                  result.fileIntegrity === "AUTHENTIC"
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <div className="flex items-center mb-2">
                  <span className="font-bold text-base">
                    {getStatusIcon(result.fileIntegrity)} {result.fileIntegrity}
                  </span>
                </div>

                {result.tampered ? (
                  <div className="text-red-700">
                    <p className="font-bold mb-2">
                      ⚠️ THIS DOCUMENT HAS BEEN MODIFIED
                    </p>
                    <p className="text-sm mb-2">
                      This certificate has been edited and is NOT AUTHENTIC.
                    </p>
                    <div className="bg-white p-3 rounded border border-red-300">
                      <p className="text-xs font-bold mb-1">
                        IMPORTANT NOTICE:
                      </p>
                      <ul className="text-xs space-y-1">
                        <li>• This document is INVALID for all purposes</li>
                        <li>
                          • Any changes made to the certificate are detectable
                        </li>
                        <li>
                          • System errors do NOT cause false tampering alerts
                        </li>
                        <li>
                          • Student must obtain a fresh certificate from
                          university
                        </li>
                      </ul>
                    </div>
                    <div className="mt-3 p-2 bg-yellow-50 rounded border border-yellow-200">
                      <p className="text-xs font-bold text-yellow-800">
                        For verification: Contact BHU Registrar Office
                      </p>
                      <p className="text-xs text-yellow-700">
                        📧 registrar@bhu.edu.et | 📞 +251-XXX-XXXX
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-green-700">
                    <p className="font-bold">
                      ✅ This certificate is AUTHENTIC and has not been modified
                    </p>
                  </div>
                )}
              </div>
            )}
            {/* Certificate Details */}
            {result.valid && result.student && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Certificate Details</h4>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Certificate Number:</span>{" "}
                    {result.certificateNumber}
                  </div>
                  <div>
                    <span className="font-medium">Student Name:</span>{" "}
                    {result.student.name}
                  </div>
                  <div>
                    <span className="font-medium">Student ID:</span>{" "}
                    {result.student.studentId}
                  </div>
                  <div>
                    <span className="font-medium">Department:</span>{" "}
                    {result.student.department}
                  </div>
                  <div>
                    <span className="font-medium">Year:</span>{" "}
                    {result.student.year}
                  </div>
                  <div>
                    <span className="font-medium">Issue Date:</span>{" "}
                    {result.issuedAt
                      ? new Date(result.issuedAt).toLocaleDateString()
                      : "N/A"}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Security Note */}
        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Security Note:</strong> For maximum security, always verify
            certificates by uploading the original PDF file to check for
            tampering.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CertificateVerification;
