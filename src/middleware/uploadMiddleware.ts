import multer from 'multer';
import path from 'path';

const storage = multer.memoryStorage();

// File Filter: Accept only Images
const checkFileType = (file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const filetypes = /jpeg|jpg|png|webp/;
  // Check extension
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime type
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Images only! (jpeg, jpg, png, webp)'));
  }
};

export const upload = multer({
  storage,
  limits: { fileSize: 5000000 }, // Limit: 5MB
  fileFilter: function (_req, file, cb) {
    checkFileType(file, cb);
  },
});