import cv2
import numpy as np
import pytesseract
from PIL import Image
import io

def redact_image_content(image_bytes: bytes) -> bytes:
    """
    Detects faces and text in an image and blurs them for privacy.
    Returns the modified image bytes.
    """
    # Convert bytes to numpy array
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        # If OpenCV can't decode it, return original (might be another format)
        return image_bytes
        
    # 1. Face Detection and Blurring
    try:
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
        
        for (x, y, w, h) in faces:
            # Add some padding to the face bounding box
            pad_x = int(w * 0.1)
            pad_y = int(h * 0.1)
            x1 = max(0, x - pad_x)
            y1 = max(0, y - pad_y)
            x2 = min(img.shape[1], x + w + pad_x)
            y2 = min(img.shape[0], y + h + pad_y)
            
            roi = img[y1:y2, x1:x2]
            # Heavy blur
            blurred = cv2.GaussianBlur(roi, (51, 51), 30)
            img[y1:y2, x1:x2] = blurred
    except Exception as e:
        print(f"Face redaction failed: {e}")

    # 2. Text Detection and Blurring
    try:
        # Get dictionary of bounding boxes and confidences
        d = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
        n_boxes = len(d['text'])
        for i in range(n_boxes):
            if int(d['conf'][i]) > 60:  # Confidence > 60%
                text = d['text'][i].strip()
                if not text:
                    continue
                    
                (x, y, w, h) = (d['left'][i], d['top'][i], d['width'][i], d['height'][i])
                
                # Only blur reasonably sized boxes
                if w > 5 and h > 5:
                    # Slight padding
                    x1 = max(0, x - 2)
                    y1 = max(0, y - 2)
                    x2 = min(img.shape[1], x + w + 2)
                    y2 = min(img.shape[0], y + h + 2)
                    
                    roi = img[y1:y2, x1:x2]
                    # Substantial blur to make text illegible
                    blurred = cv2.GaussianBlur(roi, (21, 21), 10)
                    img[y1:y2, x1:x2] = blurred
    except Exception as e:
        print(f"Text redaction failed: {e}")

    # 3. Re-encode to JPEG
    success, encoded_img = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 85])
    if success:
        return encoded_img.tobytes()
        
    return image_bytes

def redact_audio_content(audio_bytes: bytes) -> bytes:
    """
    Modulates voice by shifting pitch and adding slight distortion to anonymize the speaker.
    Returns the modified MP3 bytes.
    """
    try:
        from pydub import AudioSegment
    except ImportError:
        return audio_bytes # pydub not available
        
    try:
        # Load audio from bytes
        audio = AudioSegment.from_file(io.BytesIO(audio_bytes))
        
        # Shift pitch down by changing sample rate and frame rate
        # This is a common basic anonymization technique
        new_sample_rate = int(audio.frame_rate * 0.75) # Deepen the voice
        shifted = audio._spawn(audio.raw_data, overrides={'frame_rate': new_sample_rate})
        shifted = shifted.set_frame_rate(audio.frame_rate)
        
        # Add slight static/noise to further mask characteristics
        # Generate some white noise
        import random
        noise_raw = bytearray((random.randint(0, 255) for _ in range(len(shifted.raw_data))))
        noise = audio._spawn(noise_raw)
        
        # Overlay a very quiet version of the noise
        final_audio = shifted.overlay(noise - 30)
        
        # Export back to mp3
        out_buf = io.BytesIO()
        final_audio.export(out_buf, format="mp3")
        return out_buf.getvalue()
    except Exception as e:
        print(f"Audio redaction failed: {e}")
        return audio_bytes
