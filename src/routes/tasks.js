const express = require("express");
const mongoose = require("mongoose");

const Task = require("../models/Task");
const User = require("../models/User");
const requireAuth = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

const taskPopulation = [
  { path: "owner", select: "name email" },
  { path: "assignedTo", select: "name email" },
  { path: "assignedTeam", select: "name slug" },
  { path: "history.actor", select: "name" },
];

function visibleQuery(user) {
  return {
    $or: [
      { owner: user._id },
      { assignedTo: user._id },
      ...(user.team?._id ? [{ assignedTeam: user.team._id }] : []),
    ],
  };
}

function addHistory(task, actor, action, detail) {
  task.history.push({ actor: actor._id, action, detail, at: new Date() });
}

async function validateAssignments(user, assignedTo, assignedTeam) {
  if (assignedTo && !(await User.exists({ _id: assignedTo, team: user.team._id }))) {
    return "Tasks can only be assigned to members of your team.";
  }
  if (assignedTeam && assignedTeam.toString() !== user.team._id.toString()) {
    return "Tasks can only be assigned to your team.";
  }
  return null;
}

async function findEditableTask(request, response) {
  if (!mongoose.isValidObjectId(request.params.id)) {
    response.status(404).json({ message: "Task not found." });
    return null;
  }

  const task = await Task.findOne({ _id: request.params.id, ...visibleQuery(request.user) });
  if (!task) {
    response.status(404).json({ message: "Task not found." });
    return null;
  }
  return task;
}

async function populatedTask(task) {
  await task.populate(taskPopulation);
  return task;
}

router.get("/", async (request, response, next) => {
  try {
    const includeArchived = request.query.archived === "true";
    const tasks = await Task.find({
      ...visibleQuery(request.user),
      archived: includeArchived ? true : false,
    })
      .sort({ completed: 1, createdAt: -1 })
      .populate(taskPopulation);
    response.json({ tasks });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (request, response, next) => {
  try {
    const title = request.body.title?.trim();
    if (!title) {
      return response.status(400).json({ message: "Task title is required." });
    }

    const assignedTo = request.body.assignedTo || null;
    const assignedTeam = request.body.assignedTeam || null;
    const assignmentError = await validateAssignments(request.user, assignedTo, assignedTeam);
    if (assignmentError) {
      return response.status(400).json({ message: assignmentError });
    }

    const task = await Task.create({
      title,
      priority: request.body.priority,
      due: request.body.due || null,
      owner: request.user._id,
      assignedTo,
      assignedTeam,
      history: [
        {
          actor: request.user._id,
          action: "created",
          detail: "Created the task.",
        },
      ],
    });

    response.status(201).json({ task: await populatedTask(task) });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", async (request, response, next) => {
  try {
    const task = await findEditableTask(request, response);
    if (!task) return;

    if (typeof request.body.completed === "boolean" && request.body.completed !== task.completed) {
      task.completed = request.body.completed;
      task.completedAt = task.completed ? new Date() : null;
      if (task.completed) {
        task.subtasks.forEach((subtask) => {
          subtask.completed = true;
        });
      }
      addHistory(
        task,
        request.user,
        task.completed ? "completed" : "reopened",
        task.completed ? "Marked the task complete." : "Reopened the task.",
      );
    }

    if (request.body.title?.trim() && request.body.title.trim() !== task.title) {
      task.title = request.body.title.trim();
      addHistory(task, request.user, "updated", "Changed the task title.");
    }
    if (["high", "medium", "low"].includes(request.body.priority)) {
      task.priority = request.body.priority;
    }
    if (Object.hasOwn(request.body, "due")) {
      task.due = request.body.due || null;
    }

    if (Object.hasOwn(request.body, "assignedTo")) {
      const assignedTo = request.body.assignedTo || null;
      const assignmentError = await validateAssignments(request.user, assignedTo, null);
      if (assignmentError) {
        return response.status(400).json({ message: assignmentError });
      }
      task.assignedTo = assignedTo;
      addHistory(task, request.user, "assigned", assignedTo ? "Assigned the task to a user." : "Removed the user assignment.");
    }
    if (Object.hasOwn(request.body, "assignedTeam")) {
      const assignedTeam = request.body.assignedTeam || null;
      const assignmentError = await validateAssignments(request.user, null, assignedTeam);
      if (assignmentError) {
        return response.status(400).json({ message: assignmentError });
      }
      task.assignedTeam = assignedTeam;
      addHistory(task, request.user, "assigned", assignedTeam ? "Assigned the task to a team." : "Removed the team assignment.");
    }

    await task.save();
    response.json({ task: await populatedTask(task) });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (request, response, next) => {
  try {
    const task = await findEditableTask(request, response);
    if (!task) return;

    task.archived = true;
    addHistory(task, request.user, "archived", "Archived the task.");
    await task.save();
    response.json({ message: "Task archived." });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/subtasks", async (request, response, next) => {
  try {
    const task = await findEditableTask(request, response);
    if (!task) return;
    const text = request.body.text?.trim();
    if (!text) {
      return response.status(400).json({ message: "Subtask text is required." });
    }

    task.subtasks.push({ text });
    addHistory(task, request.user, "subtask-added", `Added subtask: ${text}`);
    await task.save();
    response.status(201).json({ task: await populatedTask(task) });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/subtasks/:subtaskId", async (request, response, next) => {
  try {
    const task = await findEditableTask(request, response);
    if (!task) return;
    const subtask = task.subtasks.id(request.params.subtaskId);
    if (!subtask) {
      return response.status(404).json({ message: "Subtask not found." });
    }

    if (typeof request.body.completed === "boolean") {
      subtask.completed = request.body.completed;
      addHistory(
        task,
        request.user,
        subtask.completed ? "subtask-completed" : "subtask-reopened",
        `${subtask.completed ? "Completed" : "Reopened"} subtask: ${subtask.text}`,
      );
    }
    await task.save();
    response.json({ task: await populatedTask(task) });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id/subtasks/:subtaskId", async (request, response, next) => {
  try {
    const task = await findEditableTask(request, response);
    if (!task) return;
    const subtask = task.subtasks.id(request.params.subtaskId);
    if (!subtask) {
      return response.status(404).json({ message: "Subtask not found." });
    }

    addHistory(task, request.user, "subtask-removed", `Removed subtask: ${subtask.text}`);
    subtask.deleteOne();
    await task.save();
    response.json({ task: await populatedTask(task) });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/subtasks", async (request, response, next) => {
  try {
    const task = await findEditableTask(request, response);
    if (!task) return;
    const order = Array.isArray(request.body.order) ? request.body.order : [];
    const reordered = order.map((id) => task.subtasks.id(id)).filter(Boolean);
    if (reordered.length !== task.subtasks.length) {
      return response.status(400).json({ message: "Subtask order is incomplete." });
    }

    task.subtasks = reordered;
    await task.save();
    response.json({ task: await populatedTask(task) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
