import axios from 'axios';
import { API_BASE_URL } from '../config';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Accept': 'application/json',
    }
});

export const endpoints = {
    students: '/students',
    documents: '/document',
    fileUpdate: '/documents',
    addFiles: (studentId) => `/students/${studentId}/add-files`,
    uploadAvatar: (studentId) => `/students/${studentId}/avatar`,
    updateStudent: (studentId) => `/students/${studentId}`  // Update endpoint
};

// Helper function for file uploads
export const uploadStudentAvatar = async (studentId, file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    
    return api.post(endpoints.uploadAvatar(studentId), formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

// Helper function for updating student data
export const updateStudent = async (studentId, data) => {
    return api.put(endpoints.updateStudent(studentId), data);
};

export default api;