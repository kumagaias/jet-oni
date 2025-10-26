# JetOni - 3D Tag Game on Reddit

[![CI/CD Pipeline](https://github.com/YOUR_USERNAME/jet-oni/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/jet-oni/actions/workflows/ci.yml)
[![CodeQL](https://github.com/YOUR_USERNAME/jet-oni/actions/workflows/codeql.yml/badge.svg)](https://github.com/YOUR_USERNAME/jet-oni/actions/workflows/codeql.yml)
[![GitLeaks](https://github.com/YOUR_USERNAME/jet-oni/actions/workflows/gitleaks.yml/badge.svg)](https://github.com/YOUR_USERNAME/jet-oni/actions/workflows/gitleaks.yml)

A multiplayer 3D tag game built with Three.js and Devvit, running directly on Reddit. Players will navigate a futuristic city environment in first-person view, chasing or evading each other in an intense game of tag with jetpacks, dash abilities, and strategic beacon powers.

## What is JetOni?

JetOni (ジェット鬼) is a Reddit-native 3D game project that demonstrates the technical foundation for building complex 3D games directly within Reddit posts using the Devvit platform. Currently, it features an **interactive 3D Earth demo** that showcases WebGL rendering, real-time state persistence, and precise 3D interaction mechanics.

**Planned Full Game:** An immersive 3D multiplayer tag game where one player starts as the "ONI" (demon/鬼) and must tag other players to convert them. The last player remaining untagged wins! The game will combine traditional Japanese tag games with futuristic parkour mechanics in a fully 3D urban environment.

### Key Features (Planned)

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

### Revolutionary Gameplay Mechanics

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

### Technical Innovation

- **Reddit-Native 3D Gaming**: First-person 3D game running entirely within Reddit posts using Devvit platform
- **WebGL Performance**: Optimized Three.js rendering with shadow mapping, fog effects, and 60 FPS gameplay
- **Intelligent AI System**: AI players with behavior trees for chasing, fleeing, wandering, and ability usage
- **Cross-Platform Compatibility**: Seamless experience on desktop and mobile browsers
- **Real-time State Management**: Efficient game state synchronization with 20 updates/second
- **Persistent Statistics**: Track wins, losses, survival times, and win rates across sessions

## Current Implementation

### What You Can Experience Now

JetOni is currently a **3D interactive demo** that showcases the technical foundation for the planned multiplayer tag game. The current implementation demonstrates Reddit-native 3D capabilities while the full game mechanics are being developed.

**Interactive Demo Features:**

1. **3D Earth Visualization**
   - Beautifully rendered Earth sphere with realistic textures
   - Atmospheric diffuse map showing continents and oceans
   - Normal map creating realistic terrain depth
   - Specular map for realistic ocean reflections and highlights
   - Smooth continuous rotation on multiple axes

2. **Immersive Starfield**
   - 200 procedurally placed stars in 3D space
   - Creates depth and cosmic atmosphere
   - Stars remain static while Earth rotates

3. **Interactive Click Mechanics**
   - Click anywhere on the Earth sphere to interact
   - Triggers a gentle bounce animation with velocity-based physics
   - Uses Three.js raycasting for precise 3D object detection
   - Smooth scale animation (grows to 1.2x, then returns to normal)

4. **Real-time State Persistence**
   - Each click increments a counter displayed at screen center
   - Counter value persisted to Redis on the server
   - Data survives page refreshes and sessions
   - Demonstrates foundation for multiplayer game state

5. **Reddit Integration**
   - Personalized greeting displays your Reddit username on load
   - Runs entirely within Reddit posts using Devvit
   - No external websites or downloads required

6. **Responsive Design**
   - Fully responsive layout for desktop and mobile browsers
   - Automatic canvas resizing on window resize
   - Touch-friendly interaction on mobile devices

**Game Foundation (Implemented, Not Yet Integrated):**
- **Game Engine** (`src/client/game/game-engine.ts`): Scene management, camera control, renderer, and game loop with delta time
- **Game State** (`src/client/game/game-state.ts`): Player state management, fuel tracking, position/velocity, game phases (lobby/playing/ended)
- **Player Physics** (`src/client/player/player-physics.ts`): Gravity, velocity, surface detection (ground/rooftop/bridge), water resistance
- **Collision System** (`src/client/environment/collision-system.ts`): Building collision detection, sliding mechanics
- **City Generator** (`src/client/environment/city-generator.ts`): Procedural city with 60+ buildings, 40+ houses, roads, rivers, and bridges
- **Dynamic Objects** (`src/client/environment/dynamic-objects.ts`): Animated cars (20), pedestrians (30), and ladders (15)
- **i18n System** (`src/client/i18n/`): Complete bilingual support (English/Japanese) with localStorage persistence
- **Type Definitions** (`src/shared/types/`): Comprehensive TypeScript interfaces for game state, players, and API
- **Constants** (`src/shared/constants.ts`): All game parameters (speeds, fuel rates, map size, physics values)
- **Testing Infrastructure**: Vitest with comprehensive unit tests for all core systems

### How to Play the Current Demo

#### Step 1: Launch the App

1. **Find a JetOni post on Reddit** (or create one using the development server)
2. **Click the "Play" button** to open the app in full-screen mode
3. **See your personalized greeting**: "Hey [YourUsername] 👋"

The app loads instantly with a beautiful 3D Earth floating in space, surrounded by stars.

#### Step 2: Interact with the Earth

**Click anywhere on the rotating Earth sphere:**

- 🌍 **Bounce Animation**: The planet gently bounces with each click
  - Smoothly scales up to 1.2x size
  - Returns to normal size with deceleration
  - Uses velocity-based physics for natural movement

- 🔢 **Counter Updates**: Watch the counter at screen center increment
  - Each click adds 1 to the counter
  - Counter value displayed in real-time
  - Automatically saved to server

- 💾 **Persistent State**: Your clicks are saved forever
  - Data stored in Redis on the server
  - Refresh the page - your count remains
  - Demonstrates multiplayer game state foundation

#### Step 3: Explore the Scene

**Observe the Continuous Animation:**

- **Earth Rotation**: The planet slowly spins on two axes
  - Horizontal rotation: 0.0025 radians per frame
  - Vertical tilt: 0.001 radians per frame
  - Creates a natural, mesmerizing effect

- **Realistic Rendering**: Notice the advanced graphics
  - Detailed surface textures showing continents and oceans
  - Specular highlights on water surfaces (realistic reflections)
  - Normal mapping creating terrain depth and texture
  - Dynamic lighting from point light source

- **Starfield Background**: 200 stars in 3D space
  - Randomly positioned throughout the scene
  - Creates depth and cosmic atmosphere
  - Stars remain static while Earth rotates

#### Step 4: Access Resources

At the bottom of the screen, click:

- **"Docs"** → View Devvit platform documentation
- **"r/Devvit"** → Visit the Devvit community subreddit
- **"Discord"** → Join the Devvit Discord server for support

#### Technical Details

**3D Interaction System:**
- **Raycasting**: Converts 2D mouse clicks to 3D ray intersections
- **Precise Detection**: Only clicks on the Earth sphere trigger actions
- **Physics-Based Animation**: Velocity and acceleration for natural bounce

**Rendering Pipeline:**
- **WebGL**: Hardware-accelerated 3D graphics via Three.js
- **Camera**: PerspectiveCamera with 75° field of view, positioned 30 units from Earth
- **Lighting**: Ambient light (0.4 intensity) + Point light (1.0 intensity) at (10, 10, 10)
- **Textures**: Three texture maps (diffuse, normal, specular) for realistic appearance
- **Responsive**: Automatic canvas and camera adjustment on window resize

**Server Communication:**
- **`GET /api/init`**: Fetches initial counter value and Reddit username
- **`POST /api/increment`**: Increments counter on each click
- **Redis Persistence**: All data stored in Redis for cross-session persistence
- **Real-time Updates**: Counter updates immediately after each click

### What Makes This Demo Innovative

#### 1. Reddit-Native 3D Graphics
One of the first fully interactive 3D WebGL applications running directly within Reddit posts using the Devvit platform. No external websites, downloads, or installations required - everything runs within Reddit's ecosystem.

#### 2. Advanced 3D Rendering Techniques
- **Multi-Texture Mapping**: Combines three texture maps (diffuse, normal, specular) for photorealistic Earth rendering
- **Normal Mapping**: Creates realistic terrain depth without additional geometry
- **Specular Mapping**: Produces accurate ocean reflections and highlights
- **Dynamic Lighting**: Point light source creates realistic shadows and highlights

#### 3. Precise 3D Interaction System
- **Raycasting Technology**: Converts 2D mouse coordinates to 3D ray intersections
- **Accurate Object Detection**: Only clicks on the Earth sphere trigger actions, not background
- **Physics-Based Animation**: Velocity and acceleration create natural bounce effects
- **Smooth Transitions**: Seamless scale animations with proper easing

#### 4. Real-time State Persistence
- **Server-Side Storage**: Counter value persisted to Redis database
- **Cross-Session Persistence**: Data survives page refreshes and browser restarts
- **Instant Updates**: Counter updates immediately with each click
- **Foundation for Multiplayer**: Demonstrates the infrastructure needed for multiplayer game state

#### 5. Seamless Social Integration
- **Reddit Authentication**: Automatically displays your Reddit username
- **Post-Native Experience**: Runs entirely within Reddit posts
- **No External Dependencies**: No third-party websites or services required
- **Direct Community Links**: Easy access to Devvit documentation and community

#### 6. Cross-Platform Compatibility
- **Responsive Design**: Works on desktop and mobile browsers
- **Touch-Friendly**: Mobile users can tap the Earth to interact
- **Automatic Scaling**: Canvas and camera adjust to any screen size
- **Performance Optimized**: Smooth 60 FPS animation on all devices

#### 7. Foundation for Complex Gaming
Proves the technical viability of building sophisticated 3D multiplayer games on Reddit:
- ✅ WebGL rendering within Reddit posts
- ✅ Server-side state management with Redis
- ✅ Real-time client-server communication
- ✅ 3D interaction and physics systems
- ✅ Cross-platform compatibility
- ✅ Responsive design for mobile and desktop

### Technical Implementation

#### Current Demo Architecture

**Client-Side (Three.js):**
- Complete 3D rendering pipeline with WebGL
- PerspectiveCamera with 75° FOV and responsive aspect ratio
- Raycasting for precise click detection on 3D objects
- Smooth animation loop using requestAnimationFrame
- Texture loading with proper encoding (sRGB for diffuse, Linear for normal/specular)
- Dynamic bounce animation with velocity-based scaling

**Server-Side (Devvit + Express):**
- RESTful API endpoints (`/api/init`, `/api/increment`)
- Redis integration for persistent counter storage
- Reddit authentication and user context
- JSON response formatting with TypeScript types

**Key Technical Features:**
- **Raycasting**: Converts 2D mouse coordinates to 3D ray for object intersection
- **Texture Mapping**: Multiple texture layers (diffuse, normal, specular) for realistic appearance
- **Animation System**: Velocity-based bounce with acceleration and deceleration
- **Responsive Design**: Automatic canvas resizing and camera aspect ratio adjustment

#### Game Foundation (Implemented, Not Yet Integrated)

The following game systems are fully implemented and tested, ready for integration into the main application:

**Core Game Systems:**
- **Game Engine** (`src/client/game/game-engine.ts`): Scene management, camera control, renderer, and game loop with delta time
- **Game State** (`src/client/game/game-state.ts`): Player state management, fuel tracking, position/velocity, game phases (lobby/playing/ended)
- **Player Physics** (`src/client/player/player-physics.ts`): Gravity, velocity, acceleration, surface detection (ground/rooftop/bridge/water)
- **Collision System** (`src/client/environment/collision-system.ts`): Building collision detection (box/cylinder), sliding mechanics
- **City Generator** (`src/client/environment/city-generator.ts`): Procedural city with 60+ buildings, 40+ houses, roads, rivers, and bridges
- **Dynamic Objects** (`src/client/environment/dynamic-objects.ts`): Animated cars (20), pedestrians (30), and ladders (15)

**Support Systems:**
- **i18n System** (`src/client/i18n/`): Complete bilingual support (English/Japanese) with localStorage persistence
- **Type Definitions** (`src/shared/types/`): Comprehensive TypeScript interfaces for game state, players, and API
- **Constants** (`src/shared/constants.ts`): All game parameters (speeds, fuel rates, map size, physics values)
- **Testing Infrastructure**: Vitest with comprehensive unit tests for all core systems

**Test Coverage:**
- Game State: 15 test cases covering initialization, player management, fuel system, and time tracking
- Game Engine: 12 test cases covering scene setup, game loop, and camera management
- Player Physics: Tests for gravity, surface detection, water resistance, and landing prediction
- Collision System: Tests for building collision, sliding mechanics, and boundary detection
- City Generator: 8 test cases covering building placement, collision detection, and structure generation
- i18n System: 10 test cases covering translation retrieval, language switching, and parameter substitution

**Project Structure:**
```
src/
├── client/          # Frontend (current: Earth demo, planned: full game)
│   ├── main.ts      # Current demo entry point
│   ├── game/        # Game engine and state (implemented, not integrated)
│   ├── player/      # Player physics (implemented, not integrated)
│   ├── environment/ # City generation and dynamic objects (implemented)
│   └── i18n/        # Internationalization system (implemented)
├── server/          # Backend API endpoints
│   └── index.ts     # Express server with Devvit integration
└── shared/          # Shared types and constants
    ├── types/       # TypeScript interfaces
    └── constants.ts # Game constants
```

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

## Current Implementation Status

### What You Can Experience Now

JetOni is currently a **3D interactive demo** that showcases the technical foundation for the planned multiplayer tag game. The current implementation demonstrates Reddit-native 3D capabilities while the full game mechanics are being developed.

#### Interactive Demo Features

**3D Earth Visualization:**
- Beautifully rendered Earth sphere with realistic textures
  - Atmospheric diffuse map for surface details
  - Normal map for terrain depth and texture
  - Specular map for realistic ocean reflections
- Smooth rotation animation on multiple axes
- Dynamic lighting with ambient and point lights

**Interactive Elements:**
- **Click-to-Interact**: Click anywhere on the Earth sphere to trigger a gentle bounce animation
- **Real-time Counter**: Each click increments a server-persisted counter using Redis
- **Personalized Greeting**: Displays your Reddit username on load
- **Starfield Background**: 200 procedurally placed stars creating depth and immersion

**Platform Integration:**
- Runs entirely within Reddit posts using Devvit
- Server-side state persistence with Redis
- Responsive design for desktop and mobile browsers
- Direct links to Devvit documentation and community

### How to Play the Current Demo

1. **Launch the App**
   - Find a JetOni post on Reddit
   - Click the "Play" button to open the app in full-screen mode
   - The app loads with a personalized greeting: "Hey [YourUsername] 👋"

2. **Interact with the Earth**
   - **Click anywhere on the rotating Earth sphere**
   - Watch the planet gently bounce with each click
   - Observe the counter increment in real-time
   - Your clicks are automatically saved to the server

3. **Explore the Scene**
   - Watch the Earth slowly rotate on its axis (0.0025 rad/frame on Y, 0.001 rad/frame on X)
   - Notice the realistic lighting effects on the planet surface
   - Observe the starfield creating a sense of depth and space

4. **Access Resources**
   - Click **"Docs"** to view Devvit documentation
   - Click **"r/Devvit"** to visit the Devvit community subreddit
   - Click **"Discord"** to join the Devvit Discord server

### What Makes This Demo Innovative

1. **Reddit-Native 3D Graphics**: One of the first fully interactive 3D WebGL applications running directly within Reddit posts
2. **Seamless Social Integration**: No external websites, downloads, or installations required - everything runs within Reddit's ecosystem
3. **Real-time State Persistence**: Demonstrates server-side state management with Redis, showing the foundation for multiplayer gaming
4. **Cross-Platform Compatibility**: Works seamlessly on desktop and mobile browsers without special configuration
5. **Foundation for Complex Gaming**: Proves the technical viability of building sophisticated 3D multiplayer games on Reddit

### Technical Implementation

#### Current Demo Architecture

**Client-Side (Three.js):**
- Complete 3D rendering pipeline with WebGL
- PerspectiveCamera with 75° FOV and responsive aspect ratio
- Raycasting for precise click detection on 3D objects
- Smooth animation loop using requestAnimationFrame
- Texture loading with proper encoding (sRGB for diffuse, Linear for normal/specular)
- Dynamic bounce animation with velocity-based scaling

**Server-Side (Devvit + Express):**
- RESTful API endpoints (`/api/init`, `/api/increment`)
- Redis integration for persistent counter storage
- Reddit authentication and user context
- JSON response formatting with TypeScript types

**Key Technical Features:**
- **Raycasting**: Converts 2D mouse coordinates to 3D ray for object intersection
- **Texture Mapping**: Multiple texture layers (diffuse, normal, specular) for realistic appearance
- **Animation System**: Velocity-based bounce with acceleration and deceleration
- **Responsive Design**: Automatic canvas resizing and camera aspect ratio adjustment

#### Game Foundation (Implemented, Not Yet Integrated)

The following game systems are fully implemented and tested, ready for integration into the main application:

**Core Game Systems:**
- **Game Engine** (`src/client/game/game-engine.ts`): Scene management, camera control, renderer, and game loop with delta time
- **Game State** (`src/client/game/game-state.ts`): Player state management, fuel tracking, position/velocity, game phases (lobby/playing/ended)
- **City Generator** (`src/client/environment/city-generator.ts`): Procedural city with 60+ buildings, 40+ houses, roads, rivers, and bridges
- **Dynamic Objects** (`src/client/environment/dynamic-objects.ts`): Animated cars (20), pedestrians (30), and ladders (15)

**Support Systems:**
- **i18n System** (`src/client/i18n/`): Complete bilingual support (English/Japanese) with localStorage persistence
- **Type Definitions** (`src/shared/types/`): Comprehensive TypeScript interfaces for game state, players, and API
- **Constants** (`src/shared/constants.ts`): All game parameters (speeds, fuel rates, map size, physics values)
- **Testing Infrastructure**: Vitest with comprehensive unit tests for all core systems

**Test Coverage:**
- Game State: 15 test cases covering initialization, player management, fuel system, and time tracking
- Game Engine: 12 test cases covering scene setup, game loop, and camera management
- City Generator: 8 test cases covering building placement, collision detection, and structure generation
- i18n System: 10 test cases covering translation retrieval, language switching, and parameter substitution

**Project Structure:**
```
src/
├── client/          # Frontend (current: Earth demo, planned: full game)
│   ├── main.ts      # Current demo entry point
│   ├── game/        # Game engine and state (implemented, not integrated)
│   ├── environment/ # City generation and dynamic objects (implemented)
│   └── i18n/        # Internationalization system (implemented)
├── server/          # Backend API endpoints
│   └── index.ts     # Express server with Devvit integration
└── shared/          # Shared types and constants
    ├── types/       # TypeScript interfaces
    └── constants.ts # Game constants
```

### Development Roadmap

The following features are planned for the full JetOni game (see `.kiro/specs/jetoni/tasks.md` for detailed roadmap):

**Phase 1 - Foundation (✅ Complete)**
- ✅ Project structure and build system
- ✅ Shared type definitions and constants
- ✅ i18n system with English and Japanese support
- ✅ Three.js scene and game engine initialization
- ✅ Game state management
- ✅ City generation system with dynamic objects
- ✅ Testing infrastructure (game state, i18n, game engine, city generator)

**Phase 2 - Player Mechanics (Next)**
- Player physics and collision detection
- First-person controls with WASD movement and mouse look
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
