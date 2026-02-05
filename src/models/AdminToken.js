import mongoose from "mongoose";

const adminTokenSchema = new mongoose.Schema({
  adminId: {
    type: String,
    required: true,
    index: true,
  },

  tokenHash: {
    type: String,
    required: true,
    unique: true,
  },

  expiresAt: {
    type: Date,
    required: true,
    index: true,
  },

  revoked: {
    type: Boolean,
    default: false,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("AdminToken", adminTokenSchema);
