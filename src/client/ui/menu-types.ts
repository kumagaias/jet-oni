/**
 * Menu Types
 * Shared types and interfaces for menu system
 */

import { I18n } from '../i18n/i18n';
import { GameAPIClient } from '../api/game-api-client';
import { ToastNotification } from './toast-notification';

export interface MenuDependencies {
  i18n: I18n;
  gameApiClient: GameAPIClient;
  toast: ToastNotification;
  username: string;
}

export interface GameEngine {
  pause: () => void;
  resume: () => void;
}
