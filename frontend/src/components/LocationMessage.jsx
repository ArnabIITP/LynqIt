import React from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Check } from "lucide-react";

// status: "sent", "delivered", "seen"; time: formatted string
const statusText = {
	sent: "Sent",
	delivered: "Delivered",
	seen: "Seen"
};


const LocationMessage = ({ lat, lng, address, time, status }) => {
	return (
		<div className="flex flex-col items-end max-w-xs">
			<div className="bg-base-200 rounded-lg p-3 border border-base-300 w-full">
				<div style={{ height: 180, width: "100%" }}>
					<MapContainer center={[lat, lng]} zoom={15} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false} dragging={false} doubleClickZoom={false} zoomControl={false} attributionControl={false}>
						<TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
						<Marker position={[lat, lng]} />
					</MapContainer>
				</div>
				   <div className="text-sm mt-2">
					   <span className="font-medium location-address">{address || "Shared Location"}</span>
				   </div>
				<a
					href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`}
					target="_blank"
					rel="noopener noreferrer"
					className="text-xs text-blue-600 underline mt-1"
				>
					View on map
				</a>
			</div>
			<div className="flex items-center gap-1 mt-1 pr-1">
				<span className="text-xs text-gray-500">{time}</span>
				<span className="flex items-center gap-0.5 text-xs text-blue-500 bg-blue-50 rounded-full px-2 py-0.5 border border-blue-100">
					<Check size={14} />
					{statusText[status] || status}
				</span>
			</div>
		</div>
	);
};

export default LocationMessage;
