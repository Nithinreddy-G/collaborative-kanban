# Collaborative Multi-Tenant Kanban Task Management Application

A web-based task management application that helps teams organize, track, and collaborate on tasks using a Kanban board.

## Project Overview

The Collaborative Kanban application is designed for ABC Technologies, which operates across Hyderabad, Bangalore, and Chennai.

The application supports organization-based and branch-based task management, allowing users to access boards and tasks according to their membership.

## Features

* User authentication using JWT.
* Secure password verification using bcrypt.
* Multi-tenant organization structure.
* Branch-based access for different locations.
* Role-based user membership.
* Kanban boards with To Do, In Progress, and Done columns.
* Task creation and task listing.
* PostgreSQL database integration.
* REST API using Node.js and Express.
* Socket.IO server initialization.

## Technology Stack

### Frontend

* React.js
* HTML
* CSS
* JavaScript

### Backend

* Node.js
* Express.js
* Socket.IO
* JSON Web Tokens
* bcrypt

### Database

* PostgreSQL

### Tools

* Visual Studio Code
* Git and GitHub
* Postman
* pgAdmin

## Project Structure

```text
collaborative-kanban/
├── backend/
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── routes/
│       ├── services/
│       ├── sockets/
│       └── server.js
│
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── App.css
│       ├── index.css
│       └── main.jsx
│
├── .gitignore
└── README.md
```

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Nithinreddy-G/collaborative-kanban.git
cd collaborative-kanban
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file inside the backend folder and configure your PostgreSQL connection and JWT secret.

Do not upload your `.env` file or credentials to GitHub.

Start the backend:

```bash
npm run dev
```

Backend runs at:

`http://localhost:5000`

### 3. Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at:

`http://localhost:5173`

## Database

Create a PostgreSQL database named:

`collaborative_kanban`

Configure the database connection in the backend `.env` file.

## Application Modules

* Authentication
* Organization and tenant management
* User membership
* Board management
* Task management
* Activity tracking
* Real-time collaboration

## Future Enhancements

* Drag-and-drop task movement.
* Real-time task synchronization.
* Online user presence.
* Task activity history.
* Advanced role-based permissions.
* Improved validation and error handling.

## Author

Developed as part of the Collaborative Multi-Tenant Kanban Task Management Application assessment.
