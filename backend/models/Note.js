import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema(
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
    title: {
      type: String,
      default: '', // optional
    },
    content: {
      type: String,
      required: true,
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true } // adds createdAt and updatedAt
);

noteSchema.index({ user: 1, pdf: 1 }); // Remove unique constraint to allow multiple notes per PDF


export default mongoose.model('Note', noteSchema);
