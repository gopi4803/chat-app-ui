# Real-Time Chat Application – Frontend

This is the frontend for a real-time chat application built using React.  
It communicates with a Spring Boot backend via REST APIs for authentication and WebSockets (STOMP) for real-time messaging.

## Tech Stack
- React
- Redux (global state management)
- Tailwind CSS
- STOMP over WebSockets
- JWT-based authentication

## Features
- User authentication using JWT (access + refresh tokens)
- Google OAuth login support
- One-to-one real-time messaging
- Group chat with per-user delivery and read receipts
- Typing indicators and online/offline presence
- Offline message delivery (handled by backend)
- Secure WebSocket connection using JWT
- Global state management for messages, users, and presence

## Architecture Overview
- REST APIs are used for authentication, user management, and initial data loading
- WebSockets are used for real-time messaging and presence updates
- The frontend does not trust client-side message state; it reflects server-authoritative state
- Messages are optimistically rendered but reconciled using server echoes and acknowledgements

## Authentication Flow
- Access token is stored client-side and sent with REST requests
- Refresh token is stored securely as an HttpOnly cookie
- When access token expires, a new one is obtained using the refresh token
- WebSocket connection is authenticated during connection handshake using the access token

## Project Status
Core functionality is complete and stable.  
Further enhancements such as full responsiveness, accessibility improvements, and UI polish are planned as future work.

This project is primarily used to demonstrate real-world system design concepts such as real-time communication, eventual consistency, and server-authoritative state.
