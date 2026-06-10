# Task Manager

Task Manager is a collaborative web application for organizing personal and
team work. It combines a responsive task board with user accounts, team-based
task sharing, progress tracking, subtasks, and a permanent activity history.

The frontend uses plain HTML, CSS, and JavaScript. The backend uses Node.js,
Express, MongoDB, and Mongoose.

## Features

- Account registration and login
- Member, team lead, and manager roles
- Personal and team task visibility
- Assignment to a teammate or the signed-in user's team
- High, medium, and low task priorities
- Optional due dates
- Reorderable and completable subtasks
- Progress totals and completion percentage
- Completed, active, all, and archived task views
- Historical activity records for task changes
- Password hashing and authenticated API requests
- Responsive desktop and mobile layout

## How Task Visibility Works

Users only see tasks that meet at least one of these conditions:

- They created the task.
- The task was assigned directly to them.
- The task was assigned to their team.

A private task that has no user or team assignment remains visible only to its
creator. Team members do not see private tasks created by other members.

Assignments are limited to users in the signed-in user's team. Cross-team
assignments are rejected by the backend.

## Roles

Accounts can be created with one of three roles:

- `Member`
- `Team lead`
- `Manager`

Roles are currently stored with the account and displayed in the interface.
Task visibility and assignment boundaries are based on ownership and team
membership. The current version does not apply additional permissions based on
role.

## Using the Website

### Create an Account

1. Open the website.
2. Select **Create account**.
3. Enter your name, email address, and a password of at least eight characters.
4. Select a role.
5. Enter a team name.
6. Select **Create account**.

Entering an existing team name joins that team. Team names are matched using a
normalized version of the name.

### Sign In

1. Select **Sign in**.
2. Enter the email address and password used during registration.
3. Select **Sign in**.

Sessions use a JSON Web Token stored in the browser. Tokens expire after seven
days.

### Create and Assign a Task

1. Enter a task title.
2. Select its priority.
3. Optionally choose a due date.
4. Optionally assign it to a teammate.
5. Optionally assign it to your team.
6. Select **Add Task**.

Leaving both assignment fields empty creates a private task for the signed-in
user.

### Manage Tasks

- Select **Done** to complete a task.
- Select **Reopen** to return a completed task to active work.
- Add subtasks from the field inside an active task.
- Drag subtasks to change their order.
- Use the assignment controls on a task to update its user or team assignment.
- Expand **Activity history** to review recorded changes.
- Select **Archive** to remove a task from the active board while preserving its
  record.

Completing a task also completes its unfinished subtasks.

### Board Filters

- **Active** shows unfinished tasks.
- **Completed** shows finished tasks.
- **All** shows active and completed tasks.
- **Archive** shows archived tasks.

## Local Development Setup

### Requirements

- Node.js 20.19.0 or newer
- npm
- MongoDB running locally, or a MongoDB Atlas database

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/chadluman/Task_Manager.git
   cd Task_Manager
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env`.

4. Configure the environment variables:

   ```env
   MONGODB_URI=mongodb://127.0.0.1:27017/task-manager
   JWT_SECRET=replace-this-with-a-long-random-secret
   PORT=5501
   ```

5. Start the application:

   ```bash
   npm start
   ```

6. Open [http://localhost:5501](http://localhost:5501).

The Express server provides both the website files and the `/api` endpoints.
Running the project with `npm start` is the recommended development workflow.

## Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret used to sign authentication tokens |
| `PORT` | No | HTTP port; the project example uses `5501` |

Use a long, random `JWT_SECRET` in production. Never commit `.env`; it is
excluded by `.gitignore`.

## Available Commands

```bash
npm start
```

Starts the Express server and connects to MongoDB.

```bash
npm run check
```

Checks the server and browser JavaScript for syntax errors.

```bash
npm audit
```

Checks installed packages for known vulnerabilities.

## Project Structure

```text
Task-Manager/
|-- index.html
|-- style.css
|-- script.js
|-- server.js
|-- src/
|   |-- middleware/
|   |   `-- auth.js
|   |-- models/
|   |   |-- Task.js
|   |   |-- Team.js
|   |   `-- User.js
|   `-- routes/
|       |-- auth.js
|       |-- tasks.js
|       `-- users.js
|-- .env.example
`-- package.json
```

## Data Model

### User

Stores the user's name, email address, hashed password, role, and team.

### Team

Stores a team name and normalized slug. Users who register with the same
normalized team name join the same team.

### Task

Stores the task title, priority, due date, completion state, owner, optional
user and team assignments, subtasks, archive state, and activity history.

Archived tasks are retained in MongoDB instead of being permanently deleted.

## Security Notes

- Passwords are hashed with bcrypt before storage.
- Password hashes are excluded from normal user queries.
- Protected API routes require a valid Bearer token.
- Authentication tokens expire after seven days.
- Task queries enforce ownership, direct assignment, or team assignment.
- The backend validates assignment boundaries instead of relying only on the
  browser interface.
- Local CORS access is allowed for `localhost` and `127.0.0.1` development
  origins.

For a public production deployment, use HTTPS, a production MongoDB database,
a strong secret, restricted CORS rules, request rate limiting, and secure
cookie-based authentication if the deployment requirements call for it.

## Troubleshooting

### Account Creation Says the Backend Cannot Be Reached

Run:

```bash
npm start
```

Then open the exact URL printed in the terminal. By default, that is
`http://localhost:5501`.

### MongoDB Connection Fails

- Confirm the local MongoDB service is running.
- Confirm `MONGODB_URI` is correct.
- For MongoDB Atlas, confirm the database user, password, and network access
  settings.

### Port 5501 Is Already in Use

Change `PORT` in `.env`, restart the server, and open the newly printed URL.
When changing the local development port, also update the API-origin logic in
`script.js` if the page will be served from a separate development server.

### A Teammate Cannot See a Task

Confirm that the task is assigned to that teammate or to the shared team.
Unassigned tasks are private to their creator.

## Current Limitations

- Roles are informational and do not yet have separate permission levels.
- There is no password reset or email verification flow.
- Archived tasks cannot currently be restored from the interface.
- Team membership cannot currently be changed after registration.
- The project does not include automated unit or browser tests.

## Technology

- HTML5
- CSS3
- Vanilla JavaScript
- Node.js
- Express
- MongoDB and Mongoose
- bcrypt
- JSON Web Tokens
