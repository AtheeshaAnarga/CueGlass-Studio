import { WindowRect } from './types';

export const DEFAULT_EXPANDED_SIZE = { width: 560, height: 340 };
export const MIN_EXPANDED_SIZE = { width: 360, height: 180 };
export const MAX_EXPANDED_SIZE = { width: 850, height: 650 };
export const COLLAPSED_BUBBLE_SIZE = { width: 46, height: 46 };
export const NEAR_CAMERA_TOP_GAP = 16;

export function clampWindowFrame(
  frame: WindowRect,
  visibleArea: WindowRect,
  isBubble: boolean
): WindowRect {
  const width = isBubble
    ? COLLAPSED_BUBBLE_SIZE.width
    : Math.min(
        Math.max(frame.width, MIN_EXPANDED_SIZE.width),
        Math.min(MAX_EXPANDED_SIZE.width, Math.max(MIN_EXPANDED_SIZE.width, visibleArea.width - 16))
      );
  const height = isBubble
    ? COLLAPSED_BUBBLE_SIZE.height
    : Math.min(
        Math.max(frame.height, MIN_EXPANDED_SIZE.height),
        Math.min(MAX_EXPANDED_SIZE.height, Math.max(MIN_EXPANDED_SIZE.height, visibleArea.height - 16))
      );

  const minX = visibleArea.x + 8;
  const maxX = Math.max(minX, visibleArea.x + visibleArea.width - width - 8);
  const minY = visibleArea.y + 8;
  const maxY = Math.max(minY, visibleArea.y + visibleArea.height - height - 8);

  const clampedX = Math.min(Math.max(frame.x, minX), maxX);
  const clampedY = Math.min(Math.max(frame.y, minY), maxY);

  return {
    x: Math.round(clampedX),
    y: Math.round(clampedY),
    width: Math.round(width),
    height: Math.round(height),
  };
}

export function computeNearCameraFrame(
  visibleArea: WindowRect,
  currentSize = DEFAULT_EXPANDED_SIZE
): WindowRect {
  const width = Math.min(
    Math.max(currentSize.width, MIN_EXPANDED_SIZE.width),
    Math.min(MAX_EXPANDED_SIZE.width, visibleArea.width - 24)
  );
  const height = Math.min(
    Math.max(currentSize.height, MIN_EXPANDED_SIZE.height),
    Math.min(MAX_EXPANDED_SIZE.height, visibleArea.height - 24)
  );

  const x = visibleArea.x + (visibleArea.width - width) / 2;
  const y = visibleArea.y + NEAR_CAMERA_TOP_GAP;

  return clampWindowFrame({ x, y, width, height }, visibleArea, false);
}

export function computeNearCameraBubbleFrame(visibleArea: WindowRect): WindowRect {
  const x = visibleArea.x + (visibleArea.width - COLLAPSED_BUBBLE_SIZE.width) / 2;
  const y = visibleArea.y + 12;
  return clampWindowFrame(
    {
      x,
      y,
      width: COLLAPSED_BUBBLE_SIZE.width,
      height: COLLAPSED_BUBBLE_SIZE.height,
    },
    visibleArea,
    true
  );
}
