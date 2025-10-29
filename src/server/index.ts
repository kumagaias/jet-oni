import express from 'express';
import { InitResponse, IncrementResponse, DecrementResponse } from '../shared/types/api';
import { redis, reddit, createServer, context, getServerPort } from '@devvit/web/server';
import { createPost } from './core/post';
import gameApiRouter from './api/game-api';
import statsApiRouter from './api/stats-api';
import realtimeApiRouter from './api/realtime-api';
import syncApiRouter from './api/sync-api';

const app = express();

// Middleware for JSON body parsing
app.use(express.json());
// Middleware for URL-encoded body parsing
app.use(express.urlencoded({ extended: true }));
// Middleware for plain text body parsing
app.use(express.text());

const router = express.Router();

router.get<{ postId: string }, InitResponse | { status: string; message: string }>(
  '/api/init',
  async (req, res): Promise<void> => {
    const { postId } = context;

    if (!postId) {
      console.error('API Init Error: postId not found in devvit context');
      res.status(400).json({
        status: 'error',
        message: 'postId is required but missing from context',
      });
      return;
    }

    try {
      // Try multiple methods to get username
      let username: string | null = null;
      
      // Method 1: Get from HTTP headers (most reliable for Devvit Web apps)
      username = req.headers['devvit-user-name'] as string | undefined ?? null;
      console.log('[Init] devvit-user-name header:', username);
      
      // Method 2: getCurrentUsername()
      if (!username) {
        username = await reddit.getCurrentUsername();
        console.log('[Init] getCurrentUsername() returned:', username);
      }
      
      // Method 3: If that fails, try getCurrentUser()
      if (!username) {
        try {
          const user = await reddit.getCurrentUser();
          username = user?.username ?? null;
          console.log('[Init] getCurrentUser().username returned:', username);
        } catch (userError) {
          console.error('[Init] getCurrentUser() failed:', userError);
        }
      }
      
      const count = await redis.get('count');

      // Log final result
      if (!username) {
        console.warn('[Init] All methods failed to get Reddit username, using anonymous');
      } else {
        console.log('[Init] Successfully retrieved username:', username);
      }

      res.json({
        type: 'init',
        postId: postId,
        count: count ? parseInt(count) : 0,
        username: username ?? 'anonymous',
      });
    } catch (error) {
      console.error(`API Init Error for post ${postId}:`, error);
      let errorMessage = 'Unknown error during initialization';
      if (error instanceof Error) {
        errorMessage = `Initialization failed: ${error.message}`;
      }
      res.status(400).json({ status: 'error', message: errorMessage });
    }
  }
);

router.post<{ postId: string }, IncrementResponse | { status: string; message: string }, unknown>(
  '/api/increment',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', 1),
      postId,
      type: 'increment',
    });
  }
);

router.post<{ postId: string }, DecrementResponse | { status: string; message: string }, unknown>(
  '/api/decrement',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', -1),
      postId,
      type: 'decrement',
    });
  }
);

router.post('/internal/on-app-install', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      status: 'success',
      message: `Post created in subreddit ${context.subredditName} with id ${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

router.post('/internal/menu/post-create', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

// Mount game API routes
app.use(gameApiRouter);

// Mount stats API routes
app.use(statsApiRouter);

// Mount realtime API routes
app.use(realtimeApiRouter);

// Mount sync API routes (for future use)
app.use(syncApiRouter);

app.use(router);

// Start periodic cleanup of stale games
import { GameManager } from './core/game-manager';
const gameManager = new GameManager();

// Clean up stale games every 2 minutes
setInterval(() => {
  void gameManager.cleanupStaleGames();
}, 2 * 60 * 1000);

// Run initial cleanup after 30 seconds
setTimeout(() => {
  void gameManager.cleanupStaleGames();
}, 30 * 1000);

console.log('[Server] Stale game cleanup task started');

const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(getServerPort());
