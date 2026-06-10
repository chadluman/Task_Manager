const mongoose = require("mongoose");

const subtaskSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 240 },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const historySchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    detail: { type: String, required: true, maxlength: 300 },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 180 },
    priority: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium",
    },
    due: { type: Date, default: null },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    archived: { type: Boolean, default: false },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    assignedTeam: { type: mongoose.Schema.Types.ObjectId, ref: "Team", default: null },
    subtasks: [subtaskSchema],
    history: [historySchema],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Task", taskSchema);
