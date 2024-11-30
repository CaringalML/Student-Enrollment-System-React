/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useRef, useEffect, useCallback } from "react";
import Webcam from "react-webcam";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "../styles/insert.css";
// import api, { endpoints } from "../services/api";

// Fix for default marker icon in leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const fileIcons = {
  pdf: "https://img.icons8.com/?size=100&id=nDjYPbVE29Us&format=png&color=000000",
  docx: "https://img.icons8.com/?size=100&id=pGHcje298xSl&format=png&color=000000",
  xlsx: "https://img.icons8.com/?size=100&id=117561&format=png&color=000000",
  pptx: "https://img.icons8.com/?size=100&id=117557&format=png&color=000000",
  jpeg: "https://img.icons8.com/?size=100&id=114324&format=png&color=000000",
  png: "https://img.icons8.com/?size=100&id=114324&format=png&color=000000",
  jpg: "https://img.icons8.com/?size=100&id=114324&format=png&color=000000",
  txt: "https://img.icons8.com/?size=100&id=iI86e-UOulnl&format=png&color=000000",
};

// MapUpdater component
const MapUpdater = ({ center, onLocationFound }) => {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView(center, 13);
    }
  }, [center, map]);

  const handleLocationFound = (e) => {
    const { lat, lng } = e.latlng;
    onLocationFound([lat, lng]);
    map.setView([lat, lng], 13);
  };

  const handleLocationError = (error) => {
    console.error("Error getting location:", error);
    alert("Unable to get your location. Please check your browser settings.");
  };

  const handleLocateClick = () => {
    map.locate({ setView: true });
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    map.on("locationfound", handleLocationFound);
    map.on("locationerror", handleLocationError);
  
    return () => {
      map.off("locationfound", handleLocationFound);
      map.off("locationerror", handleLocationError);
    };
  }, [map]);

  const LocateButton = L.Control.extend({
    onAdd: function () {
      const btn = L.DomUtil.create(
        "button",
        "leaflet-bar leaflet-control leaflet-control-custom"
      );
      btn.innerHTML = "📍";
      btn.style.width = "30px";
      btn.style.height = "30px";
      btn.style.backgroundColor = "white";
      btn.style.cursor = "pointer";
      btn.style.border = "2px solid rgba(0,0,0,0.2)";
      btn.style.borderRadius = "4px";
      btn.title = "Get my location";

      L.DomEvent.on(btn, "click", function (e) {
        L.DomEvent.stopPropagation(e);
        handleLocateClick();
      });

      return btn;
    },
  });

  useEffect(() => {
    const locateControl = new LocateButton({ position: "topright" });
    map.addControl(locateControl);
  
    return () => {
      map.removeControl(locateControl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return null;
};

const InsertStudentModal = ({ isOpen, onClose, onConfirm }) => {
  // State declarations
  const [base64Image, setBase64Image] = useState(null);
  const [newStudent, setNewStudent] = useState({
    avatar: null,
    name: "",
    age: "",
    address: "",
    email: "",
    confirmEmail: "",
    course: "",
    student_files: [],
  });
  const [errors, setErrors] = useState({});
  const [fileList, setFileList] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  
  // Refs
  const webcamRef = useRef(null);
  const fileInputRef = useRef(null);



  // Address search states
  const [addressSearchQuery, setAddressSearchQuery] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mapCenter, setMapCenter] = useState([0, 0]);
  const [showMap, setShowMap] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const searchTimeoutRef = useRef(null);

  
 

  // Utility Functions
  const base64ToFile = async (base64String) => {
    try {
      const base64Content = base64String.includes("base64,")
        ? base64String.split("base64,")[1]
        : base64String;

      const byteCharacters = atob(base64Content);
      const byteArrays = [];

      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);

        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }

      const blob = new Blob(byteArrays, { type: "image/png" });
      const fileName = `webcam-capture-${Date.now()}.png`;

      return new File([blob], fileName, { type: "image/png" });
    } catch (error) {
      console.error("Error converting base64 to file:", error);
      return null;
    }
  };

  const validateAvatar = (file) => {
    const maxSize = 5 * 1024 * 1024;
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
    const errors = [];

    if (!file) {
      errors.push("Please select an avatar image");
      return errors;
    }

    if (!allowedTypes.includes(file.type)) {
      errors.push("Only JPG, JPEG and PNG files are allowed");
    }

    if (file.size > maxSize) {
      errors.push("File size must be less than 5MB");
    }

    return errors;
  };

  const validateForm = () => {
    let formErrors = {};
    let isValid = true;
  
    if (!newStudent.avatar && !base64Image) {
      formErrors.avatar = ["Please select or capture an avatar image"];
      isValid = false;
    }
  
    if (newStudent.email !== newStudent.confirmEmail) {
      formErrors.confirmEmail = ["Email addresses do not match"];
      isValid = false;
    }
  
    if (!newStudent.student_files.length) {
      formErrors.student_files = ["Please upload required documents"];
      isValid = false;
    }
  
    setErrors(formErrors);
    return isValid;
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      setIsGettingLocation(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        {
          headers: {
            "Accept-Language": "en-US,en;q=0.9",
          },
        }
      );
      const data = await response.json();
      return data.display_name;
    } catch (error) {
      console.error("Error reverse geocoding:", error);
      return null;
    } finally {
      setIsGettingLocation(false);
    }
  };

  const fetchAddressSuggestions = async (query) => {
    if (!query.trim()) {
      setAddressSuggestions([]);
      return;
    }

    try {
      setIsSearching(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=5`,
        {
          headers: {
            "Accept-Language": "en-US,en;q=0.9",
          },
        }
      );
      const data = await response.json();

      const suggestions = data.map((item) => ({
        display_name: item.display_name,
        lat: item.lat,
        lon: item.lon,
      }));

      setAddressSuggestions(suggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Error fetching address suggestions:", error);
      setAddressSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLocationFound = async (coordinates) => {
    const [lat, lng] = coordinates;
    setMapCenter(coordinates);

    const address = await reverseGeocode(lat, lng);
    if (address) {
      setAddressSearchQuery(address);
      setNewStudent((prev) => ({
        ...prev,
        address: address,
      }));
    }
  };

  // Clean up effects
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".address-search-container")) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const updateAvatarFromBase64 = async () => {
      if (base64Image) {
        const file = await base64ToFile(base64Image);
        if (file) {
          setNewStudent((prev) => ({
            ...prev,
            avatar: file,
          }));

          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          if (fileInputRef.current) {
            fileInputRef.current.files = dataTransfer.files;
          }
        }
      }
    };

    updateAvatarFromBase64();
  }, [base64Image]);



  // Event Handlers
  const handleAddressSearch = (e) => {
    const query = e.target.value;
    setAddressSearchQuery(query);
    setNewStudent((prev) => ({
      ...prev,
      address: query,
    }));

    if (query.trim().length > 2) {
      setShowMap(true);
    } else {
      setShowMap(false);
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      fetchAddressSuggestions(query);
    }, 300);

    if (errors.address) {
      setErrors((prev) => ({ ...prev, address: null }));
    }
  };

  const handleAddressSelect = (suggestion) => {
    setNewStudent((prev) => ({
      ...prev,
      address: suggestion.display_name,
    }));
    setAddressSearchQuery(suggestion.display_name);
    setShowSuggestions(false);
    setErrors((prev) => ({ ...prev, address: null }));
    setMapCenter([parseFloat(suggestion.lat), parseFloat(suggestion.lon)]);
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "student_files") {
      const selectedFiles = Array.from(files);
      setNewStudent((prev) => ({
        ...prev,
        [name]: files,
      }));
      setFileList(selectedFiles);
    } else if (name === "avatar") {
      const file = files[0];
      if (file) {
        const avatarErrors = validateAvatar(file);
        if (avatarErrors.length > 0) {
          setErrors((prev) => ({
            ...prev,
            avatar: avatarErrors,
          }));
          e.target.value = "";
          return;
        }

        setBase64Image(null);
        setNewStudent((prev) => ({
          ...prev,
          avatar: file,
        }));
        setErrors((prev) => ({
          ...prev,
          avatar: null,
        }));
      }
    } else {
      setNewStudent((prev) => ({ ...prev, [name]: value }));

      if (errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: null }));
      }

      if (name === "email" || name === "confirmEmail") {
        setErrors((prev) => ({ ...prev, confirmEmail: null }));
      }
    }
  };







  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
        return;
    }

    setIsSubmitting(true);

    try {
        const formData = new FormData();

        // Handle avatar upload
        if (base64Image) {
            const avatarFile = await base64ToFile(base64Image);
            if (avatarFile) {
                formData.append("avatar", avatarFile);
            } else {
                throw new Error("Failed to process captured image");
            }
        } else if (newStudent.avatar) {
            formData.append("avatar", newStudent.avatar);
        }

        // Add student details
        formData.append("name", newStudent.name);
        formData.append("age", newStudent.age);
        formData.append("address", newStudent.address);
        formData.append("email", newStudent.email);
        formData.append("course", newStudent.course);

        // Handle document files
        if (newStudent.student_files && newStudent.student_files.length > 0) {
            Array.from(newStudent.student_files).forEach((file) => {
                formData.append("student_files[]", file);
            });
        }

        const result = await onConfirm(formData);

        if (result?.data?.status === "success") {
            // Reset form
            setNewStudent({
                avatar: null,
                name: "",
                age: "",
                address: "",
                email: "",
                confirmEmail: "",
                course: "",
                student_files: [],
            });
            setBase64Image(null);
            setFileList([]);
            onClose();
        }
    } catch (error) {
        console.error("Submission error:", error.response?.data);

        // Check if the error response exists and has the expected structure
        if (error.response?.data?.errors?.image_validation) {
            const imageValidation = error.response.data.errors.image_validation;
            
            // Set errors for avatar
            setErrors(prevErrors => ({
                ...prevErrors,
                avatar: imageValidation // Store the entire image_validation object
            }));
        } 
        // Handle other validation errors
        else if (error.response?.data?.errors) {
            setErrors(error.response.data.errors);
        } 
        // Handle unexpected errors
        else {
            setErrors({
                submit: [error.message || "Failed to submit form. Please try again."]
            });
        }
    } finally {
        setIsSubmitting(false);
    }
};









  const handleClose = () => {
    setNewStudent({
      avatar: null,
      name: "",
      age: "",
      address: "",
      email: "",
      confirmEmail: "",
      course: "",
      student_files: [],
    });
    setBase64Image(null);
    setFileList([]);
    setErrors({});

    

    onClose();
  };

  const handleRemoveFile = (index) => {
    const updatedFileList = [...fileList];
    updatedFileList.splice(index, 1);
    setFileList(updatedFileList);

    const dataTransfer = new DataTransfer();
    updatedFileList.forEach((file) => {
      dataTransfer.items.add(file);
    });

    setNewStudent((prev) => ({
      ...prev,
      student_files: dataTransfer.files,
    }));
  };

  const handleFileDrop = (files) => {
    const newFileList = [...fileList, ...Array.from(files)];
    setFileList(newFileList);

    const dataTransfer = new DataTransfer();
    newFileList.forEach((file) => {
      dataTransfer.items.add(file);
    });

    setNewStudent((prev) => ({
      ...prev,
      student_files: dataTransfer.files,
    }));
  };

  const handleAvatarDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files[0];
    if (file) {
      const avatarErrors = validateAvatar(file);
      if (avatarErrors.length > 0) {
        setErrors((prev) => ({
          ...prev,
          avatar: avatarErrors,
        }));
        return;
      }

      setBase64Image(null);
      setNewStudent((prev) => ({
        ...prev,
        avatar: file,
      }));

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);

      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files;
      }

      setErrors((prev) => ({
        ...prev,
        avatar: null,
      }));
    }
  };

  const captureImage = async () => {
    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        throw new Error("Failed to capture image");
      }

      setBase64Image(imageSrc);
      setErrors((prev) => ({
        ...prev,
        avatar: null,
      }));

      setShowCamera(false);
    } catch (error) {
      console.error("Error capturing image:", error);
      setErrors((prev) => ({
        ...prev,
        avatar: ["Failed to capture image. Please try again."],
      }));
    }
  };

  // Map rendering function
  const renderMap = () => (
    <div
      style={{
        marginTop: "10px",
        border: "1px solid #ccc",
        borderRadius: "4px",
        overflow: "hidden",
        height: "300px",
        position: "relative",
      }}
    >
      <MapContainer
        center={mapCenter}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Marker position={mapCenter} />
        <MapUpdater center={mapCenter} onLocationFound={handleLocationFound} />
      </MapContainer>
      {isGettingLocation && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            padding: "10px",
            borderRadius: "4px",
            zIndex: 1000,
          }}
        >
          Getting location...
        </div>
      )}
    </div>
  );

  if (!isOpen) return null;

  // Main render
  return (
    <div className="modal-overlay">
      <div className="insert-student-modal-container">
        <div className="modal-inner-content">
          <h3>Insert New Student</h3>
          <form onSubmit={handleSubmit} className="insert-form-container">
            <div className="form-content-wrapper">
              {/* Avatar Section */}
              <div className="avatar-upload-section">
                {showCamera ? (
                  <div className="webcam-container">
                    <Webcam
                      ref={webcamRef}
                      screenshotFormat="image/png"
                      className="webcam-preview"
                      mirrored={true}
                      videoConstraints={{
                        width: 320,
                        height: 320,
                        facingMode: "user",
                        aspectRatio: 1,
                      }}
                    />
                    <div className="webcam-buttons">
                      <button
                        type="button"
                        onClick={captureImage}
                        className="capture-button"
                      >
                        Capture Photo
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCamera(false)}
                        className="cancel-button"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <label
                      htmlFor="avatar-input"
                      className={`avatar-preview-container ${
                        errors.avatar ? "error" : ""
                      }`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={handleAvatarDrop}
                    >
                      {newStudent.avatar || base64Image ? (
                        <img
                          src={
                            base64Image ||
                            (newStudent.avatar
                              ? URL.createObjectURL(newStudent.avatar)
                              : "")
                          }
                          alt="avatar preview"
                          className="avatar-preview-image"
                        />
                      ) : (
                        <div className="avatar-placeholder">
                          <img
                            src="https://i.pinimg.com/736x/c0/27/be/c027bec07c2dc08b9df60921dfd539bd.jpg"
                            alt="default avatar"
                            className="avatar-preview-image"
                          />
                          <span className="overlay-text">
                            Drop your image here or click to select
                            <br />
                            <small>Maximum size: 5MB (JPG, JPEG, PNG)</small>
                          </span>
                        </div>
                      )}
                    </label>
                    <div className="avatar-input-buttons">
                      <input
                        id="avatar-input"
                        ref={fileInputRef}
                        type="file"
                        name="avatar"
                        accept="image/jpeg,image/png,image/jpg"
                        onChange={handleChange}
                        className={`hidden-file-input ${
                          errors.avatar ? "error-input" : ""
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCamera(true)}
                        className="camera-button"
                      >
                        Open Camera
                      </button>
                    </div>
                  </>
                )}
                <span className="required-indicator">* Required</span>
                {errors.avatar && (
    <div className="error-container">
        {/* For basic validation errors */}
        {Array.isArray(errors.avatar) && (
            <div className="basic-errors">
                {errors.avatar.map((error, index) => (
                    <div key={index} className="error-message">{error}</div>
                ))}
            </div>
        )}

        {/* For server validation errors with quality assessment */}
        {errors.avatar?.message && (
            <div className="server-validation-errors">
                {/* Main error message */}
                <div className="error-header">
                    {errors.avatar.message}
                </div>

                {/* Quality issues */}
                {errors.avatar.quality_issues && errors.avatar.quality_issues.length > 0 && (
                    <div className="quality-issues">
                        <ul>
                            {errors.avatar.quality_issues.map((issue, index) => (
                                <li key={index} className="quality-issue">
                                    {issue}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Quality assessment details */}
                {errors.avatar.quality_assessment && (
                    <div className="quality-assessment">
                        <h4>Image Quality Details:</h4>
                        
                        {/* Brightness assessment */}
                        {errors.avatar.quality_assessment.brightness && (
                            <div className="quality-item">
                                <div className="quality-header">
                                    <span>Brightness: {errors.avatar.quality_assessment.brightness.value.toFixed(1)}%</span>
                                    <span className={`quality-status ${errors.avatar.quality_assessment.brightness.status}`}>
                                        {errors.avatar.quality_assessment.brightness.status}
                                    </span>
                                </div>
                                {errors.avatar.quality_assessment.brightness.recommendation && (
                                    <p className="quality-recommendation">
                                        {errors.avatar.quality_assessment.brightness.recommendation}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Sharpness assessment */}
                        {errors.avatar.quality_assessment.sharpness && (
                            <div className="quality-item">
                                <div className="quality-header">
                                    <span>Sharpness: {errors.avatar.quality_assessment.sharpness.value.toFixed(1)}%</span>
                                    <span className={`quality-status ${errors.avatar.quality_assessment.sharpness.status}`}>
                                        {errors.avatar.quality_assessment.sharpness.status}
                                    </span>
                                </div>
                                {errors.avatar.quality_assessment.sharpness.recommendation && (
                                    <p className="quality-recommendation">
                                        {errors.avatar.quality_assessment.sharpness.recommendation}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Overall quality */}
                        {errors.avatar.quality_assessment.overall_quality && (
                            <div className="overall-quality">
                                <span>Overall Quality: </span>
                                <span className={`quality-status ${errors.avatar.quality_assessment.overall_quality}`}>
                                    {errors.avatar.quality_assessment.overall_quality}
                                </span>
                            </div>
                        )}

                        {/* Warnings if any */}
                        {errors.avatar.quality_assessment.warnings && 
                         errors.avatar.quality_assessment.warnings.length > 0 && (
                            <div className="quality-warnings">
                                <h5>Warnings:</h5>
                                <ul>
                                    {errors.avatar.quality_assessment.warnings.map((warning, index) => (
                                        <li key={index}>{warning}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        )}
    </div>
)}
              </div>

              {/* Student Details Section */}
              <div className="student-details-section">
                <div className="form-group-container">
                  <label>
                    Name:
                    <input
                      type="text"
                      name="name"
                      value={newStudent.name}
                      onChange={handleChange}
                      required
                      className={errors.name ? "error-input" : ""}
                    />
                    {errors.name && (
                      <span className="error-message">{errors.name[0]}</span>
                    )}
                  </label>
                </div>

                <div className="form-group-container">
                  <label>
                    Age:
                    <input
                      type="number"
                      name="age"
                      value={newStudent.age}
                      onChange={handleChange}
                      required
                      className={errors.age ? "error-input" : ""}
                    />
                    {errors.age && (
                      <span className="error-message">{errors.age[0]}</span>
                    )}
                  </label>
                </div>

                <div className="form-group-container">
                  <label>
                    Address:
                    <div className="address-search-container">
                      <input
                        type="text"
                        value={addressSearchQuery}
                        onChange={handleAddressSearch}
                        placeholder="Search for an address..."
                        required
                        className={`address-input ${
                          errors.address ? "error-input" : ""
                        }`}
                      />
                      {isSearching && (
                        <div className="searching-indicator">Searching...</div>
                      )}
                      {showSuggestions && addressSuggestions.length > 0 && (
                        <ul className="address-suggestions">
                          {addressSuggestions.map((suggestion, index) => (
                            <li
                              key={index}
                              onClick={() => handleAddressSelect(suggestion)}
                              className="address-suggestion-item"
                            >
                              {suggestion.display_name}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {showMap && renderMap()}
                    {errors.address && (
                      <span className="error-message">{errors.address[0]}</span>
                    )}
                  </label>
                </div>

                <div className="form-group-container">
                  <label>
                    Email:
                    <input
                      type="email"
                      name="email"
                      value={newStudent.email}
                      onChange={handleChange}
                      required
                      className={errors.email ? "error-input" : ""}
                    />
                    {errors.email && (
                      <span className="error-message">{errors.email[0]}</span>
                    )}
                  </label>
                </div>

                <div className="form-group-container">
                  <label>
                    Confirm Email:
                    <input
                      type="email"
                      name="confirmEmail"
                      value={newStudent.confirmEmail}
                      onChange={handleChange}
                      required
                      className={errors.confirmEmail ? "error-input" : ""}
                    />
                    {errors.confirmEmail && (
                      <span className="error-message">
                        {errors.confirmEmail[0]}
                      </span>
                    )}
                  </label>
                </div>

                <div className="form-group-container">
                  <label>
                    Course:
                    <input
                      type="text"
                      name="course"
                      value={newStudent.course}
                      onChange={handleChange}
                      required
                      className={errors.course ? "error-input" : ""}
                    />
                    {errors.course && (
                      <span className="error-message">{errors.course[0]}</span>
                    )}
                  </label>
                </div>

                {/* File Upload Section */}
                <div className="form-group-container">
                  <p>
                    Please attach the required documents: Transcript of Records,
                    Birth Certificate, and X-ray/Medical Certificate.
                  </p>

                  {fileList.length === 0 && (
                    <div
                      className="file-upload-placeholder"
                      onClick={() =>
                        document.getElementById("file-upload").click()
                      }
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const files = Array.from(e.dataTransfer.files);
                        handleFileDrop(files);
                      }}
                    >
                      <p>Drag & Drop files here or Click to browse</p>
                      <input
                        type="file"
                        name="student_files"
                        accept=".pdf,.docx,.xlsx,.pptx,.jpeg,.jpg,.png,.txt"
                        onChange={handleChange}
                        multiple
                        className="hidden-input"
                        id="file-upload"
                        required
                      />
                    </div>
                  )}

                  <div className="file-preview-container">
                    {fileList.length > 0 && (
                      <div className="file-list">
                        {fileList.map((file, index) => {
                          const fileExtension = file.name
                            .split(".")
                            .pop()
                            .toLowerCase();
                          const iconUrl =
                            fileIcons[fileExtension] || fileIcons.txt;

                          return (
                            <div key={index} className="file-item">
                              <img
                                src={iconUrl}
                                alt={`${fileExtension} icon`}
                                className="file-icon"
                              />
                              <span>{file.name}</span>
                              <button
                                type="button"
                                className="remove-file-button"
                                onClick={() => handleRemoveFile(index)}
                                title="Remove file"
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {errors.student_files && (
                    <span className="error-message">
                      {errors.student_files[0]}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="action-button-container">
              <button
                type="submit"
                className="insert-student-modal__submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Adding..." : "Add Student"}
              </button>
              <button
                type="button"
                className="cancel-button"
                onClick={handleClose}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InsertStudentModal;