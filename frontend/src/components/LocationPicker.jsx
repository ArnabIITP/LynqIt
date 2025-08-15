
import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";


const reverseGeocode = async (lat, lon) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.display_name || null;
  } catch {
    return null;
  }
};

const LocationPicker = ({ onSelect, onCancel }) => {
  const [position, setPosition] = useState(null);
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const mapRef = useRef();


  // Auto-fetch user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          setPosition(coords);
          setLoading(false);
        },
        () => setLoading(false),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // Reverse geocode when position changes
  useEffect(() => {
    if (position) {
      setAddress("Loading address...");
      reverseGeocode(position.lat, position.lng).then((addr) => {
        setAddress(addr || "Address not found");
      });
    } else {
      setAddress("");
    }
  }, [position]);

  function LocationMarker() {
    useMapEvents({
      click(e) {
        setPosition(e.latlng);
      },
    });
    return position === null ? null : <Marker position={position} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-base-100 rounded-lg p-4 w-full max-w-md shadow-xl flex flex-col gap-4">
        <h2 className="text-lg font-bold">Share Location</h2>
        <div style={{ height: 300, width: "100%" }}>
          <MapContainer
            center={position ? [position.lat, position.lng] : [20, 0]}
            zoom={position ? 15 : 2}
            style={{ height: "100%", width: "100%" }}
            whenCreated={(mapInstance) => (mapRef.current = mapInstance)}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            <LocationMarker />
          </MapContainer>
        </div>
        <div className="text-sm min-h-[2em] location-picker-address">
          {position && address ? (
            <>
              <span className="font-semibold">Address:</span> {address}
              <br />
              <span className="text-xs text-blue-500">Tip: Wait for your location to load for best accuracy. You can move the pin if needed.</span>
            </>
          ) : loading ? (
            <>
              Fetching your location...<br />
              <span className="text-xs text-blue-500">Please wait for the most accurate result.</span>
            </>
          ) : (
            "Click on the map to select a location."
          )}
        </div>
        <div className="flex gap-2 justify-end">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={() => position && address && onSelect({ ...position, address })}
            disabled={!position || !address || loading || address === "Loading address..."}
          >
            {loading || !position || !address || address === "Loading address..." ? "Loading..." : "Share"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationPicker;
