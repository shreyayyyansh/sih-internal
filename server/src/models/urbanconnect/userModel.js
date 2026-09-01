import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    auth0Id: { type: String, index: true, unique: true, sparse: true }, 
    username: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    avatar: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", userSchema);
