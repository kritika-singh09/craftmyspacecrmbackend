import multer from 'multer';
import cloudinary from '../config/cloudinary.js';


// Checking package.json... No streamifier.
// I'll use a standard upload with buffer or temp file.
// Or I can just use a simple memory storage and upload.

const storage = multer.memoryStorage();
export const upload = multer({ storage });

export const uploadToCloudinary = (buffer) => {
    return new Promise((resolve, reject) => {
        let stream = cloudinary.uploader.upload_stream(
            { folder: 'safety' },
            (error, result) => {
                if (result) {
                    resolve(result.secure_url);
                } else {
                    reject(error);
                }
            }
        );
        // Writing buffer to stream without streamifier
        stream.end(buffer);
    });
};
