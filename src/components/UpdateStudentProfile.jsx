import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { updateStudent, uploadStudentAvatar } from '../services/api';
import '../styles/update-student-profile.css';

// Fix for default marker icon in leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
    iconUrl: require("leaflet/dist/images/marker-icon.png"),
    shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

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

    const handleLocateClick = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        map.locate({ setView: true });
    };

    useEffect(() => {
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
            btn.type = "button";
            
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });

            L.DomEvent
                .disableClickPropagation(btn)
                .disableScrollPropagation(btn)
                .on(btn, 'click', handleLocateClick);

            return btn;
        },
    });

    useEffect(() => {
        const locateControl = new LocateButton({ position: "topright" });
        map.addControl(locateControl);

        return () => {
            map.removeControl(locateControl);
        };
    }, [map]);

    return null;
};

const UpdateStudentProfile = ({ studentId, initialData, onSuccess, onCancel }) => {
    const [formData, setFormData] = useState({
        name: '',
        age: '',
        address: '',
        email: '',
        course: '',
        ...initialData
    });

    const [errors, setErrors] = useState({});
    const [avatar, setAvatar] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const fileInputRef = useRef(null);

    // Address search states
    const [addressSearchQuery, setAddressSearchQuery] = useState('');
    const [addressSuggestions, setAddressSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [mapCenter, setMapCenter] = useState([0, 0]);
    const [showMap, setShowMap] = useState(false);
    const [isGettingLocation, setIsGettingLocation] = useState(false);
    const searchTimeoutRef = useRef(null);

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
            setAddressSearchQuery(initialData.address || '');
            if (initialData.avatar_url) {
                setAvatarPreview(initialData.avatar_url);
            }
        }
    }, [initialData]);

    const validateForm = () => {
        const newErrors = {};
        
        if (formData.name && formData.name.length > 255) {
            newErrors.name = 'Name must not exceed 255 characters';
        }
        
        if (formData.age && (isNaN(formData.age) || formData.age < 1)) {
            newErrors.age = 'Age must be a positive number';
        }
        
        if (formData.address && formData.address.length > 255) {
            newErrors.address = 'Address must not exceed 255 characters';
        }
        
        if (formData.course && formData.course.length > 255) {
            newErrors.course = 'Course must not exceed 255 characters';
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (formData.email && !emailRegex.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
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

    const handleLocationFound = async (coordinates) => {
        const [lat, lng] = coordinates;
        setMapCenter(coordinates);

        const address = await reverseGeocode(lat, lng);
        if (address) {
            setAddressSearchQuery(address);
            setFormData(prev => ({
                ...prev,
                address: address
            }));
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

    const handleAddressSearch = (e) => {
        const query = e.target.value;
        setAddressSearchQuery(query);
        setFormData(prev => ({
            ...prev,
            address: query
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
            setErrors(prev => ({ ...prev, address: null }));
        }
    };

    const handleAddressSelect = (suggestion) => {
        setFormData(prev => ({
            ...prev,
            address: suggestion.display_name
        }));
        setAddressSearchQuery(suggestion.display_name);
        setShowSuggestions(false);
        setErrors(prev => ({ ...prev, address: null }));
        setMapCenter([parseFloat(suggestion.lat), parseFloat(suggestion.lon)]);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                showMessage('Image size should not exceed 2MB', 'error');
                return;
            }
            
            const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'];
            if (!validTypes.includes(file.type)) {
                showMessage('Please upload a valid image file (JPEG, PNG, GIF)', 'error');
                return;
            }

            setAvatar(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current.click();
    };

    const showMessage = (text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    };

    const renderMap = () => (
        <div className="usp-map-container">
            <MapContainer
                center={mapCenter}
                zoom={13}
                style={{ height: "300px", width: "100%" }}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <Marker position={mapCenter} />
                <MapUpdater center={mapCenter} onLocationFound={handleLocationFound} />
            </MapContainer>
            {isGettingLocation && (
                <div className="usp-location-loading">
                    Getting location...
                </div>
            )}
        </div>
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            showMessage('Please correct the errors in the form', 'error');
            return;
        }

        setLoading(true);
        try {
            let avatarUrl = initialData.avatar_url;
            if (avatar) {
                const avatarResponse = await uploadStudentAvatar(studentId, avatar);
                if (avatarResponse.data.temporary_url) {
                    avatarUrl = avatarResponse.data.temporary_url;
                }
            }

            const changedData = {};
            Object.keys(formData).forEach(key => {
                if (formData[key] !== initialData[key]) {
                    changedData[key] = formData[key];
                }
            });

            if (Object.keys(changedData).length > 0 || avatar) {
                const updateResponse = await updateStudent(studentId, changedData);
                
                if (updateResponse.data.status === 'success') {
                    showMessage(updateResponse.data.message || 'Profile updated successfully');
                    onSuccess({
                        ...updateResponse.data.data,
                        avatar_url: avatarUrl
                    });
                }
            } else {
                onCancel();
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
                showMessage('Please correct the validation errors', 'error');
            } else {
                showMessage(
                    error.response?.data?.message || 'Error updating profile', 
                    'error'
                );
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.usp-address-search-container')) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    if (!initialData) return null;

    return (
        <div className="usp-container">
            <form onSubmit={handleSubmit} className="usp-form">
                <div className="usp-avatar-section" onClick={handleAvatarClick}>
                    <div className="usp-avatar-container">
                        {avatarPreview ? (
                            <>
                                <img 
                                    src={avatarPreview} 
                                    alt="Profile Preview" 
                                    className="usp-avatar-preview"
                                />
                                <div className="usp-avatar-overlay">
                                    <span>Click to Change Photo</span>
                                </div>
                            </>
                        ) : (
                            <div className="usp-avatar-placeholder">
                                <i className="fas fa-cloud-upload-alt"></i>
                                <div className="usp-upload-text">Upload Profile Photo</div>
                                <div className="usp-upload-subtext">
                                    Click to browse or drag an image here
                                </div>
                            </div>
                        )}
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleAvatarChange}
                        accept="image/jpeg,image/png,image/gif"
                        className="usp-hidden"
                    />
                </div>

                <div className="usp-form-group">
                    <label htmlFor="name">Full Name</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name || ''}
                        onChange={handleInputChange}
                        maxLength="255"
                        className={errors.name ? 'usp-error' : ''}
                    />
                    {errors.name && <span className="usp-error-message">{errors.name}</span>}
                </div>

                <div className="usp-form-group">
                    <label htmlFor="age">Age</label>
                    <input
                        type="number"
                        id="age"
                        name="age"
                        value={formData.age || ''}
                        onChange={handleInputChange}
                        min="1"
                        className={errors.age ? 'usp-error' : ''}
                    />
                    {errors.age && <span className="usp-error-message">{errors.age}</span>}
                </div>

                <div className="usp-form-group">
                    <label htmlFor="email">Email</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email || ''}
                        onChange={handleInputChange}
                        className={errors.email ? 'usp-error' : ''}
                    />
                    {errors.email && <span className="usp-error-message">{errors.email}</span>}
                </div>

                <div className="usp-form-group">
                    <label htmlFor="course">Course</label>
                    <input
                        type="text"
                        id="course"
                        name="course"
                        value={formData.course || ''}
                        onChange={handleInputChange}
                        maxLength="255"
                        className={errors.course ? 'usp-error' : ''}
                    />
                    {errors.course && <span className="usp-error-message">{errors.course}</span>}
                </div>

                <div className="usp-form-group">
                    <label htmlFor="address">Address</label>
                    <div className="usp-address-search-container">
                        <input
                            type="text"
                            id="address"
                            value={addressSearchQuery}
                            onChange={handleAddressSearch}
                            placeholder="Search for an address..."
                            className={`usp-address-input ${errors.address ? 'usp-error' : ''}`}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                }
                            }}
                        />
                        {isSearching && (
                            <div className="usp-searching-indicator">Searching...</div>
                        )}
                        {showSuggestions && addressSuggestions.length > 0 && (
                            <ul className="usp-address-suggestions">
                                {addressSuggestions.map((suggestion, index) => (
                                    <li
                                        key={index}
                                        onClick={() => handleAddressSelect(suggestion)}
                                        className="usp-address-suggestion-item"
                                    >
                                        {suggestion.display_name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    {showMap && renderMap()}
                    {errors.address && <span className="usp-error-message">{errors.address}</span>}
                </div>

                {message.text && (
                    <div className={`usp-message ${message.type === 'error' ? 'usp-error' : 'usp-success'}`}>
                        {message.text}
                    </div>
                )}

                <div className="usp-button-group">
                    <button 
                        type="button" 
                        className="usp-cancel-button"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        className={`usp-submit-button ${loading ? 'usp-loading' : ''}`}
                        disabled={loading}
                    >
                        {loading ? 'Updating...' : 'Update Profile'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default UpdateStudentProfile;