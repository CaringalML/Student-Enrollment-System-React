// src/config.js
if (!process.env.REACT_APP_API_URL) {
    throw new Error('REACT_APP_API_URL is not defined in environment variables');
  }
  
  export const API_BASE_URL = process.env.REACT_APP_API_URL;