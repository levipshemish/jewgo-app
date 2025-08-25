# GEMINI.md - JewGo Project Context

This document provides a comprehensive overview of the JewGo project, its structure, and development workflows. It is intended to be used as instructional context for AI agents interacting with this codebase.

## Project Overview

JewGo is a full-stack web application designed to help users discover and review kosher restaurants and other kosher establishments. It features a modern, responsive frontend and a robust backend API.

*   **Frontend:** The frontend is built with [Next.js](https://nextjs.org/) and [TypeScript](https://www.typescriptlang.org/). The source code is located in the `frontend/` directory.
*   **Backend:** The backend is a [Flask](https://flask.palletsprojects.com/) API written in Python. The source code is located in the `backend/` directory.
*   **Database:** The application uses a PostgreSQL database, as indicated by the `psycopg2-binary` dependency in `backend/requirements.txt`.
*   **Deployment:** The project is configured for deployment using Docker, with configurations for [Render](https://render.com/) (`render.yaml`) and [Vercel](https://vercel.com/) (`vercel.json`).

## Building and Running

### Docker (Recommended)

The recommended method for running the application is with Docker.

*   **One-step setup:**
    ```bash
    ./scripts/setup-docker.sh
    ```
*   **Start the application:**
    ```bash
    npm run docker:dev
    ```
*   **Other Docker commands:**
    *   `npm run docker:status`: Check the status of the Docker containers.
    *   `npm run docker:logs`: View the logs from the Docker containers.
    *   `npm run docker:stop`: Stop the Docker containers.

### Manual Development

You can also run the frontend and backend services manually.

*   **Backend (Flask):**
    ```bash
    cd backend
    source .venv/bin/activate
    python app.py
    ```
    The backend will be available at `http://localhost:8082`.

*   **Frontend (Next.js):**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```
    The frontend will be available at `http://localhost:3000`.

## Development Conventions

The project follows a strict set of development conventions to ensure code quality and consistency.

*   **Testing:** All changes must be thoroughly tested before being committed.
    *   **Backend:** Run `pytest` in the `backend/` directory.
    *   **Frontend:** Run `npm test` in the `frontend/` directory.
*   **Linting and Type Checking:**
    *   **Backend:** Use `flake8` for linting and `mypy` for type checking in the `backend/` directory.
    *   **Frontend:** Use `npm run lint` for linting and `npm run type-check` for type checking in the `frontend/` directory.
*   **Commit Messages:** Commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.
*   **Development Workflow:** The `docs/DEVELOPMENT_WORKFLOW.md` file outlines a mandatory workflow that requires testing before committing and pushing changes. An automated script is available to enforce this workflow:
    ```bash
    ./scripts/test-and-commit.sh "your commit message here"
    ```

## Key Files and Directories

*   `frontend/`: Contains the Next.js frontend application.
*   `backend/`: Contains the Flask backend API.
*   `scripts/`: Contains various build, deployment, and development scripts.
*   `docs/`: Contains project documentation.
*   `package.json`: Defines project scripts and dependencies.
*   `backend/requirements.txt`: Lists the Python dependencies for the backend.
*   `render.yaml`: Configuration file for deploying to Render.
*   `vercel.json`: Configuration file for deploying to Vercel.
