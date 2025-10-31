// Game constants

// Player movement speeds (units per second)
export const PLAYER_SPEED = 10;
export const ONI_SPEED_MULTIPLIER = 1.5;
export const DASH_SPEED = 20;

// Fuel system
export const MAX_FUEL = 100;
export const JETPACK_FUEL_CONSUMPTION = 30; // per second
export const DASH_FUEL_CONSUMPTION = 25; // per second
export const ONI_FUEL_RECOVERY = 20; // per second on surface
export const RUNNER_FUEL_RECOVERY = 20; // per second on surface while stationary

// Physics
export const GRAVITY = 20;
export const JUMP_FORCE = 10;
export const RUNNER_JUMP_MULTIPLIER = 1.5; // Runners jump 1.5x higher than oni
export const JETPACK_FORCE = 21; // Must be greater than GRAVITY to fly upward

// Tagging
export const TAG_DISTANCE = 5.0; // units (increased for easier tagging)

// Beacon ability
export const BEACON_INITIAL_DELAY = 30; // seconds after becoming oni
export const BEACON_DURATION = 15; // seconds
export const BEACON_COOLDOWN = 30; // seconds

// Game timing
export const ROUND_DURATION_3MIN = 180; // seconds
export const ROUND_DURATION_5MIN = 300; // seconds

// Player limits
export const PLAYER_COUNTS = [4, 6, 8, 10, 15, 20];
export const ROUND_COUNTS = [1, 3, 5];
export const MIN_ONI_COUNT = 1; // Minimum number of oni players
export const MIN_TOTAL_PLAYERS = 4; // Minimum total players (including AI)

// Map boundaries
export const MAP_SIZE = 200; // units (half-width/half-depth)
export const MAP_HEIGHT = 100; // units

// Environment
export const BUILDING_COUNT = 60;
export const HOUSE_COUNT = 40;
export const WATER_SPEED_MULTIPLIER = 0.5;
export const WATER_SINK_DEPTH = 0.3; // How much entities sink into water (units)

// Camera
export const CAMERA_HEIGHT = 1.7; // eye level in meters
export const CAMERA_DISTANCE_THIRD_PERSON = 5; // units behind player
export const CAMERA_PITCH_LIMIT = Math.PI / 2 - 0.1; // prevent looking straight up/down

// Visual indicators
export const MARKER_OPACITY_MOVING = 0.9;
export const MARKER_OPACITY_STATIONARY = 0.5;
export const MARKER_ROTATION_SPEED = 2; // radians per second

// AI behavior
export const AI_UPDATE_INTERVAL = 100; // milliseconds
export const AI_ABILITY_COOLDOWN = 3000; // milliseconds
export const AI_VISION_RANGE = 50; // units
export const AI_WANDER_RADIUS = 20; // units

// Network/Update rates
export const GAME_UPDATE_RATE = 60; // updates per second
export const NETWORK_UPDATE_RATE = 20; // network updates per second

// Timer colors (for UI)
export const TIMER_WARNING_THRESHOLD = 60; // seconds
export const TIMER_DANGER_THRESHOLD = 30; // seconds
