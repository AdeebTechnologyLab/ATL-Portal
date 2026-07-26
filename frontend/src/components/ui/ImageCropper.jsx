import { useState, useRef, useCallback, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Check, RotateCcw, Crop } from 'lucide-react';

/**
 * ImageCropper — WYSIWYG square crop: exactly what you see in the frame is saved to the profile photo.
 */
const ImageCropper = ({ imageSrc, onCrop, onCancel }) => {
    const canvasRef = useRef(null);
    const imgRef = useRef(new Image());
    const dragStart = useRef(null);

    const [baseScale, setBaseScale] = useState(1);
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [imgLoaded, setImgLoaded] = useState(false);

    const CANVAS_SIZE = 320;
    const OUTPUT_SIZE = 400;

    const getScale = useCallback(() => baseScale * zoom, [baseScale, zoom]);

    const getImageLayout = useCallback(() => {
        const img = imgRef.current;
        const scale = getScale();
        const iw = img.naturalWidth * scale;
        const ih = img.naturalHeight * scale;
        const x = (CANVAS_SIZE - iw) / 2 + offset.x;
        const y = (CANVAS_SIZE - ih) / 2 + offset.y;
        return { scale, iw, ih, x, y };
    }, [getScale, offset]);

    const fitImageToFrame = useCallback(() => {
        const img = imgRef.current;
        if (!img.naturalWidth || !img.naturalHeight) return;
        const cover = Math.max(
            CANVAS_SIZE / img.naturalWidth,
            CANVAS_SIZE / img.naturalHeight
        );
        setBaseScale(cover);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
    }, []);

    useEffect(() => {
        const img = imgRef.current;
        img.onload = () => {
            setImgLoaded(true);
            fitImageToFrame();
        };
        img.src = imageSrc;
    }, [imageSrc, fitImageToFrame]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !imgLoaded) return;
        const ctx = canvas.getContext('2d');
        const img = imgRef.current;
        const { x, y, iw, ih } = getImageLayout();

        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        ctx.drawImage(img, x, y, iw, ih);

        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(1, 1, CANVAS_SIZE - 2, CANVAS_SIZE - 2);
        ctx.setLineDash([]);
        ctx.restore();
    }, [getImageLayout, imgLoaded]);

    useEffect(() => {
        draw();
    }, [draw]);

    const handleMouseDown = (e) => {
        setIsDragging(true);
        dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
    };
    const handleMouseMove = (e) => {
        if (!isDragging || !dragStart.current) return;
        setOffset({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
    };
    const handleMouseUp = () => {
        setIsDragging(false);
        dragStart.current = null;
    };

    const handleTouchStart = (e) => {
        const t = e.touches[0];
        setIsDragging(true);
        dragStart.current = { x: t.clientX - offset.x, y: t.clientY - offset.y };
    };
    const handleTouchMove = (e) => {
        if (!isDragging || !dragStart.current) return;
        const t = e.touches[0];
        setOffset({ x: t.clientX - dragStart.current.x, y: t.clientY - dragStart.current.y });
    };

    const handleConfirm = () => {
        const img = imgRef.current;
        const { scale, x, y } = getImageLayout();

        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = OUTPUT_SIZE;
        cropCanvas.height = OUTPUT_SIZE;
        const ctx = cropCanvas.getContext('2d');

        const srcX = (0 - x) / scale;
        const srcY = (0 - y) / scale;
        const srcW = CANVAS_SIZE / scale;
        const srcH = CANVAS_SIZE / scale;

        ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

        const processBlob = (quality) => {
            cropCanvas.toBlob(
                (blob) => {
                    if (!blob) return;
                    if (blob.size > 1 * 1024 * 1024 && quality > 0.1) {
                        processBlob(quality - 0.1);
                    } else {
                        const file = new File([blob], 'profile_photo.jpg', { type: 'image/jpeg' });
                        const dataUrl = cropCanvas.toDataURL('image/jpeg', quality);
                        onCrop(file, dataUrl);
                    }
                },
                'image/jpeg',
                quality
            );
        };

        processBlob(0.92);
    };

    const handleReset = () => {
        fitImageToFrame();
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <div className="flex items-center gap-2">
                        <Crop className="w-5 h-5 text-gray-600" />
                        <h2 className="font-bold text-gray-900 text-lg">Crop Your Photo</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="flex flex-col items-center px-6 py-5 gap-3 bg-gray-900">
                    <p className="text-gray-400 text-xs text-center">
                        Jo frame mein dikhe wahi profile photo par lagegi — drag aur zoom karein
                    </p>
                    <canvas
                        ref={canvasRef}
                        width={CANVAS_SIZE}
                        height={CANVAS_SIZE}
                        className="rounded-2xl cursor-grab active:cursor-grabbing shadow-lg"
                        style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleMouseUp}
                    />
                </div>

                <div className="flex items-center gap-3 px-6 py-4 border-b bg-gray-50">
                    <ZoomOut className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <input
                        type="range"
                        min="1"
                        max="3"
                        step="0.01"
                        value={zoom}
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        className="flex-1 accent-primary h-1.5 cursor-pointer"
                    />
                    <ZoomIn className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-xs text-gray-500 w-10 text-right">{Math.round(zoom * 100)}%</span>
                </div>

                <div className="flex gap-3 px-6 py-4">
                    <button
                        type="button"
                        onClick={handleReset}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Reset
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-semibold transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-lg"
                    >
                        <Check className="w-4 h-4" />
                        Use Photo
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImageCropper;
