# Overview

This is a Discord bot designed for faction-based community management. The bot facilitates user requests to join different factions (like "Laughing_Meeks", "Unicorn_Rapists", "Blame") by handling slash commands and dropdown menu interactions. It manages a request system where users can select factions and faction leaders can approve or deny these requests through Discord role-based permissions.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Bot Framework
- **Discord.js v14**: Modern Discord API wrapper providing slash command support and advanced interaction handling
- **Event-driven architecture**: Bot responds to Discord events like `ready` and `interactionCreate`
- **Command collection system**: Dynamic command loading from a `/commands` directory for modular functionality

## Command System
- **Modular design**: Commands are stored as separate files in a `/commands` directory
- **Dynamic loading**: Commands are automatically loaded at startup using filesystem scanning
- **Collection-based storage**: Commands are stored in a Discord.js Collection for efficient retrieval

## Faction Management
- **Role-based permissions**: Each faction has designated leader roles that can approve/deny requests
- **Hardcoded faction mapping**: Faction names are mapped to Discord role IDs in the main file
- **Global state management**: Pending requests are stored in a global object (temporary, in-memory storage)

## Interaction Handling
- **Slash commands**: Primary command interface using Discord's native slash command system
- **Dropdown menus**: Secondary interaction method for faction selection
- **Error handling**: Basic try-catch blocks with user-friendly error messages

## Data Storage
- **In-memory storage**: Currently uses global variables for pending requests (non-persistent)
- **No database**: All data is ephemeral and lost on bot restart

# External Dependencies

## Core Dependencies
- **discord.js (^14.22.1)**: Main Discord API wrapper for bot functionality
- **dotenv (^17.2.1)**: Environment variable management for secure token storage

## Discord Platform Integration
- **Discord Gateway**: Real-time connection for receiving events and interactions
- **Discord REST API**: For sending messages, managing roles, and handling interactions
- **Required Discord permissions**: Guild access, message content reading, member management

## Missing Infrastructure
- **Persistent database**: Currently no database integration for storing faction data or request history
- **Configuration management**: Faction-to-role mappings are hardcoded and require manual updates