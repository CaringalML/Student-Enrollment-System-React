import React, { useState } from 'react';
import '../styles/ConfirmationDialog.css';

const ConfirmationDialog = ({ isOpen, onClose, onConfirm, selectedStudents }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      window.location.reload();
    } catch (error) {
      console.error("Error during deletion:", error);
      setIsDeleting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 className="warning-text">⚠️ Confirm Deletion</h3>
        <p>Are you sure you want to delete the following student(s)?</p>
        <p>This will also delete all related photos and documents.</p>
        
        <div className="table-container">
          <table className="confirmation-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Age</th>
                <th>Email</th>
                <th>Course</th>
                <th>Enrollment Date</th>
              </tr>
            </thead>
            <tbody>
              {selectedStudents.map((student) => (
                <tr key={student.id}>
                  <td>{student.name}</td>
                  <td>{student.age}</td>
                  <td>{student.email}</td>
                  <td>{student.course}</td>
                  <td>{new Date(student.created_at).toLocaleString('en-NZ', {
                    day: 'numeric',
                    month: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: true,
                  })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="modal-actions">
          <button 
            onClick={onClose} 
            className="cancel-button"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button 
            onClick={handleConfirm} 
            className="confirm-button"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <div className="deleting-state">
                <span className="spinner"></span>
                <span>Processing...</span>
              </div>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;