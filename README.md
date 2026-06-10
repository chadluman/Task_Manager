# Task Manager

A collaborative task board backed by MongoDB. Users can:

- Create accounts with a role and team
- Assign tasks to individual users or entire teams
- Track task and subtask progress
- Review an audit history for each task
- Archive tasks without losing their historical record

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and set:

   ```env
   MONGODB_URI=mongodb://127.0.0.1:27017/task-manager
   JWT_SECRET=replace-this-with-a-long-random-secret
   PORT=5501
   ```

   `MONGODB_URI` can also be a MongoDB Atlas connection string.

3. Start the app:

   ```bash
   npm start
   ```

4. Open [http://localhost:5501](http://localhost:5501).

Do not open the project with VS Code Live Server. Live Server only serves the
frontend files and cannot handle the `/api` routes required for accounts and
tasks. Local development requests from Live Server are supported as a fallback,
but `npm start` remains the recommended way to run the complete app.

## Data model

- `User`: account, hashed password, role, and team
- `Team`: shared team identity
- `Task`: owner, user/team assignments, subtasks, completion state, and activity history

Passwords are hashed with bcrypt. API sessions use seven-day JSON Web Tokens.
