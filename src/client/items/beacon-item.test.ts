import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { BeaconItem, BeaconItemState } from './beacon-item';

describe('BeaconItem', () => {
  let scene: THREE.Scene;
  let beaconItem: BeaconItem;

  beforeEach(() => {
    scene = new THREE.Scene();
    beaconItem = new BeaconItem(scene);
  });

  describe('placeItems', () => {
    it('should place 2 beacon items on the map', () => {
      const buildings = [
        { position: { x: 0, y: 0, z: 0 }, width: 10, depth: 10 },
      ];

      beaconItem.placeItems(buildings);

      const items = beaconItem.getItems();
      expect(items.length).toBe(2);
    });

    it('should place items with PLACED state', () => {
      const buildings: { position: { x: number; y: number; z: number }; width: number; depth: number }[] = [];

      beaconItem.placeItems(buildings);

      const items = beaconItem.getItems();
      items.forEach((item) => {
        expect(item.state).toBe(BeaconItemState.PLACED);
      });
    });

    it('should place items at different positions', () => {
      const buildings: { position: { x: number; y: number; z: number }; width: number; depth: number }[] = [];

      beaconItem.placeItems(buildings);

      const items = beaconItem.getItems();
      if (items.length >= 2) {
        const item1 = items[0]!;
        const item2 = items[1]!;

        const dx = item1.position.x - item2.position.x;
        const dz = item1.position.z - item2.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        expect(distance).toBeGreaterThan(0);
      }
    });

    it('should avoid placing items too close to buildings', () => {
      const buildings = [
        { position: { x: 0, y: 0, z: 0 }, width: 20, depth: 20 },
      ];

      beaconItem.placeItems(buildings);

      const items = beaconItem.getItems();
      items.forEach((item) => {
        const dx = Math.abs(item.position.x - buildings[0]!.position.x);
        const dz = Math.abs(item.position.z - buildings[0]!.position.z);

        // Should be at least 10 units away from building edge
        const minDistance = 10;
        const buildingHalfWidth = buildings[0]!.width / 2;
        const buildingHalfDepth = buildings[0]!.depth / 2;

        const isFarEnough =
          dx > buildingHalfWidth + minDistance ||
          dz > buildingHalfDepth + minDistance;

        expect(isFarEnough).toBe(true);
      });
    });

    it('should clear previous items when placing new ones', async () => {
      const buildings: { position: { x: number; y: number; z: number }; width: number; depth: number }[] = [];

      beaconItem.placeItems(buildings);
      const firstItems = beaconItem.getItems();
      expect(firstItems.length).toBe(2);

      // Wait 1ms to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1));

      beaconItem.placeItems(buildings);
      const secondItems = beaconItem.getItems();
      expect(secondItems.length).toBe(2);

      // IDs should be different
      expect(firstItems[0]!.id).not.toBe(secondItems[0]!.id);
    });
  });

  describe('checkCollection', () => {
    beforeEach(() => {
      const buildings: { position: { x: number; y: number; z: number }; width: number; depth: number }[] = [];
      beaconItem.placeItems(buildings);
    });

    it('should return null if player is not oni', () => {
      const items = beaconItem.getItems();
      if (items.length > 0) {
        const item = items[0]!;
        const result = beaconItem.checkCollection(item.position, false);
        expect(result).toBeNull();
      }
    });

    it('should return item if oni is within collection radius', () => {
      const items = beaconItem.getItems();
      if (items.length > 0) {
        const item = items[0]!;
        const result = beaconItem.checkCollection(item.position, true);
        expect(result).not.toBeNull();
        expect(result?.id).toBe(item.id);
      }
    });

    it('should return null if oni is too far away', () => {
      const items = beaconItem.getItems();
      if (items.length > 0) {
        const item = items[0]!;
        const farPosition = {
          x: item.position.x + 10,
          y: item.position.y,
          z: item.position.z + 10,
        };
        const result = beaconItem.checkCollection(farPosition, true);
        expect(result).toBeNull();
      }
    });

    it('should not return collected items', () => {
      const items = beaconItem.getItems();
      if (items.length > 0) {
        const item = items[0]!;

        // Collect the item
        beaconItem.collectItem(item.id);

        // Try to collect again
        const result = beaconItem.checkCollection(item.position, true);
        expect(result).toBeNull();
      }
    });
  });

  describe('collectItem', () => {
    beforeEach(() => {
      const buildings: { position: { x: number; y: number; z: number }; width: number; depth: number }[] = [];
      beaconItem.placeItems(buildings);
    });

    it('should mark item as collected', () => {
      const items = beaconItem.getItems();
      if (items.length > 0) {
        const item = items[0]!;
        const success = beaconItem.collectItem(item.id);

        expect(success).toBe(true);
        expect(item.state).toBe(BeaconItemState.COLLECTED);
      }
    });

    it('should return false for non-existent item', () => {
      const success = beaconItem.collectItem('non-existent');
      expect(success).toBe(false);
    });

    it('should return false for already collected item', () => {
      const items = beaconItem.getItems();
      if (items.length > 0) {
        const item = items[0]!;

        beaconItem.collectItem(item.id);
        const secondAttempt = beaconItem.collectItem(item.id);

        expect(secondAttempt).toBe(false);
      }
    });

    it('should remove item from scene', () => {
      const items = beaconItem.getItems();
      if (items.length > 0) {
        const item = items[0]!;
        const initialChildCount = scene.children.length;

        beaconItem.collectItem(item.id);

        expect(scene.children.length).toBeLessThan(initialChildCount);
      }
    });
  });

  describe('getPlacedItems', () => {
    beforeEach(() => {
      const buildings: { position: { x: number; y: number; z: number }; width: number; depth: number }[] = [];
      beaconItem.placeItems(buildings);
    });

    it('should return only placed items', () => {
      const items = beaconItem.getItems();
      if (items.length >= 2) {
        // Collect one item
        beaconItem.collectItem(items[0]!.id);

        const placedItems = beaconItem.getPlacedItems();
        expect(placedItems.length).toBe(1);
        expect(placedItems[0]!.state).toBe(BeaconItemState.PLACED);
      }
    });

    it('should return empty array if all items are collected', () => {
      const items = beaconItem.getItems();
      items.forEach((item) => {
        beaconItem.collectItem(item.id);
      });

      const placedItems = beaconItem.getPlacedItems();
      expect(placedItems.length).toBe(0);
    });
  });

  describe('animate', () => {
    beforeEach(() => {
      const buildings: { position: { x: number; y: number; z: number }; width: number; depth: number }[] = [];
      beaconItem.placeItems(buildings);
    });

    it('should rotate beacon items', () => {
      const items = beaconItem.getItems();
      if (items.length > 0) {
        const item = items[0]!;
        const initialRotation = item.mesh.rotation.y;

        beaconItem.animate(0.1);

        expect(item.mesh.rotation.y).not.toBe(initialRotation);
      }
    });

    it('should not animate collected items', () => {
      const items = beaconItem.getItems();
      if (items.length >= 2) {
        const item = items[0]!;
        beaconItem.collectItem(item.id);

        const placedItem = items[1]!;
        const initialRotation = placedItem.mesh.rotation.y;

        beaconItem.animate(0.1);

        // Placed item should rotate
        expect(placedItem.mesh.rotation.y).not.toBe(initialRotation);
      }
    });
  });

  describe('clearItems', () => {
    it('should remove all items from scene', () => {
      const buildings: { position: { x: number; y: number; z: number }; width: number; depth: number }[] = [];
      beaconItem.placeItems(buildings);

      const initialChildCount = scene.children.length;
      expect(initialChildCount).toBeGreaterThan(0);

      beaconItem.clearItems();

      expect(beaconItem.getItems().length).toBe(0);
    });
  });
});
