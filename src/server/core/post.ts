import { context, reddit } from '@devvit/web/server';

export const createPost = async () => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('subredditName is required');
  }

  return await reddit.submitCustomPost({
    splash: {
      // Splash Screen Configuration
      appDisplayName: 'JetOni',
      backgroundUri: 'default-splash.png',
      buttonLabel: '🚀 Launch Game',
      description: 'Chase or escape in a 3D city! Use jetpacks, dash abilities, and beacons in this thrilling multiplayer tag game.',
      heading: 'Ready to Play?',
      appIconUri: 'default-icon.png',
    },
    postData: {
      gameState: 'initial',
      score: 0,
    },
    subredditName: subredditName,
    title: 'JetOni - 3D Multiplayer Tag Game',
  });
};
