import React, { useEffect, useState, useCallback } from "react";
import "../styles/table.css";
import ConfirmationDialog from "./ConfirmationDialog";
import InsertStudentModal from "./InsertStudentModal";
import StudentView from "./StudentView";
import UpdateStudentProfile from "./UpdateStudentProfile";
import api, { endpoints } from "../services/api";
// import { API_BASE_URL } from "../config";

const StudentTable = () => {
  const [students, setStudents] = useState([]);
  const [originalStudents, setOriginalStudents] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [studentToUpdate, setStudentToUpdate] = useState(null);

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(endpoints.students);
  
      const formattedData = response.data
        .map(student => ({
          ...student,
          avatar_url: student.avatar_url,
          documents: student.documents || []
        }))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
      setStudents(formattedData);
      setOriginalStudents(formattedData);
      
      if (selectedStudent) {
        const updatedStudent = formattedData.find(s => s.id === selectedStudent.id);
        if (updatedStudent) {
          setSelectedStudent(updatedStudent);
        }
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [selectedStudent]);



  


// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
  refreshData();
}, []); // Keep the empty dependency array as it was

// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
  if (students.length > 0) {
    // Keep the original version that was working
    const updatedStudents = students.map(student => ({
      ...student,
      avatar_url: student.avatar_url + '?timestamp=' + new Date().getTime()
    }));
    setStudents(updatedStudents);
  }
}, [students.length]);






const handleAddStudent = async (formData) => {
  try {
      const response = await api.post(endpoints.students, formData, {
          headers: {
              "Content-Type": "multipart/form-data",
              Accept: "application/json",
          },
      });

      if (response.data.status === "success") {
          // Add the new student to state
          const newStudent = {
              ...response.data.data.student,
              avatar_url: response.data.data.avatar_url,
              documents: response.data.data.uploaded_files.map(file => ({
                  id: file.document_id,
                  file_path: file.path,
                  document_url: file.url,
                  created_at: new Date().toISOString(),
                  original_filename: file.filename
              }))
          };

          // Update state
          setStudents(prevStudents => [newStudent, ...prevStudents]);
          setOriginalStudents(prevStudents => [newStudent, ...prevStudents]);
          setModalOpen(false);

          // Show success message (if you have a toast notification system)
          // toast.success('Student added successfully');

          // Refresh the page
          window.location.reload();

          return response;
      } else {
          throw response;
      }
  } catch (error) {
      console.error("Error adding student:", error.response?.data);

      // If there's a specific error message from the server, use it
      if (error.response?.data?.message) {
          console.error("Server error message:", error.response.data.message);
      }

      // Re-throw the error to be handled by the modal
      throw error;
  }
};

  const handleDelete = async () => {
    try {
      await Promise.all(
        selectedIds.map(id => api.delete(`${endpoints.students}/${id}`))
      );
      
      const filteredStudents = students.filter(
        student => !selectedIds.includes(student.id)
      );
      setStudents(filteredStudents);
      setOriginalStudents(filteredStudents);
      
      setSelectedIds([]);
      setDialogOpen(false);
    } catch (error) {
      console.error("Error deleting students:", error);
      alert('Failed to delete students. Please try again.');
    }
  };

  const filterTable = (event) => {
    const searchTerm = event.target.value.toLowerCase();
    if (searchTerm === "") {
      setStudents(originalStudents);
    } else {
      const filteredStudents = originalStudents.filter(
        student =>
          student.name.toLowerCase().includes(searchTerm) ||
          student.age.toString().includes(searchTerm) ||
          student.address.toLowerCase().includes(searchTerm) ||
          student.email.toLowerCase().includes(searchTerm) ||
          student.course.toLowerCase().includes(searchTerm)
      );
      // Sort remains consistent with filtered results
      setStudents(filteredStudents);
    }
  };

  const handleCheckboxChange = (id) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(studentId => studentId !== id)
        : [...prev, id]
    );
  };

  const handleDeleteConfirmation = () => {
    setDialogOpen(true);
  };

  const handleViewStudent = (student) => {
    setSelectedStudent(student);
    setIsViewModalOpen(true);
  };

  const handleUpdateClick = (student) => {
    setStudentToUpdate(student);
    setIsUpdateModalOpen(true);
  };

  const handleUpdateSuccess = (updatedStudent) => {
    // Update both students and originalStudents states
    const updateStudentsList = (prevStudents) =>
      prevStudents.map(student =>
        student.id === updatedStudent.id
          ? { ...student, ...updatedStudent }
          : student
      );

    setStudents(updateStudentsList);
    setOriginalStudents(updateStudentsList);
    
    // Update selectedStudent if it's the same student
    if (selectedStudent?.id === updatedStudent.id) {
      setSelectedStudent(prevStudent => ({
        ...prevStudent,
        ...updatedStudent
      }));
    }

    setIsUpdateModalOpen(false);
    setStudentToUpdate(null);
    // Refresh data to ensure consistency
    refreshData();
  };

  const getSelectedStudents = () => {
    return students.filter(student => selectedIds.includes(student.id));
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className="student-table-container">
      <div className="table-header">
        <h2 className="title-left">Student List</h2>
        <input
          type="text"
          id="searchInput"
          placeholder="Search..."
          onChange={filterTable}
        />

        <div className="button-container">
          <button className="add-button" onClick={() => setModalOpen(true)}>
            Add
          </button>
          <button
            className="delete-button"
            onClick={handleDeleteConfirmation}
            disabled={selectedIds.length === 0}
          >
            Delete
          </button>
        </div>
      </div>

      <div className={`table-wrapper ${students.length > 5 ? "scrollable" : ""}`}>
        <table className="student-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  onChange={(e) =>
                    setSelectedIds(
                      e.target.checked ? students.map((s) => s.id) : []
                    )
                  }
                  checked={selectedIds.length === students.length && students.length > 0}
                />
              </th>
              <th>Avatar</th>
              <th>Name</th>
              <th>Age</th>
              <th>Address</th>
              <th>Email</th>
              <th>Course</th>
              <th>Date</th>
              <th>Files</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(student.id)}
                    onChange={() => handleCheckboxChange(student.id)}
                  />
                </td>
                <td>
                  {student.avatar_url ? (
                    <img
                      src={student.avatar_url}
                      alt="Avatar"
                      width="50"
                      height="50"
                      className="student-avatar"
                      onError={(e) => {
                        console.log('Failed to load avatar:', student.avatar_url);
                        e.target.src = "https://via.placeholder.com/50";
                      }}
                    />
                  ) : (
                    <img
                      src="https://via.placeholder.com/50"
                      alt="Default Avatar"
                      className="student-avatar"
                    />
                  )}
                </td>
                <td>{student.name}</td>
                <td>{student.age}</td>
                <td>{student.address}</td>
                <td>{student.email}</td>
                <td>{student.course}</td>
                <td>
                  {new Date(student.created_at).toLocaleString("en-NZ", {
                    day: "numeric",
                    month: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "numeric",
                    hour12: true,
                  })}
                </td>
                <td>
                  {student.documents?.length > 0 ? (
                    <span className="file-count">
                      {student.documents.length} file(s)
                    </span>
                  ) : (
                    <span className="no-files">No files</span>
                  )}
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="view-button"
                      onClick={() => handleViewStudent(student)}
                    >
                      View
                    </button>
                    <button
                      className="update-button"
                      onClick={() => handleUpdateClick(student)}
                    >
                      Update
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="row-count">{students.length} row(s) found</p>

      <ConfirmationDialog
        isOpen={isDialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleDelete}
        selectedStudents={getSelectedStudents()}
      />

      <InsertStudentModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleAddStudent}
      />

      <StudentView
        student={selectedStudent}
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        onDocumentDelete={async (documentId) => {
          try {
            await api.delete(`${endpoints.documents}/${documentId}`);

            // Update the selected student state
            setSelectedStudent(prev => ({
              ...prev,
              documents: prev.documents.filter(doc => doc.id !== documentId)
            }));

            // Update both students and originalStudents states
            const updateStudentsList = (prevStudents) =>
              prevStudents.map(student =>
                student.id === selectedStudent.id
                  ? {
                      ...student,
                      documents: student.documents.filter(doc => doc.id !== documentId)
                    }
                  : student
              );

            setStudents(updateStudentsList);
            setOriginalStudents(updateStudentsList);

          } catch (error) {
            console.error("Error deleting document:", error);
            alert('Failed to delete document. Please try again.');
          }
        }}
      />

      {isUpdateModalOpen && studentToUpdate && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>Update Student</h2>
              <button
                className="close-button"
                onClick={() => setIsUpdateModalOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <UpdateStudentProfile
                studentId={studentToUpdate.id}
                initialData={studentToUpdate}
                onSuccess={handleUpdateSuccess}
                onCancel={() => setIsUpdateModalOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentTable;