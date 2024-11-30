import React, { useState, useEffect } from "react";
import "../styles/view.css";
import AvatarModal from "./AvatarModal";
import FileConfirmationDelete from "./File-Confirmation-Delete";
import api, { endpoints } from "../services/api";

const StudentView = ({ student, isOpen, onClose, onDocumentDelete }) => {
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [deletingDocuments, setDeletingDocuments] = useState(new Set());
  const [studentData, setStudentData] = useState(student);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    documentId: null,
    fileName: "",
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    if (student) {
      setStudentData(student);
    }
  }, [student]);

  const handleFileUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError("");

    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("student_files[]", files[i]);
      }

      const response = await api.post(
        endpoints.addFiles(studentData.id),
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.status === 200 || response.status === 201) {
        await refreshData();
      } else {
        setUploadError(response.data.message || "Upload failed");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      setUploadError(
        error.response?.data?.message ||
          "An error occurred while uploading the file"
      );
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const handleDeleteDocument = async () => {
    const { documentId } = deleteModal;
    if (!documentId) return;

    setDeletingDocuments((prev) => new Set([...prev, documentId])); // Mark as pending

    try {
      setStudentData((prev) => ({
        ...prev,
        documents: prev.documents.map((doc) =>
          doc.id === documentId ? { ...doc, isDeleting: true } : doc
        ),
      }));

      await api.delete(`${endpoints.documents}/${documentId}`);
      // Update the selected student state
      setStudentData((prev) => ({
        ...prev,
        documents: prev.documents.filter((doc) => doc.id !== documentId),
      }));
    } catch (error) {
      console.error("Error:", error);
      // Revert the deleting state on error
      setStudentData((prev) => ({
        ...prev,
        documents: prev.documents.map((doc) =>
          doc.id === documentId ? { ...doc, isDeleting: false } : doc
        ),
      }));
    } finally {
      setDeletingDocuments((prev) => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
      setDeleteModal({ isOpen: false, documentId: null, fileName: "" });
    }
  };

  const refreshData = async () => {
    try {
      const response = await api.get(`${endpoints.students}`);
      const updatedStudent = response.data.find((s) => s.id === studentData.id);
      if (updatedStudent) {
        setStudentData(updatedStudent);
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
    }
  };

  if (!isOpen || !studentData) return null;

  const getFileIcon = (filePath) => {
    const extension = filePath.split(".").pop().toLowerCase();
    switch (extension) {
      case "pdf":
        return "📄";
      case "doc":
      case "docx":
        return "📝";
      case "xls":
      case "xlsx":
        return "📊";
      case "jpg":
      case "jpeg":
      case "png":
        return "🖼️";
      default:
        return "📎";
    }
  };

  const getFileName = (filePath) => {
    const fullName = filePath.split("/").pop();
    const nameParts = fullName.split("_");
    const baseName = nameParts[0];
    const extension = fullName.split(".").pop();
    return `${baseName}.${extension}`;
  };

  const openDeleteModal = (documentId, fileName) => {
    if (deletingDocuments.has(documentId)) return;
    setDeleteModal({
      isOpen: true,
      documentId,
      fileName,
    });
  };

  const renderDocuments = () => {
    return (
      <div className="documents-list">
        <div className="documents-header">
          <div className="header-actions">
            <div className="upload-container">
              <input
                type="file"
                id="file-upload"
                onChange={handleFileUpload}
                className="file-input"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.pptx"
                disabled={isUploading}
                multiple
              />
              <label htmlFor="file-upload" className="upload-button">
                {isUploading ? "Uploading..." : "Upload New Documents"}
              </label>
              {uploadError && <p className="error-message">{uploadError}</p>}
            </div>
          </div>
        </div>

        {!studentData.documents || studentData.documents.length === 0 ? (
          <p className="no-documents">No documents available</p>
        ) : (
          studentData.documents.map((doc) => (
            <div
              key={doc.id}
              className={`document-item ${doc.isDeleting ? "deleting" : ""}`}
            >
              <div className="document-info">
                <span className="file-icon">{getFileIcon(doc.file_path)}</span>
                <span className="document-name">
                  {getFileName(doc.file_path)}
                </span>
                <span className="document-date">
                  {new Date(doc.created_at).toLocaleString("en-NZ", {
                    day: "numeric",
                    month: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="document-actions">
                <a
                  href={doc.document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="view-button"
                  style={{ opacity: doc.isDeleting ? 0.5 : 1 }}
                >
                  View
                </a>
                <button
                  onClick={() =>
                    openDeleteModal(doc.id, getFileName(doc.file_path))
                  }
                  className="delete-button"
                  disabled={doc.isDeleting || deletingDocuments.has(doc.id)}
                >
                  {doc.isDeleting || deletingDocuments.has(doc.id)
                    ? "Deleting..."
                    : "Delete"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <>
      <div className="view-overlay">
        <div className="view-dialog">
          <div className="view-header">
            <h2>Student Details</h2>
            <button className="close-button" onClick={onClose}>
              &times;
            </button>
          </div>

          <div className="view-content">
            <div className="student-profile">
              <div className="avatar-container">
                {studentData.avatar_url ? (
                  <img
                    src={studentData.avatar_url}
                    alt="Student Avatar"
                    className="large-avatar clickable"
                    onClick={() => setIsAvatarModalOpen(true)}
                    title="Click to view full size"
                  />
                ) : (
                  <img
                    src="https://via.placeholder.com/200"
                    alt="Default Avatar"
                    className="large-avatar"
                  />
                )}
              </div>

              <div className="student-info">
                <div className="info-group">
                  <label>Name:</label>
                  <span>{studentData.name}</span>
                </div>
                <div className="info-group">
                  <label>Age:</label>
                  <span>{studentData.age}</span>
                </div>
                <div className="info-group">
                  <label>Email:</label>
                  <span>{studentData.email}</span>
                </div>
                <div className="info-group">
                  <label>Address:</label>
                  <span>{studentData.address}</span>
                </div>
                <div className="info-group">
                  <label>Course:</label>
                  <span>{studentData.course}</span>
                </div>
                <div className="info-group">
                  <label>Registration Date:</label>
                  <span>
                    {new Date(studentData.created_at).toLocaleString("en-NZ", {
                      day: "numeric",
                      month: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "numeric",
                      hour12: true,
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="documents-section">
              <h3>Student Documents</h3>
              {renderDocuments()}
            </div>
          </div>
        </div>
      </div>

      <AvatarModal
        imageUrl={studentData.avatar_url}
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
      />

      <FileConfirmationDelete
        isOpen={deleteModal.isOpen}
        onConfirm={handleDeleteDocument}
        onClose={() =>
          setDeleteModal({ isOpen: false, documentId: null, fileName: "" })
        } // Change onCancel to onClose
        fileName={deleteModal.fileName}
        isDeleting={deletingDocuments.has(deleteModal.documentId)} // Add this line
      />
    </>
  );
};

export default StudentView;
