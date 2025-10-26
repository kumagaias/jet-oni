# JetOni - 3D Tag Game on Reddit

A multiplayer 3D tag game built with Three.js and Devvit, running directly on Reddit. Players navigate a futuristic city environment in first-person view, chasing or evading each other in an intense game of tag with jetpacks, dash abilities, and strategic beacon powers.

## What is JetOni?

JetOni (ジェット鬼) is an immersive 3D multiplayer tag game where one player starts as the "ONI" (demon/鬼) and must tag other players to convert them. The last player remaining untagged wins! The game combines traditional Japanese tag games with futuristic parkour mechanics in a fully 3D urban environment.

### Key Features

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

## How to Play

### Getting Started

1. **Launch the Game**
   - Find a JetOni post on Reddit
   - Click the "Play" button on the splash screen
   - Game opens in full-screen mode

2. **Create or Join a Game**
   - **Create Game**: Host a new game session
     - Select player count: 4, 6, 8, 10, 15, or 20 players
     - Choose round duration: 3 or 5 minutes
     - Set number of rounds: 1, 3, or 5 rounds
   - **Join Game**: Browse and join existing games
     - View available games with player counts and settings
     - Join any game that isn't full
   - **Language**: Switch between English (EN) and Japanese (JP) anytime

3. **Lobby Phase**
   - Wait for players to join your game
   - AI players automatically fill remaining slots
   - Host presses **SPACE** to start when ready
   - One random player is assigned as ONI (red marker)
   - All other players become runners (green markers)

### Controls

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

### Gameplay Guide

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

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/feature-name`
3. Make your changes
4. Run tests: `make test`
5. Create a pull request: `make pr`

## License

See [LICENSE](LICENSE) file for details.

## Support

- [Devvit Documentation](https://developers.reddit.com/docs)
- [r/Devvit Community](https://www.reddit.com/r/Devvit)
- [Discord](https://discord.com/invite/R7yu2wh9Qz)
