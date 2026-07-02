
const multer = require('multer');
const path = require('path');
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}_${uniqueSuffix}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fieldSize: 100 * 1024 * 1024, fileSize: 50 * 1024 * 1024, files: 20 }
});
module.exports = upload;
