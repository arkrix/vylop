<div align="center">

<img src="web/public/vylop-hq.png" alt="Vylop Logo" width="120" height="120" />

# Vylop

<p><strong>A real-time collaborative code platform for technical interviews, pair programming, and remote developer teams.</strong></p>

[![Java](https://img.shields.io/badge/Java-17+-ED8B00?logo=openjdk\&logoColor=white)](#requirements)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.x-6DB33F?logo=springboot\&logoColor=white)](#tech-stack)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react\&logoColor=black)](#tech-stack)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-4169E1?logo=postgresql\&logoColor=white)](#tech-stack)
[![WebSockets](https://img.shields.io/badge/Real--Time-WebSockets-010101?logo=socketdotio\&logoColor=white)](#features)

</div>

---

## Requirements

Before running Vylop locally, make sure the following software is installed:

| Requirement                    | Version                    |
| ------------------------------ | -------------------------- |
| **Java Development Kit (JDK)** | 17 or higher               |
| **Node.js**                    | 18 or higher               |
| **npm**                        | 9 or higher                |
| **PostgreSQL**                 | 14 or higher               |
| **Apache Maven**               | 3.9 or higher              |
| **Git**                        | Latest recommended version |
| **Docker & Docker Compose**    | Recommended                |

You will also need:

* A running PostgreSQL instance.
* A PostgreSQL database for Vylop.
* The required application configuration values.
* Authentication configuration if using Google OAuth2.

> [!IMPORTANT]
> Never commit database passwords, JWT secrets, OAuth credentials, API keys, or other sensitive configuration values to the repository.

---

## Getting Started

Follow the steps below to run Vylop locally.

### 1. Clone the Repository

Clone the repository and move into the project directory:

```bash
git clone https://github.com/your-username/vylop.git
cd vylop
```

### Option A: Quick Start with Docker (Recommended)

Run the entire application stack: PostgreSQL database, Piston sandbox execution
engine, Spring Boot server, and React/Nginx web application with a single command:

```bash
docker compose up --build -d
```

#### Services & Port Mappings

| **Service**          | **Container**    | **Host Endpoint**       | **Description**                          |
| -------------------- | ---------------- | ----------------------- | ---------------------------------------- |
| **Web App**          | `vylop-web`      | `http://localhost:3000` | React SPA served via Nginx reverse proxy |
| **API & WebSockets** | `vylop-server`   | `http://localhost:8080` | Spring Boot application                  |
| **Code Execution**   | `vylop-piston`   | `http://localhost:2000` | Isolated Piston sandbox runtime          |
| **Database**         | `vylop-postgres` | `localhost:5432`        | PostgreSQL database instance             |

Once the containers are up and healthy, open **`http://localhost:3000`** in
your browser.

### Option B: Manual Local Setup

### 2. Set Up PostgreSQL

Create a PostgreSQL database for Vylop:

```sql
CREATE DATABASE vylop_db;
```

Ensure PostgreSQL is running locally on port `5432` before starting the server.

### 3. Configure the Server

Navigate to the server directory:

```bash
cd server
```

Configure your database connection, JWT secret, and execution sandbox endpoint
in your Spring Boot application configuration or environment variables:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/vylop_db
spring.datasource.username=your_postgres_user
spring.datasource.password=your_postgres_password

jwt.secret=your_jwt_secret_key_here

# Code execution sandbox endpoint
piston.api.url=http://localhost:2000/api/v2
```

> [!WARNING]
> The values above are examples only. Replace them with your local configuration
> and keep secrets outside version control.

### 4. Build the Server

Build the Spring Boot application:

```bash
mvn clean package -DskipTests
```

### 5. Start the Server

Run the application:

```bash
mvn spring-boot:run
```

The server will start at:

```text
http://localhost:8080
```

### 6. Start the Web

Open a **new terminal** and navigate to the web directory:

```bash
cd web
```

Install the required dependencies:

```bash
npm install
```

When running the Vite development server independently from Nginx, point
`VITE_API_URL` to your local Spring Boot instance:

```bash
# Windows (PowerShell)
$env:VITE_API_URL="http://localhost:8080"; npm run dev

# Linux / macOS / Git Bash
VITE_API_URL="http://localhost:8080" npm run dev
```

The Vite development server will start at:

```text
http://localhost:5173
```

### 7. Verify the Installation

Once both services are running:

1. Open `http://localhost:5173` (Vite development server) or
   `http://localhost:3000` (Docker container) in your browser.
2. Verify that the server is responding on port `8080`.
3. Create or join a collaborative workspace session.
4. Test real-time code editing and syntax highlighting.
5. Execute a script to confirm sandbox container output.

> [!TIP]
> When running without Docker, ensure an instance of Piston is available at
> `http://localhost:2000` if you plan to test multi-language code execution.

---

## Features

### Real-Time Collaborative Editing

Vylop provides a synchronized coding environment where multiple participants can work on the same codebase simultaneously.

* CRDT-based synchronization using **Yjs**
* Conflict-free concurrent editing
* Live remote cursor tracking
* Persistent WebSocket communication
* Monaco Editor integration
* Real-time state synchronization

### Multi-File Workspace Management

Vylop supports complete project workspaces rather than limiting sessions to a single source file.

* Hierarchical file and folder structure
* Empty file creation
* Bulk local file uploads
* Automatic file-extension validation
* Synchronized file deletion
* Persistent workspace state

### Multi-Language Code Execution

Run multi-file workspaces directly inside an isolated, containerized sandbox runtime powered by **Piston**.

* Secure, sandboxed execution with time and memory constraints
* Custom stdin input and automated test case runner support
* Multi-file project compilation and execution
* Real-time stdout, stderr, and compiler diagnostics feedback

Supported languages include:

* **Java**
* **Python**
* **C++**
* **JavaScript**

**Editor Syntax & Snippet Support:**
* **TypeScript**
* **Go**
* **Rust**
*(Sandbox runtime execution for Go, Rust, and TypeScript will be enabled in an upcoming package release.)*

### One-Click Workspace Export

Download the complete multi-file workspace as a `.zip` archive.

This makes it possible to:

* Preserve a coding session locally
* Share the project with other developers
* Continue development outside Vylop

### Live Markdown Preview

Vylop includes a Markdown editing experience with a real-time rendered preview.

This allows users to write documentation alongside their code without leaving the collaborative workspace.

### Integrated Session Chat

Communicate with other participants directly inside a coding session.

Features include:

* Session-based messaging
* User presence
* Typing indicators
* Real-time message delivery

### Cloud Workspace Persistence

Workspaces can be persisted and restored across sessions.

Vylop also includes background cleanup routines for orphaned workspace data to reduce unnecessary database growth.

### Authentication & Security

Vylop provides authenticated access using:

* JWT-based authentication
* Google OAuth2
* Spring Security
* Protected application resources

### Vim Mode

Developers who prefer Vim-style editing can enable Vim keybindings directly inside the Monaco Editor.

---

## Tech Stack

| Layer                       | Technology          | Purpose                           |
| --------------------------- | ------------------- | --------------------------------- |
| **Web**                     | React 18            | User interface                    |
| **Build Tool**              | Vite                | Web development and bundling      |
| **Reverse Proxy**           | Nginx               | SPA static serving & API proxying |
| **Editor**                  | Monaco Editor       | Code editing                      |
| **Collaboration**           | Yjs                 | CRDT-based synchronization        |
| **Editor Binding**          | y-monaco            | Yjs ↔ Monaco integration          |
| **Styling**                 | Tailwind CSS        | UI styling                        |
| **Real-Time Communication** | WebSockets / STOMP  | Real-time messaging               |
| **WebSocket Client**        | SockJS / STOMP.js   | Client-side connection management |
| **Server**                  | Java 17             | Server runtime                    |
| **Framework**               | Spring Boot 3       | REST and application services     |
| **Security**                | Spring Security     | Authentication and authorization  |
| **Authentication**          | JWT / Google OAuth2 | User authentication               |
| **Execution Engine**        | Piston (Sandbox)    | Multi-language isolated runtime   |
| **Database**                | PostgreSQL          | Persistent data storage           |
| **Build System**            | Maven               | Server dependency management      |
| **Containerization**        | Docker & Compose    | Multi-container orchestration     |
| **Deployment**              | Render              | Cloud deployment                  |

---

## Project Structure

```text
vylop/
│
├── server/
│   ├── src/
│   │   ├── main/
│   │   └── test/
│   └── pom.xml
│
├── web/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── vite.config.*
│
├── render.yaml
└── README.md
```

### Server

The `server` directory contains the Spring Boot application responsible for:

* REST APIs
* Authentication and authorization
* WebSocket communication
* Workspace persistence
* User management
* Database interaction
* Session-related server logic

### Web

The `web` directory contains the React application responsible for:

* User interface
* Monaco Editor integration
* Collaborative editing
* Workspace management
* Real-time session features
* Chat and presence
* Client-side application state

---

## License

This project is currently maintained as an open-source project.

See the repository for the applicable license and project policies.
