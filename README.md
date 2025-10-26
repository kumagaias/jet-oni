# JetOni - 3D Tag Game on Reddit

A multiplayer 3D tag game built with Three.js and Devvit, running directly on Reddit. Players navigate a futuristic city environment, chasing or evading each other in an intense game of tag with jetpacks, dash abilities, and strategic beacon powers.

## What is JetOni?

JetOni is an immersive 3D multiplayer tag game where one player starts as the "ONI" (demon) and must tag other players to convert them. The last player remaining untagged wins! The game features:

- **3D City Environment**: Navigate through a procedurally generated city with buildings, houses, roads, rivers, and bridges
- **Jetpack Flight**: ONI players can fly using jetpack fuel to chase down runners
- **Dash Ability**: Runner players can dash to escape from ONI players
- **Beacon Power**: ONI players can activate a beacon to reveal all runner locations for 10 seconds
- **AI Players**: Games are automatically filled with intelligent AI players
- **Multilingual Support**: Play in English or Japanese (日本語)
- **Mobile-Friendly**: Touch controls for mobile devices

## What Makes JetOni Innovative?

### Unique Gameplay Mechanics

1. **Asymmetric Abilities**: ONI players have jetpacks for vertical mobility, while runners have dash for horizontal speed bursts
2. **Fuel Management**: Strategic fuel consumption and regeneration adds depth to movement decisions
3. **Dynamic Role Switching**: Tagged players immediately become ONI, creating cascading gameplay dynamics
4. **Beacon Strategy**: ONI players must time their beacon ability carefully to track hidden runners
5. **3D Urban Parkour**: Climb buildings, cross bridges, and navigate complex 3D environments

### Technical Innovation

- **Reddit-Native Gaming**: Fully integrated into Reddit's platform using Devvit
- **Real-time Multiplayer**: Seamless multiplayer experience within Reddit posts
- **Cross-Platform**: Works on desktop and mobile browsers
- **AI-Powered**: Intelligent AI players that chase, flee, and use abilities strategically

## How to Play

### Game Setup

1. **Create or Join a Game**
   - Click "Create Game" to host a new game session
   - Configure player count (4, 6, 8, 10, 15, or 20 players)
   - Set round duration (3 or 5 minutes)
   - Choose number of rounds (1, 3, or 5)
   - Or click "Join Game" to join an existing game

2. **Lobby**
   - Wait for players to join (AI players fill remaining slots automatically)
   - Host presses SPACE to start the game
   - One random player is assigned as ONI, others become runners

### Controls

#### Desktop Controls

**Movement:**
- `W` - Move forward
- `A` - Move left
- `S` - Move backward
- `D` - Move right
- `Mouse` - Look around
- `ESC` - Pause menu

**Abilities (ONI):**
- `SPACE` (hold) - Activate jetpack (consumes fuel)
- `B` - Activate beacon (reveals all runners for 10 seconds, 30s cooldown)

**Abilities (Runner):**
- `SPACE` - Jump (when on ground)
- `SHIFT` (hold) - Dash (increases speed, consumes fuel)

#### Mobile Controls

- Touch and drag to look around
- On-screen buttons for dash/jetpack and beacon abilities
- Movement controls appear on screen

### Gameplay

#### As ONI (Demon)

**Objective:** Tag all runners before time runs out

**Abilities:**
- **Jetpack**: Hold SPACE to fly. Consumes 30 fuel/second. Regenerates 20 fuel/second when on ground.
- **Speed Boost**: Move 1.5x faster than runners
- **Beacon**: After 30 seconds as ONI, activate beacon to reveal all runner positions for 10 seconds. 30-second cooldown.

**Strategy:**
- Use jetpack to reach rooftops and gain height advantage
- Activate beacon when you've lost track of runners
- Chase the closest visible runner
- Corner runners against buildings or water

#### As Runner (Escaping)

**Objective:** Survive until time runs out without being tagged

**Abilities:**
- **Jump**: Press SPACE to jump over obstacles
- **Dash**: Hold SHIFT to sprint at 20 units/second. Consumes 25 fuel/second. Regenerates 20 fuel/second when stationary on ground.

**Strategy:**
- Stay hidden behind buildings and in alleys
- Use dash to escape when spotted
- Climb to rooftops using ladders
- Move constantly to regenerate fuel
- Avoid water (slows movement by 50%)

### Game Mechanics

#### Fuel System

- **Maximum Fuel**: 100 units
- **ONI Fuel Recovery**: 20 units/second (on any surface)
- **Runner Fuel Recovery**: 20 units/second (only when stationary on surface)
- **Jetpack Consumption**: 30 units/second
- **Dash Consumption**: 25 units/second

#### Tagging

- ONI tags runners by getting within 1.5 units
- Tagged runners immediately become ONI
- Original ONI becomes a runner
- Survival time is recorded for each player

#### Visual Indicators

- **ONI Players**: Red marker above head (90% opacity when moving, 50% when stationary)
- **Runners**: Green marker above head (90% opacity when moving, 50% when stationary)
- **Beacon Active**: Yellow beam above all runners
- **Spotted**: "Spotted!" indicator when ONI sees you

#### Environment

- **Buildings**: 60+ buildings with climbable rooftops
- **Houses**: 40+ houses for cover
- **Roads**: Moving cars (cause knockback on collision)
- **River**: Slows movement by 50%
- **Bridges**: Cross the river safely
- **Ladders**: Climb buildings vertically

### Winning

- **Runners Win**: Survive until timer reaches zero
- **ONI Wins**: Tag all runners before time expires
- **Results**: Players ranked by survival time
- **Statistics**: Track wins, losses, and win rate across games

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
