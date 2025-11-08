# Web Shell - Project Overview

## Project Identity
- **Name**: web-shell
- **Type**: Browser-based terminal application
- **Stack**: TypeScript, React, Node.js
- **Architecture**: Full-stack web application with WebSocket communication

## Core Objectives
1. **Shell Execution**: Real-time shell command execution in browser
2. **Multi-Window Support**: Tabbed terminal interface with multiple concurrent sessions
3. **Google OAuth**: Secure authentication using Google Sign-In
4. **Containerization**: Full Docker deployment with docker-compose

## Key Requirements
- **Security First**: Google OAuth, process isolation, resource limits
- **Real-time Communication**: WebSocket for bidirectional terminal I/O
- **Multiple Sessions**: Independent PTY processes per terminal window
- **Production Ready**: HTTPS/WSS, error handling, logging, monitoring
- **Containerized Deployment**: Docker multi-stage builds, compose orchestration

## Technology Decisions
- **Frontend**: React 18 + Vite + TypeScript
- **Terminal**: xterm.js (industry standard)
- **Auth**: Google OAuth 2.0 (via @react-oauth/google)
- **Backend**: Node.js + Express + TypeScript
- **WebSocket**: ws library (native, performant)
- **PTY**: node-pty (cross-platform pseudo-terminal)
- **Container**: Alpine Linux base, multi-stage builds

## Architecture Pattern
- **Client**: Browser → xterm.js → WebSocket client
- **Server**: Express → WebSocket server → PTY manager → Shell processes
- **Auth Flow**: Google OAuth → ID token validation → Session JWT → WebSocket auth
- **Multi-Window**: Session ID routing → Multiple PTY instances → Independent shells
