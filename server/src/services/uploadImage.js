import cloudinary from "../../config/cloudinary.js";

export const uploadImage = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: "donations" }, // folder in Cloudinary
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    ).end(fileBuffer);
  });
};
export const imagekindshare = async (req, res) => {

  try {

    const result = await cloudinary.uploader.upload(req.file.path);

    res.json({
      imageUrl: result.secure_url
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Image upload failed"
    });

  }

};
