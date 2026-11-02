# Collaborative Multi-Tenant Kanban Task Management Application

A real-time, web-based Kanban task management application that enables teams to organize, track, update and collaborate on tasks across multiple branches of an organization.

## 1. Project Overview

The Collaborative Kanban application is designed for ABC Technologies, which operates across Hyderabad, Bangalore and Chennai.

The application supports organization-based and branch-based task management. Users can access boards and perform operations according to their assigned organization, tenant and role.

The system provides a centralized platform for managing tasks while maintaining data isolation between branches.

## 2. Features

### Authentication and Authorization

* User authentication using JWT.
* Secure password hashing and verification using bcrypt.
* Role-based access control.
* Protected API routes.
* Permission-based task creation and editing.

### Multi-Tenant Management

* Organization-based data separation.
* Branch-level tenant isolation.
* Role-based user memberships.
* Restricted board and activity access according to user membership.

### Kanban Task Management

* Kanban boards with three columns:

  * To Do
  * In Progress
  * Done
* Create new tasks.
* Edit existing tasks.
* Drag-and-drop task movement.
* Persistent task updates in PostgreSQL.
* Task version handling for concurrent updates.

### Real-Time Collaboration

* Socket.IO integration.
* Real-time task movement updates.
* Synchronization between connected users.

### Activity Tracking

* Activity history for task creation and updates.
* Task movement activity tracking.
* User and board information in activity records.
* Role- and tenant-based activity visibility.

## 3. Technology Stack

### Frontend

* React.js
* HTML5
* CSS3
* JavaScript
* Vite
* dnd-kit

### Backend

* Node.js
* Express.js
* Socket.IO
* JSON Web Tokens (JWT)
* bcrypt / bcryptjs

### Database

* PostgreSQL

### Development Tools

* Visual Studio Code
* Git
* GitHub
* Thunder Client
* pgAdmin

## 4. Project Structure

```text
collaborative-kanban/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── sockets/
│   │   └── server.js
│   │
│   ├── .env.example
│   ├── package.json
│   └── package-lock.json
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   ├── main.jsx
│   │   └── socket.js
│   │
│   ├── package.json
│   └── package-lock.json
│
├── .gitignore
└── README.md
```

## 5. Prerequisites

Install the following before running the application:

* Node.js and npm
* PostgreSQL
* Git

## 6. Installation and Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/Nithinreddy-G/collaborative-kanban.git


cd collaborative-kanban
```

### Step 2: Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file inside the backend directory.

Use `.env.example` as a reference:

```env
PORT=5000
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret
```

Replace the placeholder values with your local PostgreSQL connection details and a secure JWT secret.

Start the backend:

```bash
npm run dev
```

Backend URL:

```text
http://localhost:5000
```

Health check endpoint:

```text
http://localhost:5000/api/health
```

### Step 3: Database Setup

Create a PostgreSQL database named:

```text
collaborative_kanban
```

Configure the database connection using the backend `.env` file.

Ensure the application's required database tables and initial data are configured before starting the application.

### Step 4: Frontend Setup

Open another terminal from the project root.

Navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the frontend:

```bash
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

## 7. Application Modules

1. Authentication and authorization
2. Organization and tenant management
3. User membership management
4. Kanban board management
5. Task creation and editing
6. Drag-and-drop task movement
7. Real-time collaboration
8. Activity history and tracking
9. Role-based access control

## 8. User Roles

The application supports the following roles:

| Role         | Permissions                                  |
| ------------ | -------------------------------------------- |
| ORG_ADMIN    | Organization-level board and task management |
| TENANT_ADMIN | Branch-level task management                 |
| MEMBER       | Access authorized boards and move tasks      |

Access to boards and activity records is restricted according to organization and tenant membership.

## 9. Security

* JWT-based authentication.
* Password hashing using bcrypt.
* Protected backend routes.
* Role-based authorization middleware.
* Organization and tenant membership validation.
* Environment variables for sensitive configuration.
* `.gitignore` excludes actual `.env` files and `node_modules`.

**Important:** Never upload actual database credentials or JWT secrets to GitHub.

## 10. Future Enhancements

* Online user presence indicators.
* Advanced task assignment and filtering.
* Enhanced dashboard analytics.
* Additional notification functionality.
* Improved UI customization.

## 11. Author

Developed as part of the Collaborative Multi-Tenant Kanban Task Management Application assessment.

**GitHub Repository:**

https://github.com/Nithinreddy-G/collaborative-kanban
