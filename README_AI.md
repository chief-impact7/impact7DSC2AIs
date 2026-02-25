🏫 Academy Integrated Management (impact7DB) Hybrid System
Version 2.0 | A centralized, AI-driven management ecosystem powered by Google Workspace & Firebase.

🌟 Overview
The impact7DB Hybrid System is a modular suite of web applications designed to digitize academy operations. By leveraging the Google Ecosystem (Sheets, Workspace, Firebase) and AI-Native Development, this project ensures data integrity, minimalist UI, and high scalability.

🛠 Tech Stack
Database: Google Cloud Firestore (NoSQL)

Integration: Google Workspace (Sheets, GAS), Firebase Auth

Frontend: Material Design 3 (Material Web Components)

AI Orchestration: Antigravity (UI), Claude Code (Logic), Gemini CLI (Automation)

🏗 System Architecture
Instead of a monolithic app, impact7DB uses a Microservices-inspired Architecture:

Central DB: A shared Firestore instance acting as the "Single Source of Truth."

Hybrid Management: * Bulk Actions: Handled via Google Sheets + Apps Script.

Daily Operations: Handled via specialized web apps (Attendance, Flow Check, etc.).

Traceability: Every single write operation is logged with a google_login_id and timestamp via the userlog.js middleware.

📂 Project Structure
Bash
academy-central-workspace/
├── rules.md           # Core rules, DB schema & Glossary (Mandatory for AI)
├── docs/              # Additional documentation (gemini.md, claude.md)
├── core/              # Shared logic (userlog.js, auth.js)
├── apps/              # Individual micro-web apps
│   ├── attendance/
│   ├── report-card/
│   └── flow-check/
└── .env               # Environment variables (Private)
🤖 AI Development Workflow
This project is optimized for AI agents. When starting a session, point your AI to the following files:

rules.md: To understand the database schema and coding standards.

userlog.js: To ensure all data modifications follow the tracking protocol.

claudnotes.md / gemininotes.md: To pick up where the last agent left off.

⚖️ Key Principles
Material Minimalist: All UIs must mimic native Google Apps (Calendar, Gmail) using MD3.

Real-name Logging: No anonymous updates. Every change is tied to a Google account.

Security First: API keys and Service Account credentials must never be committed to the repository.