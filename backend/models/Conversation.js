import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const conversationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    pdf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PDF',
      required: true,
    },
    messages: {
      type: [messageSchema],
      default: []
    },
    // Keep old fields for backward compatibility
    question: {
      type: String,
    },
    answer: {
      type: String,
    },
  },
  { timestamps: true } // adds createdAt and updatedAt fields automatically
);

export default mongoose.model('Conversation', conversationSchema);
