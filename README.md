# JetOni - 3D Multiplayer Tag Game on Reddit

> **🏆 Hackathon Submission**: This project was submitted to the [Reddit Devvit Hackathon](https://devpost.com/software/jetoni)

A 3D multiplayer tag game built with Three.js and Devvit, running directly within Reddit posts.

## Overview

JetOni (ジェット鬼) is a 3D tag game where players navigate a procedurally generated city as either the ONI (demon/鬼) with jetpack flight or as runners with dash abilities. The game features complete physics systems, collision detection, AI opponents, and bilingual support (English/Japanese).

## Features

- **3D City Environment**: Procedurally generated city with 60+ buildings, roads, rivers, and bridges
- **Player Abilities**: Jetpack flight (ONI), dash and jump (Runners)
- **Physics System**: Gravity, collision detection, and smooth movement
- **AI Opponents**: Multiple personality types with intelligent behavior
- **Bilingual Support**: English and Japanese UI
- **Reddit Integration**: Runs entirely within Reddit posts using Devvit

## Development

### Prerequisites

- Node.js 22.2.0 or higher
- npm or yarn
- Devvit CLI (`npm install -g devvit`)

### Setup

```bash
# Install dependencies
npm install

# Login to Devvit
devvit login

# Start development server
npm run dev
```

The development server will:
1. Create a test subreddit (e.g., `r/jet-oni_dev`)
2. Provide a playtest URL
3. Open the URL in your browser to test the app

### Deployment

```bash
# Upload to Devvit
devvit upload
```

After uploading, the app will be available for installation on your subreddit.

## Project Structure

```
src/
├── client/     # Frontend code (Three.js, UI, game logic)
├── server/     # Backend API endpoints (Express)
└── shared/     # Shared types and constants
```

## License

MIT
