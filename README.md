# JetOni - 3D Tag Game on Reddit

[![CI/CD Pipeline](https://github.com/YOUR_USERNAME/jet-oni/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/jet-oni/actions/workflows/ci.yml)
[![CodeQL](https://github.com/YOUR_USERNAME/jet-oni/actions/workflows/codeql.yml/badge.svg)](https://github.com/YOUR_USERNAME/jet-oni/actions/workflows/codeql.yml)
[![GitLeaks](https://github.com/YOUR_USERNAME/jet-oni/actions/workflows/gitleaks.yml/badge.svg)](https://github.com/YOUR_USERNAME/jet-oni/actions/workflows/gitleaks.yml)

A multiplayer 3D tag game built with Three.js and Devvit, running directly on Reddit. Players will navigate a futuristic city environment in first-person view, chasing or evading each other in an intense game of tag with jetpacks, dash abilities, and strategic beacon powers.

## What is JetOni?

JetOni is currently an **interactive 3D demo application** running on Reddit via the Devvit platform. The current implementation features a beautifully rendered Earth sphere that users can click to interact with, demonstrating the technical foundation for building 3D experiences on Reddit.

**Future Vision:** JetOni (ジェット鬼) will evolve into an immersive 3D multiplayer tag game where one player starts as the "ONI" (demon/鬼) and must tag other players to convert them. The last player remaining untagged wins! The game will combine traditional Japanese tag games with futuristic parkour mechanics in a fully 3D urban environment.

### Current Features

- **Interactive 3D Earth**: Beautifully rendered Earth sphere with realistic textures (atmosphere, normal maps, specular highlights)
- **Click Interaction**: Click the Earth to trigger a bounce animation and increment a counter
- **Starfield Background**: 200 procedurally placed stars creating an immersive space environment
- **Reddit Integration**: Personalized greeting using your Reddit username
- **Real-time Persistence**: Counter values saved to Redis via server API
- **Responsive Design**: Works seamlessly on desktop and mobile browsers
- **Smooth Animations**: Continuous Earth rotation with physics-based bounce effects

### Planned Features (Game Foundation Ready)

The following game systems are implemented and tested, ready for integration:

- **First-Person 3D Gameplay**: Experience the thrill of chase and escape from a first-person perspective with full 360° camera control
- **Procedurally Generated City**: Navigate through a massive city with 60+ buildings, 40+ houses, roads, rivers, and bridges spanning a 400x400 unit map
- **Asymmetric Abilities**: ONI players fly with jetpacks while runners dash at high speeds - each role requires different strategies
- **Strategic Fuel Management**: Every ability consumes fuel that regenerates differently based on your role and actions
- **Beacon Tracking System**: ONI players can activate a powerful beacon to reveal all runner locations for 10 seconds
- **AI-Powered Opponents**: Games automatically fill with intelligent AI players that chase, flee, and use abilities strategically
- **Bilingual Support**: Full English and Japanese (日本語) language support with instant switching
- **Mobile-Friendly**: Touch controls and responsive design for mobile devices
- **Scalable Matches**: Support for 4 to 20 players with customizable round durations (3 or 5 minutes)

## What Makes JetOni Innovative?

### Current Innovation

1. **Reddit-Native 3D Experience**

   - One of the first fully interactive 3D applications running directly within Reddit posts
   - No external websites or downloads required - everything runs within Reddit's ecosystem
   - Demonstrates the potential for bringing high-quality 3D graphics to social media platforms

2. **WebGL in Social Media**

   - Brings Three.js-powered 3D rendering to Reddit
   - Realistic Earth textures with normal and specular mapping
   - Smooth 60 FPS animations with physics-based interactions
   - Raycasting for precise 3D object interaction

3. **Seamless Integration**

   - Server-side state persistence using Redis
   - Reddit authentication handled automatically by Devvit
   - Real-time client-server communication via REST API
   - Cross-platform compatibility (desktop and mobile)

4. **Foundation for Complex Gaming**
   - Demonstrates the technical foundation for building multiplayer 3D games on Reddit
   - Complete game engine, physics, and state management systems implemented
   - Modular architecture ready for feature integration

### Planned Gameplay Innovation (Foundation Ready)

The following innovative mechanics are designed and implemented, awaiting integration:

1. **Asymmetric Vertical vs Horizontal Mobility**

   - ONI players dominate vertical space with jetpack flight (1.5x speed boost)
   - Runners excel at horizontal movement with dash ability (2x speed burst)
   - Creates dynamic cat-and-mouse gameplay across 3D urban terrain

2. **Context-Aware Fuel System**

   - ONI regenerates fuel on any surface (20 units/second)
   - Runners only regenerate when stationary on surfaces
   - Forces strategic decision-making: move or recover?
   - Jetpack consumes 30 units/second, dash consumes 25 units/second

3. **Cascading Role Dynamics**

   - Tagged players instantly become ONI with full abilities
   - Original ONI becomes a runner and must now escape
   - Creates unpredictable gameplay where hunters become hunted
   - Survival time tracked for competitive leaderboards

4. **Tactical Beacon Ability**

   - 30-second initial delay after becoming ONI
   - Reveals all runner positions for 10 seconds
   - 30-second cooldown between uses
   - Must be used strategically to corner hidden players

5. **Full 3D Urban Parkour**
   - Climb buildings using ladders
   - Jump across rooftops
   - Cross rivers via bridges
   - Navigate through alleys and streets
   - Water slows movement by 50%
   - Moving cars create dynamic obstacles

### Technical Foundation (Implemented)

- **Game Engine**: Complete Three.js scene management with camera, lighting, and rendering pipeline
- **Physics System**: Gravity, velocity, surface detection, jump/jetpack forces, and collision detection
- **City Generator**: Procedural generation of 60+ buildings, 40+ houses, roads, rivers, and bridges
- **Game State Management**: Player tracking, fuel management, position synchronization, and game phases
- **i18n System**: Complete bilingual support (English/Japanese) with localStorage persistence
- **Testing Infrastructure**: Comprehensive test coverage for all core systems using Vitest
- **Type Safety**: Full TypeScript implementation with shared types between client and server

## Current Implementation

### What You Can Do Now

JetOni is currently a **3D interactive demo** that showcases the foundation for the planned multiplayer tag game. The current implementation includes:

**Interactive Demo:**

- **3D Earth Visualization**: A beautifully rendered Earth sphere with realistic textures (atmosphere, normal maps, and specular highlights)
- **Starfield Background**: 200 procedurally placed stars creating an immersive space environment
- **Click Interaction**: Click anywhere on the Earth to trigger a gentle bounce animation and increment the counter
- **Reddit Integration**: Personalized greeting using your Reddit username
- **Real-time Counter**: Server-side counter persistence using Redis, demonstrating client-server communication
- **Responsive Design**: Fully responsive layout that works on desktop and mobile devices

**Game Foundation (Implemented):**

- **Game Engine**: Complete Three.js scene setup with camera, lighting, and rendering pipeline
- **Game State Management**: Core game state classes for managing players, fuel, positions, and game phases
- **City Generator**: Procedural city generation system with buildings, houses, roads, rivers, and bridges
- **Dynamic Objects**: Cars, pedestrians, and ladders with animations
- **i18n System**: Complete bilingual support (English/Japanese) with localStorage persistence
- **Type Definitions**: Comprehensive TypeScript interfaces for game state, players, and API
- **Constants**: All game constants defined (speeds, fuel rates, map size, etc.)
- **Testing Infrastructure**: Vitest setup with comprehensive tests for game state, i18n, and game engine

### How to Play (Current Demo)

1. **Launch the App**

   - Find a JetOni post on Reddit
   - Click the "Play" button to open the app in full-screen mode
   - The app loads with a personalized greeting using your Reddit username

2. **Interact with the Earth**

   - **Click anywhere on the Earth sphere** to interact
   - Each click triggers a satisfying bounce animation
   - The counter increments with each click
   - Your clicks are saved to the server in real-time

3. **Explore the Scene**

   - Watch the Earth slowly rotate on its axis
   - Observe the realistic lighting and shadows on the planet surface
   - Notice the starfield in the background creating depth

4. **Access Resources**
   - Click **"Docs"** to view Devvit documentation
   - Click **"r/Devvit"** to visit the Devvit community
   - Click **"Discord"** to join the Devvit Discord server

### What Makes This Innovative

1. **Reddit-Native 3D Experience**: One of the first fully interactive 3D applications running directly within Reddit posts using the Devvit platform
2. **WebGL in Social Media**: Brings high-quality 3D graphics to a social media platform, opening new possibilities for interactive content
3. **Seamless Integration**: No external websites or downloads required - everything runs within Reddit's ecosystem
4. **Foundation for Multiplayer Gaming**: Demonstrates the technical foundation for building complex multiplayer 3D games on Reddit
5. **Cross-Platform Compatibility**: Works seamlessly on desktop browsers and mobile devices without any special configuration

### Technical Implementation

**Current Demo Features:**

- **Three.js Scene Setup**: Complete 3D rendering pipeline with camera, lighting, and materials
- **Texture Mapping**: Earth textures including diffuse, normal, and specular maps for realistic appearance
- **Raycasting**: Precise click detection on 3D objects using Three.js raycasting
- **Animation System**: Smooth rotation and bounce animations using requestAnimationFrame
- **Devvit Integration**: Server-side API endpoints with Reddit authentication

**Game Foundation (Ready for Integration):**

- **Game Engine (`src/client/game/game-engine.ts`)**: Scene management, camera, renderer, and game loop
- **Game State (`src/client/game/game-state.ts`)**: Player state, fuel management, position tracking, and game phases
- **City Generator (`src/client/environment/city-generator.ts`)**: Procedural city with 60+ buildings, 40+ houses, roads, rivers, and bridges
- **Dynamic Objects (`src/client/environment/dynamic-objects.ts`)**: Animated cars, pedestrians, and ladders
- **i18n System (`src/client/i18n/`)**: Complete bilingual support with translation files and UI integration
- **Type Definitions (`src/shared/types/`)**: Comprehensive interfaces for game state, players, and API
- **Constants (`src/shared/constants.ts`)**: All game parameters (speeds, fuel rates, map size, etc.)
- **Testing Infrastructure**: Vitest with comprehensive tests (game state, i18n, game engine, city generator)
- **Project Structure**: Organized monorepo with client, server, and shared code
- **Build System**: Vite-based build pipeline optimized for both client and server

## Planned Gameplay

### Controls (Coming Soon)

#### Desktop Controls

**Movement:**

- `W` - Move forward
- `A` - Strafe left
- `S` - Move backward
- `D` - Strafe right
- `Mouse` - Look around (360° camera control)
- `ESC` - Pause menu / Release pointer lock

**ONI Abilities:**

- `SPACE` (hold) - Activate jetpack flight (consumes 30 fuel/second)
- `B` - Activate beacon to reveal all runners (10s duration, 30s cooldown)

**Runner Abilities:**

- `SPACE` - Jump (only when on ground, no fuel cost)
- `SHIFT` (hold) - Dash at high speed (consumes 25 fuel/second)

**Debug:**

- `F3` - Toggle debug information (position, velocity, fuel, etc.)

#### Mobile Controls

- **Touch and drag** - Look around
- **On-screen dash/jetpack button** - Activate movement ability
- **On-screen beacon button** - Activate beacon (ONI only)
- Buttons automatically adapt based on your role

### Gameplay Guide (Coming Soon)

#### Playing as ONI (Demon/鬼)

**Objective:** Tag all runners before the timer reaches zero

**Your Advantages:**

- **Jetpack Flight**: Hold SPACE to fly in any direction
  - Consumes 30 fuel/second while active
  - Provides vertical mobility to reach rooftops
  - Can fly over obstacles and water
- **Speed Boost**: Move 1.5x faster than runners (15 units/second)
- **Fuel Recovery**: Regenerate 20 fuel/second on any surface (ground, rooftops, bridges)
- **Beacon Ability**: Press B to reveal all runner locations
  - Available 30 seconds after becoming ONI
  - Shows yellow beams above all runners for 10 seconds
  - 30-second cooldown between uses

**Winning Strategies:**

- **Height Advantage**: Use jetpack to reach rooftops and scan for runners
- **Beacon Timing**: Activate beacon when runners are hidden to locate them
- **Fuel Management**: Land on surfaces to regenerate fuel before chasing
- **Corner Tactics**: Drive runners toward water or map edges where they're slower
- **Target Priority**: Chase the closest visible runner first
- **Predict Movement**: Anticipate where runners will flee and cut them off

**What Happens When You Tag Someone:**

- Tagged player instantly becomes ONI with full abilities
- You become a runner and must now escape
- Your survival time is recorded for the leaderboard

#### Playing as Runner (Escaping/逃げる側)

**Objective:** Survive until the timer reaches zero without being tagged

**Your Advantages:**

- **Dash Ability**: Hold SHIFT to sprint at high speed
  - Increases speed to 20 units/second (2x normal speed)
  - Consumes 25 fuel/second while active
  - Perfect for quick escapes
- **Jump**: Press SPACE to jump over obstacles (no fuel cost)
- **Fuel Recovery**: Regenerate 20 fuel/second when stationary on surfaces
  - Must stop moving to recover fuel
  - Creates risk/reward decision: move or recover?

**Survival Strategies:**

- **Stay Hidden**: Use buildings, alleys, and structures for cover
- **Vertical Escape**: Climb ladders to reach rooftops and hide
- **Dash Wisely**: Save fuel for emergency escapes when spotted
- **Fuel Management**: Stop in safe locations to regenerate fuel
- **Avoid Water**: Water slows movement by 50% - stay on land
- **Watch for Beacons**: When beacon activates, immediately relocate
- **Use Terrain**: Navigate through complex areas where jetpack users struggle
- **Stay Mobile**: Keep moving between hiding spots to avoid being cornered
- **Listen for ONI**: Watch for red markers approaching your location

### Core Game Mechanics

#### Fuel System

The fuel system creates strategic depth by forcing players to balance ability usage with recovery:

- **Maximum Fuel**: 100 units for all players
- **ONI Fuel Recovery**: 20 units/second on any surface (ground, rooftops, bridges)
- **Runner Fuel Recovery**: 20 units/second only when stationary on surfaces
- **Jetpack Consumption**: 30 units/second (ONI only)
- **Dash Consumption**: 25 units/second (Runners only)
- **Empty Fuel**: Abilities are disabled when fuel reaches zero

**Key Insight**: ONI can recover fuel while moving, but runners must stop to recover. This creates a risk/reward dynamic where runners must choose between staying mobile or recovering fuel.

#### Tagging Mechanics

- **Tag Range**: 1.5 units (close proximity required)
- **Instant Role Switch**: Tagged runner immediately becomes ONI with full abilities
- **Original ONI**: Becomes a runner and must now escape
- **Survival Time**: Recorded for each player from game start to when tagged
- **Multiple ONI**: As more players get tagged, multiple ONI hunt remaining runners

#### Visual Indicators

Players are marked with colored indicators for easy identification:

- **ONI Players**: Red cone marker above head
  - 90% opacity when moving
  - 50% opacity when stationary
  - Rotates continuously
- **Runners**: Green cone marker above head
  - 90% opacity when moving
  - 50% opacity when stationary
  - Rotates continuously
- **Beacon Active**: Bright yellow beam above all runners (visible to all players)
- **Spotted Indicator**: "Spotted!" message when ONI has line of sight to you

#### Environment Features

The procedurally generated city provides diverse tactical opportunities:

- **Buildings**: 60+ tall buildings with flat rooftops
  - Climbable via ladders
  - Provide hiding spots and vantage points
  - Create vertical gameplay opportunities
- **Houses**: 40+ smaller houses for ground-level cover
- **Roads**: Streets with moving cars
  - Cars cause knockback on collision
  - Create dynamic obstacles
- **River**: Water feature crossing the map
  - Slows movement by 50%
  - Disadvantages runners trying to escape
- **Bridges**: Safe crossing points over the river
- **Ladders**: Vertical climbing system for reaching rooftops
  - Switches to third-person camera while climbing
- **Map Boundaries**: 400x400 unit playable area (200 units from center)
- **Height Limit**: 100 units maximum altitude

#### Game Timer

- **Duration Options**: 3 minutes (180 seconds) or 5 minutes (300 seconds)
- **Timer Display**: Shows remaining time in HUD
- **Warning States**:
  - Normal: White text
  - Warning: Yellow text (under 60 seconds)
  - Danger: Red text (under 30 seconds)

### Winning Conditions

#### Runners Win If:

- At least one runner survives until timer reaches zero
- All surviving runners are ranked by survival time
- Longest survival time wins

#### ONI Wins If:

- All players become ONI before timer expires
- Last player to be tagged has the longest survival time

#### Results Screen

After each round:

- **Player Rankings**: Sorted by survival time (longest to shortest)
- **Winner Highlight**: Player with longest survival time
- **Status Display**: Shows if each player escaped or was tagged
- **Statistics Update**: Wins/losses recorded to persistent storage
- **Next Round**: Continue to next round or return to menu

### Statistics Tracking

The game tracks your performance across all sessions:

- **Games Played**: Total number of games completed
- **Wins**: Games where you had the longest survival time
- **Losses**: Games where you were tagged before the end
- **Win Rate**: Percentage of games won
- **Total Survival Time**: Cumulative time survived across all games
- **Longest Survival**: Your best single-game survival time
- **Average Survival**: Mean survival time per game

Statistics are stored locally and persist across sessions.

## Current Implementation

### What You Can Do Now

JetOni is currently a **3D interactive demo** that showcases the foundation for the planned multiplayer tag game. The current implementation includes:

**Interactive Demo:**

- **3D Earth Visualization**: A beautifully rendered Earth sphere with realistic textures (atmosphere, normal maps, and specular highlights)
- **Starfield Background**: 200 procedurally placed stars creating an immersive space environment
- **Click Interaction**: Click anywhere on the Earth to trigger a gentle bounce animation and increment the counter
- **Reddit Integration**: Personalized greeting using your Reddit username
- **Real-time Counter**: Server-side counter persistence using Redis, demonstrating client-server communication
- **Responsive Design**: Fully responsive layout that works on desktop and mobile devices

**Game Foundation (Implemented):**

- **Game Engine**: Complete Three.js scene setup with camera, lighting, and rendering pipeline
- **Game State Management**: Core game state classes for managing players, fuel, positions, and game phases
- **Player Physics System**: Gravity, velocity, surface detection, and collision mechanics
- **City Generator**: Procedural city generation system with buildings, houses, roads, rivers, and bridges
- **Collision Detection**: Box and cylinder collision detection for buildings and dynamic objects
- **Dynamic Objects**: Cars, pedestrians, and ladders with animations
- **i18n System**: Complete bilingual support (English/Japanese) with localStorage persistence
- **Type Definitions**: Comprehensive TypeScript interfaces for game state, players, and API
- **Constants**: All game constants defined (speeds, fuel rates, map size, etc.)
- **Testing Infrastructure**: Vitest setup with comprehensive tests for all core systems

### How to Play (Current Demo)

1. **Launch the App**

   - Find a JetOni post on Reddit
   - Click the "Play" button to open the app in full-screen mode
   - The app loads with a personalized greeting using your Reddit username

2. **Interact with the Earth**

   - **Click anywhere on the Earth sphere** to interact
   - Each click triggers a satisfying bounce animation
   - The counter increments with each click
   - Your clicks are saved to the server in real-time

3. **Explore the Scene**

   - Watch the Earth slowly rotate on its axis
   - Observe the realistic lighting and shadows on the planet surface
   - Notice the starfield in the background creating depth

4. **Access Resources**
   - Click **"Docs"** to view Devvit documentation
   - Click **"r/Devvit"** to visit the Devvit community
   - Click **"Discord"** to join the Devvit Discord server

### What Makes This Innovative

1. **Reddit-Native 3D Experience**: One of the first fully interactive 3D applications running directly within Reddit posts using the Devvit platform
2. **WebGL in Social Media**: Brings high-quality 3D graphics to a social media platform, opening new possibilities for interactive content
3. **Seamless Integration**: No external websites or downloads required - everything runs within Reddit's ecosystem
4. **Foundation for Multiplayer Gaming**: Demonstrates the technical foundation for building complex multiplayer 3D games on Reddit
5. **Cross-Platform Compatibility**: Works seamlessly on desktop browsers and mobile devices without any special configuration

### Technical Implementation

**Current Demo Features:**

- **Three.js Scene Setup**: Complete 3D rendering pipeline with camera, lighting, and materials
- **Texture Mapping**: Earth textures including diffuse, normal, and specular maps for realistic appearance
- **Raycasting**: Precise click detection on 3D objects using Three.js raycasting
- **Animation System**: Smooth rotation and bounce animations using requestAnimationFrame
- **Devvit Integration**: Server-side API endpoints with Reddit authentication

**Game Foundation (Ready for Integration):**

- **Game Engine (`src/client/game/game-engine.ts`)**: Scene management, camera, renderer, and game loop
- **Game State (`src/client/game/game-state.ts`)**: Player state, fuel management, position tracking, and game phases
- **Player Physics (`src/client/player/player-physics.ts`)**: Gravity, velocity, surface landing, jump/jetpack forces, water detection
- **Collision System (`src/client/environment/collision-system.ts`)**: Box and cylinder collision detection with sliding
- **City Generator (`src/client/environment/city-generator.ts`)**: Procedural city with 60+ buildings, 40+ houses, roads, rivers, and bridges
- **Dynamic Objects (`src/client/environment/dynamic-objects.ts`)**: Animated cars, pedestrians, and ladders
- **i18n System (`src/client/i18n/`)**: Complete bilingual support with translation files and UI integration
- **Type Definitions (`src/shared/types/`)**: Comprehensive TypeScript interfaces for game state, players, and API
- **Constants (`src/shared/constants.ts`)**: All game parameters (speeds, fuel rates, map size, etc.)
- **Testing Infrastructure**: Vitest with comprehensive tests for all core systems

### Development Roadmap

The following features are planned for the full JetOni game (see `.kiro/specs/jetoni/tasks.md` for detailed roadmap):

**Phase 1 - Foundation (✅ Complete)**

- ✅ Project structure and build system
- ✅ Shared type definitions and constants
- ✅ i18n system with English and Japanese support
- ✅ Three.js scene and game engine initialization
- ✅ Game state management
- ✅ Player physics system with gravity and surface detection
- ✅ Collision detection system for buildings and objects
- ✅ City generation system with dynamic objects
- ✅ Testing infrastructure for all core systems

**Phase 2 - Player Mechanics (Next)**

- Player controller with WASD movement and mouse look
- Jetpack flight for ONI players (vertical mobility)
- Dash ability for Runner players (horizontal speed boost)
- Jump mechanics for Runner players
- Fuel management system with context-aware regeneration

**Phase 3 - Gameplay Systems (Planned)**

- Tag mechanics with role switching (ONI ↔ Runner)
- Beacon tracking system for ONI players
- AI-powered opponent players with behavior trees
- Camera system (first-person and third-person for ladders)
- Visual indicators and particle effects

**Phase 4 - UI & Polish (Planned)**

- Complete menu system (title screen, game settings, lobby)
- In-game HUD (timer, fuel gauge, player count)
- Results screen with statistics
- Mobile touch controls
- Game timer and end conditions

**Phase 5 - Multiplayer (Planned)**

- Server API for game management
- Real-time multiplayer synchronization
- Lobby system with matchmaking
- Persistent player statistics with Redis
- Leaderboards

## Development

### Prerequisites

- Node.js 22.2.0 or higher
- Reddit account connected to Reddit Developers
- Devvit CLI installed

### Getting Started

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Start development server:

   ```bash
   npm run dev
   ```

4. Open the playtest URL provided in your browser

### Commands

- `npm run dev` - Start development server with live reload
- `npm run build` - Build client and server projects
- `npm test` - Run all tests
- `npm run lint` - Lint code
- `npm run check` - Type check, lint, and format
- `make deploy` - Deploy to Devvit (runs tests first)
- `make pr` - Create pull request after tests pass

### Project Structure

```
src/
├── client/          # Frontend Three.js game
│   ├── main.ts      # Entry point
│   ├── i18n/        # Internationalization
│   ├── game/        # Game engine and logic
│   ├── player/      # Player controls and physics
│   ├── environment/ # City generation and collision
│   ├── ai/          # AI player behavior
│   └── ui/          # User interface components
├── server/          # Backend API endpoints
│   ├── index.ts     # Express server
│   ├── api/         # API routes
│   └── core/        # Game management logic
└── shared/          # Shared types and constants
    ├── types/       # TypeScript interfaces
    └── constants.ts # Game constants
```

## Technology Stack

- **[Devvit](https://developers.reddit.com/)**: Reddit's developer platform
- **[Three.js](https://threejs.org/)**: 3D graphics and rendering
- **[TypeScript](https://www.typescriptlang.org/)**: Type-safe development
- **[Vite](https://vite.dev/)**: Fast build tool
- **[Express](https://expressjs.com/)**: Backend API server
- **[Redis](https://redis.io/)**: Data persistence (via Devvit)

## Security

This project implements multiple security measures to protect against vulnerabilities:

### Automated Security Scanning

- **GitLeaks**: Scans for secrets and credentials in code and git history
- **CodeQL**: Analyzes code for security vulnerabilities
- **Dependency Check**: Monitors npm packages for known vulnerabilities
- **CI/CD Pipeline**: All security checks run automatically on every push and pull request

### Security Best Practices

- No secrets or API keys committed to repository
- All sensitive data stored in GitHub Secrets
- Regular dependency updates via Dependabot
- Branch protection rules enforced on main branch

### Reporting Security Issues

If you discover a security vulnerability, please report it privately:

1. Do not create a public GitHub issue
2. Contact the maintainers directly
3. Provide detailed information about the vulnerability

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/feature-name`
3. Make your changes
4. Run tests: `make test`
5. Create a pull request: `make pr`

All contributions must pass security scans before being merged.

## License

See [LICENSE](LICENSE) file for details.

## Support

- [Devvit Documentation](https://developers.reddit.com/docs)
- [r/Devvit Community](https://www.reddit.com/r/Devvit)
- [Discord](https://discord.com/invite/R7yu2wh9Qz)
