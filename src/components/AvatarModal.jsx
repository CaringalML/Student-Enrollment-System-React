import React, { useState, useCallback, useRef, useEffect } from 'react';
import '../styles/avatar-modal.css';

const AvatarModal = ({ imageUrl, isOpen, onClose }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
  const [lastDistance, setLastDistance] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setIsDragging(false);
      setLastDistance(null);
    }
  }, [isOpen]);

  // Handle mouse wheel zooms
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY * -0.002;
    const currentScale = scale;
    const newScale = Math.min(Math.max(1, scale + delta), 4);

    if (containerRef.current) {
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 });
        setScale(1);
        return;
      }

      if (newScale > currentScale) {
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const distanceX = mouseX - centerX;
        const distanceY = mouseY - centerY;

        const scaleFactor = (newScale - currentScale) / currentScale;
        const moveX = distanceX * scaleFactor;
        const moveY = distanceY * scaleFactor;

        setScale(newScale);
        setPosition(prev => ({
          x: prev.x - moveX,
          y: prev.y - moveY
        }));
      } else {
        const centeringFactor = (currentScale - newScale) / currentScale;
        setScale(newScale);
        setPosition(prev => ({
          x: prev.x * (1 - centeringFactor),
          y: prev.y * (1 - centeringFactor)
        }));
      }
    }
  }, [scale]);

  // Handle mouse events
  const handleMouseDown = (e) => {
    if (scale > 1) {
      setIsDragging(true);
      setStartPosition({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && scale > 1) {
      const newX = e.clientX - startPosition.x;
      const newY = e.clientY - startPosition.y;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const maxX = (rect.width * (scale - 1)) / 2;
      const maxY = (rect.height * (scale - 1)) / 2;

      setPosition({
        x: Math.min(Math.max(newX, -maxX), maxX),
        y: Math.min(Math.max(newY, -maxY), maxY)
      });
    }
  };

  // Handle touch events
  const handleTouchStart = (e) => {
    e.preventDefault(); // Prevent default touch behavior
    if (e.touches.length === 2) {
      // Store the initial distance between two fingers for pinch zoom
      const distance = getDistanceBetweenTouches(e.touches);
      setLastDistance(distance);
    } else if (e.touches.length === 1 && scale > 1) {
      // Single touch for panning
      setIsDragging(true);
      setStartPosition({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      });
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    if (e.touches.length === 2) {
      // Handle pinch zoom
      const currentDistance = getDistanceBetweenTouches(e.touches);
      if (lastDistance) {
        const delta = (currentDistance - lastDistance) * 0.01;
        const newScale = Math.min(Math.max(1, scale + delta), 4);
        setScale(newScale);

        // Center the zoom
        if (newScale === 1) {
          setPosition({ x: 0, y: 0 });
        }
      }
      setLastDistance(currentDistance);
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      // Handle single touch panning
      const newX = e.touches[0].clientX - startPosition.x;
      const newY = e.touches[0].clientY - startPosition.y;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const maxX = (rect.width * (scale - 1)) / 2;
      const maxY = (rect.height * (scale - 1)) / 2;

      setPosition({
        x: Math.min(Math.max(newX, -maxX), maxX),
        y: Math.min(Math.max(newY, -maxY), maxY)
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setLastDistance(null);
  };

  // Helper function to calculate distance between two touch points
  const getDistanceBetweenTouches = (touches) => {
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.hypot(
      touch2.clientX - touch1.clientX,
      touch2.clientY - touch1.clientY
    );
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  if (!isOpen) return null;

  return (
    <div className="avatar-modal-overlay">
      <div className="avatar-modal-background" onClick={onClose} />
      <div 
        className="avatar-modal-content"
        onWheel={handleWheel}
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div className="zoom-info">
          Scroll or pinch to zoom. Drag to move when zoomed.
          Double-tap to reset.
        </div>
        <img 
          src={imageUrl} 
          alt="Full size avatar" 
          className="avatar-modal-image"
          style={{ 
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in'
          }}
          onDoubleClick={handleDoubleClick}
          draggable={false}
        />
      </div>
    </div>
  );
};

export default AvatarModal;