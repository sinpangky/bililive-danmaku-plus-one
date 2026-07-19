import { numberOr } from "./barrage-model";

export interface CanvasRectLike {
  height: number;
  left: number;
  top: number;
  width: number;
}

export interface RendererTrackInstance {
  config: Record<string, unknown>;
}

export interface RendererTrack {
  bookedChannel?: { start: number } | null;
  deltaXWithoutDpr: number;
  description: { height: number; width: number };
  instance: RendererTrackInstance;
  options: Record<string, unknown>;
  renderer?: {
    hovered?: boolean;
    resumeOffset?: unknown;
    visualLeft?: unknown;
    visualWidth?: unknown;
  } | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

export function modelDpr(instance: RendererTrackInstance): number {
  const devicePixelRatio = Math.max(0.25, numberOr(instance.config.devicePixelRatio, 1));
  const fontSize = Math.max(1, numberOr(instance.config.fontSize, 20));
  return devicePixelRatio * fontSize / 20;
}

export function canvasPixelSize(instance: RendererTrackInstance, rect: CanvasRectLike): {
  height: number;
  width: number;
} {
  const devicePixelRatio = Math.max(0.25, numberOr(instance.config.devicePixelRatio, 1));
  return {
    width: Math.max(20, numberOr(instance.config.width, rect.width)) * devicePixelRatio,
    height: Math.max(20, numberOr(instance.config.height, rect.height)) * devicePixelRatio
  };
}

export function channelInfo(instance: RendererTrackInstance, rect: CanvasRectLike): {
  maxCanUse: number;
  maxDisplay: number;
} {
  const pixels = canvasPixelSize(instance, rect);
  const channelHeight = Math.max(1, numberOr(instance.config.channelHeight, 40)) * modelDpr(instance);
  const allChannels = Math.max(1, Math.floor(pixels.height / channelHeight));
  const limits = [pixels.height / channelHeight];
  const maxHeightRate = numberOr(instance.config.maxHeightRate, 1);
  if (maxHeightRate * pixels.height) {
    limits.push(maxHeightRate * pixels.height / channelHeight);
  }
  const configured = numberOr(instance.config.maxChannelCount, 0);
  if (configured > 0) {
    limits.push(configured);
  }
  return {
    maxCanUse: allChannels,
    maxDisplay: Math.max(1, Math.floor(Math.min(...limits)) || 1)
  };
}

export function trackDuration(track: RendererTrack): number {
  return Math.max(1000, numberOr(track.options.duration, numberOr(track.instance.config.duration, 15_000)));
}

function trackInternalWidth(track: RendererTrack): number {
  return track.description.width * modelDpr(track.instance);
}

export function trackInternalHeight(track: RendererTrack): number {
  return track.description.height * modelDpr(track.instance);
}

export function trackRightPosition(track: RendererTrack, rect: CanvasRectLike): number {
  const pixels = canvasPixelSize(track.instance, rect);
  return pixels.width - track.deltaXWithoutDpr * modelDpr(track.instance) + trackInternalWidth(track);
}

export function trackIsExpired(track: RendererTrack, rect: CanvasRectLike): boolean {
  const state = track.renderer;
  if (state && Number.isFinite(state.visualLeft)
      && (state.hovered || Math.abs(numberOr(state.resumeOffset, 0)) > 0.1)) {
    return Number(state.visualLeft) + Math.max(1, numberOr(state.visualWidth, track.description.width)) <= 0;
  }
  return trackRightPosition(track, rect) <= 0;
}

export function trackRightEdgeVisible(track: RendererTrack, rect: CanvasRectLike): boolean {
  const pixels = canvasPixelSize(track.instance, rect);
  const gap = Math.max(0, numberOr(track.instance.config.gap, 100)) * modelDpr(track.instance);
  return trackRightPosition(track, rect) <= pixels.width - gap;
}

export function trackSpeed(track: RendererTrack, rect: CanvasRectLike): number {
  const pixels = canvasPixelSize(track.instance, rect);
  return (pixels.width + trackInternalWidth(track)) / trackDuration(track) / modelDpr(track.instance);
}

function specialRange(track: RendererTrack, maxDisplay: number): Record<string, unknown> | null {
  const range = asRecord(track.options.channelRange);
  if (!range || numberOr(range.startIndex, -1) < 0
      || maxDisplay <= Math.max(1, Math.floor(numberOr(range.len, maxDisplay)))) {
    return null;
  }
  return range;
}

export function realChannelRange(track: RendererTrack, maxDisplay: number, maxCanUse: number): {
  end: number;
  start: number;
} {
  const range = specialRange(track, maxDisplay);
  if (!range) {
    return { start: 0, end: Math.min(maxCanUse - 1, maxDisplay - 1) };
  }
  const start = Math.max(0, Math.floor(numberOr(range.startIndex, 0)));
  const length = Math.max(1, Math.floor(numberOr(range.len, maxDisplay)));
  return {
    start: Math.min(maxCanUse - 1, start),
    end: Math.min(maxCanUse - 1, start + length - 1)
  };
}

export function trackPriority(track: RendererTrack, maxDisplay: number): number {
  const base = numberOr(track.options.prior, 0);
  const range = specialRange(track, maxDisplay);
  return range ? base + numberOr(range.additionalPriority, 100) : base;
}

export function trackNeedsReserve(track: RendererTrack, maxDisplay: number): boolean {
  const range = specialRange(track, maxDisplay);
  const additional = range ? numberOr(range.additionalReserveDuration, 0) : 0;
  const reserve = numberOr(track.options.reserveDuration, 0);
  const startTime = numberOr(track.options.startTime, Date.now());
  return startTime + reserve + additional > Date.now();
}

export function trackRect(track: RendererTrack, canvasRect: CanvasRectLike): {
  height: number;
  left: number;
  top: number;
  width: number;
} | null {
  if (!track.bookedChannel) {
    return null;
  }
  const pixels = canvasPixelSize(track.instance, canvasRect);
  const dpr = modelDpr(track.instance);
  const scaleX = canvasRect.width / pixels.width;
  const scaleY = canvasRect.height / pixels.height;
  const internalLeft = pixels.width - track.deltaXWithoutDpr * dpr;
  const internalTop = track.bookedChannel.start
    * Math.max(1, numberOr(track.instance.config.channelHeight, 40)) * dpr + 2;
  return {
    left: canvasRect.left + internalLeft * scaleX,
    top: canvasRect.top + internalTop * scaleY,
    width: trackInternalWidth(track) * scaleX,
    height: trackInternalHeight(track) * scaleY
  };
}
