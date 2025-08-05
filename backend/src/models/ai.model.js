import mongoose from "mongoose";

const aiConversationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  messages: [
    {
      role: {
        type: String,
        enum: ["user", "assistant"],
        required: true,
      },
      content: {
        type: String,
        required: true,
      },
      attachments: [
        {
          url: String,
          fileType: String,
          fileName: String,
          mimeType: String,
        }
      ],
      timestamp: {
        type: Date,
        default: Date.now,
      },
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

const AIConversation = mongoose.model("AIConversation", aiConversationSchema);

export default AIConversation;
