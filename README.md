# Password Manager

A secure web-based password manager with user authentication, admin functionality, and tag-based organization.

## Features

- User authentication and authorization
- Administrator user management
- **30-minute idle timeout** for enhanced security
- Tag-based password organization
- Secure password storage
- Search functionality
- Drag-and-drop tag filtering
- Password visibility toggle
- Color-coded tags with custom colors

## Quick Start

1. Install dependencies:
   ```bash
   npm run setup
   ```

2. Set up the database:
   ```bash
   npm run db:push
   npm run db:seed
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:3000`

## Default Admin User

- Username: Super
- Password: abcd1234

## Tech Stack

- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend: Node.js + Express + TypeScript
- Database: SQLite + Prisma ORM
- Authentication: JWT tokens
- UI Components: Custom components with drag-and-drop support
