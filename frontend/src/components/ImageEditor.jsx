import React, { useState, useCallback, useRef } from 'react';
import Cropper from 'react-easy-crop';
import Slider from '@mui/material/Slider';
import Button from '@mui/material/Button';
import { getCroppedImg } from '../lib/cropImageUtils';

const ImageEditor = ({ imageSrc, onSave, onCancel }) => {
		const [crop, setCrop] = useState({ x: 0, y: 0 });
		const [zoom, setZoom] = useState(1);
		const [rotation, setRotation] = useState(0);
		const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
		const [isSaving, setIsSaving] = useState(false);
		const [aspect, setAspect] = useState(null); // null = freeform

	const onCropComplete = useCallback((_, croppedAreaPixels) => {
		setCroppedAreaPixels(croppedAreaPixels);
	}, []);

		const handleSave = useCallback(async () => {
			setIsSaving(true);
			try {
				if (!croppedAreaPixels) {
					alert('Please select a crop area.');
					setIsSaving(false);
					return;
				}
				const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
				// Convert blob to file and preview URL
				const file = new File([croppedImage], 'edited.jpg', { type: 'image/jpeg' });
				const url = URL.createObjectURL(croppedImage);
				onSave(croppedImage, file, url);
			} catch (e) {
				alert('Failed to crop image');
			}
			setIsSaving(false);
		}, [imageSrc, croppedAreaPixels, rotation, onSave]);

		return (
			<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
				<div className="bg-base-100 rounded-lg p-4 shadow-xl w-full max-w-md flex flex-col items-center">
					<div className="relative w-full h-80 bg-gray-200 rounded-lg overflow-hidden">
						<Cropper
							image={imageSrc}
							crop={crop}
							zoom={zoom}
							rotation={rotation}
							aspect={aspect} // null = freeform
							onCropChange={setCrop}
							onZoomChange={setZoom}
							onRotationChange={setRotation}
							onCropComplete={onCropComplete}
							cropShape="rect"
							showGrid={true}
							restrictPosition={false}
						/>
					</div>
					<div className="w-full flex flex-col gap-3 mt-4">
						<div className="flex gap-2 items-center justify-center mb-2">
							<label className="text-xs">Aspect:</label>
							<button className={`btn btn-xs ${aspect === null ? 'btn-primary' : 'btn-outline'}`} onClick={() => setAspect(null)} type="button">Free</button>
							<button className={`btn btn-xs ${aspect === 1 ? 'btn-primary' : 'btn-outline'}`} onClick={() => setAspect(1)} type="button">1:1</button>
							<button className={`btn btn-xs ${aspect === 4/3 ? 'btn-primary' : 'btn-outline'}`} onClick={() => setAspect(4/3)} type="button">4:3</button>
							<button className={`btn btn-xs ${aspect === 16/9 ? 'btn-primary' : 'btn-outline'}`} onClick={() => setAspect(16/9)} type="button">16:9</button>
						</div>
						<label>Zoom</label>
						<Slider min={1} max={3} step={0.01} value={zoom} onChange={(_, v) => setZoom(v)} />
						<label>Rotate</label>
						<Slider min={0} max={360} step={1} value={rotation} onChange={(_, v) => setRotation(v)} />
					</div>
					<div className="flex gap-4 mt-6">
						<Button variant="outlined" onClick={onCancel} disabled={isSaving}>Cancel</Button>
						<Button variant="contained" onClick={handleSave} disabled={isSaving}>Save</Button>
					</div>
				</div>
			</div>
		);
};

export default ImageEditor;
