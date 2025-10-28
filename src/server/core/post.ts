import { context, reddit } from '@devvit/web/server';

export const createPost = async () => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('subredditName is required');
  }

  return await reddit.submitCustomPost({
    splash: {
      appDisplayName: 'JetOni',
      backgroundUri: 'cover.jpg',
      buttonLabel: 'Play',
      description: 'A 3D multiplayer tag game where you chase and escape in a futuristic city!',
      heading: 'Chase or Escape!',
    },
    postData: {
      gameState: 'initial',
      score: 0,
    },
    subredditName: subredditName,
    title: 'JetOni - 3D Multiplayer Tag Game',
  });
};
