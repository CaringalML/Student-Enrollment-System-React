import React, { useState } from 'react';
import '../styles/file-confirmation-delete.css';

const FileConfirmationDelete = ({ isOpen, onClose, onConfirm, fileName, isDeleting: isDeletePending }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDelete = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
      onClose(); // Close after successful deletion
    } catch (error) {
      console.error('Error during deletion:', error);
      setIsProcessing(false); // Reset processing state on error
    }
  };

  if (!isOpen) return null;

  return (
    <div className="file-confirm-delete-overlay">
      <div className="file-confirm-delete-modal">
        <div className="file-confirm-delete-content">
          <div className="warning-icon">⚠️</div>
          <h2>Delete Confirmation</h2>
          <p>Are you sure you want to delete this file?</p>
          <p className="file-name">"{fileName}"</p>
          <div className="file-confirm-delete-actions">
            <button
              className="cancel-button"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="confirm-button"
              onClick={handleDelete}
              disabled={isProcessing || isDeletePending}
              type="button"
            >
              {isProcessing || isDeletePending ? (
                <span className="deleting-state">
                  <span className="spinner"></span>
                  Deleting...
                </span>
              ) : (
                'Delete'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileConfirmationDelete;