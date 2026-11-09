'use client';

import { useEffect, useRef } from 'react';

import type { CSSProperties } from 'react';

import { cn } from '@/lib/utils';

type Bubble = {
  id: string;
  size: number;
  top: string;
  left: string;
};

const BUBBLES: Bubble[] = [
  { id: 'top-center', size: 52, top: '3%', left: '49%' },
  { id: 'top-dot', size: 16, top: '10%', left: '58%' },
  { id: 'upper-left', size: 60, top: '15%', left: '24%' },
  { id: 'upper-left-dot', size: 24, top: '14%', left: '37%' },
  { id: 'upper-right-dot', size: 22, top: '11%', left: '85%' },
  { id: 'mid-right', size: 40, top: '64%', left: '67%' },
  { id: 'mid-right-large', size: 70, top: '63%', left: '76%' },
  { id: 'far-right', size: 48, top: '69%', left: '93%' },
  { id: 'lower-left', size: 44, top: '74%', left: '4%' },
];

const MIN_RISE_PX_PER_S = 25;
const MAX_RISE_PX_PER_S = 60;
const MIN_SWAY_PX = 20;
const MAX_SWAY_PX = 60;
const PATH_STEPS = [0, 0.25, 0.5, 0.75, 1];
const POP_MS = 200;
const SPLASH_MS = 420;
const STATIC_RETURN_MS = 1500;
const SHIELD_SELECTOR = [
  'a, button, input, textarea, select, label, [role="button"], [contenteditable="true"]',
  '[data-slot="card"], [data-slot="alert"], aside, header, nav, [role="dialog"]',
].join(', ');

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

const risingPath = (distance: number, sway: number): Keyframe[] =>
  PATH_STEPS.map((progress) => ({
    transform: `translate(${Math.sin(progress * Math.PI * 2) * sway}px, ${-distance * progress}px) scale(${1 + progress * 0.15})`,
    opacity: progress === 0 || progress === 1 ? 0 : 1,
  }));

const isInsideCircle = (element: HTMLElement, x: number, y: number) => {
  const { left, top, width, height } = element.getBoundingClientRect();
  const radius = width / 2;
  return Math.hypot(x - (left + radius), y - (top + height / 2)) <= radius;
};

type CustomBubblesProps = {
  className?: string;
};

const CustomBubbles = ({ className }: CustomBubblesProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const bubbles = [...container.querySelectorAll<HTMLElement>('[data-bubble]')];
    const flights = new Map<HTMLElement, Animation>();
    const popping = new Set<HTMLElement>();
    const timers = new Set<number>();
    let isActive = true;

    const rise = (bubble: HTMLElement, isFirstRun: boolean) => {
      if (!isActive) return;
      const distance = container.clientHeight + bubble.offsetHeight * 2;
      const sway = randomBetween(MIN_SWAY_PX, MAX_SWAY_PX) * (Math.random() < 0.5 ? -1 : 1);
      const duration = (distance / randomBetween(MIN_RISE_PX_PER_S, MAX_RISE_PX_PER_S)) * 1000;

      bubble.style.top = '100%';
      bubble.style.left = `${randomBetween(0, 96)}%`;

      const flight = bubble.animate(risingPath(distance, sway), { duration, easing: 'linear', fill: 'both' });
      // Start mid-flight on load so the screen isn't empty while the first bubbles climb
      if (isFirstRun) flight.currentTime = randomBetween(0, duration);

      flights.set(bubble, flight);
      flight.onfinish = () => rise(bubble, false);
    };

    const respawn = (bubble: HTMLElement, body: HTMLElement) => {
      popping.delete(bubble);
      body.getAnimations().forEach((animation) => animation.cancel());
      flights.get(bubble)?.cancel();
      rise(bubble, false);
    };

    const fadeBack = (bubble: HTMLElement, body: HTMLElement) => {
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        popping.delete(bubble);
        body.getAnimations().forEach((animation) => animation.cancel());
      }, STATIC_RETURN_MS);
      timers.add(timer);
    };

    const pop = (bubble: HTMLElement) => {
      const body = bubble.querySelector<HTMLElement>('[data-bubble-body]');
      const splash = bubble.querySelector<HTMLElement>('[data-bubble-splash]');
      if (!body || !splash || popping.has(bubble)) return;
      popping.add(bubble);

      if (isReducedMotion) {
        body.animate([{ opacity: 1 }, { opacity: 0 }], { duration: POP_MS, fill: 'forwards' });
        fadeBack(bubble, body);
        return;
      }

      flights.get(bubble)?.pause();
      body.animate(
        [
          { transform: 'scale(1)', opacity: 1 },
          { transform: 'scale(1.35)', opacity: 0 },
        ],
        { duration: POP_MS, easing: 'ease-out', fill: 'forwards' },
      );
      splash.animate(
        [
          { transform: 'scale(1)', opacity: 0.9 },
          { transform: 'scale(2.2)', opacity: 0 },
        ],
        { duration: SPLASH_MS, easing: 'ease-out' },
      ).onfinish = () => respawn(bubble, body);
    };

    // Bubbles sit behind the content, so clicks are hit-tested here; surfaces that cover a bubble shield it
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest(SHIELD_SELECTOR)) return;
      const hit = bubbles.find((bubble) => isInsideCircle(bubble, event.clientX, event.clientY));
      if (hit) pop(hit);
    };

    if (!isReducedMotion) bubbles.forEach((bubble) => rise(bubble, true));
    window.addEventListener('pointerdown', handlePointerDown);

    return () => {
      isActive = false;
      window.removeEventListener('pointerdown', handlePointerDown);
      timers.forEach((timer) => window.clearTimeout(timer));
      bubbles.forEach((bubble) => bubble.getAnimations({ subtree: true }).forEach((animation) => animation.cancel()));
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 -z-10 overflow-hidden', className)}
    >
      {BUBBLES.map(({ id, size, top, left }) => (
        <span
          key={id}
          data-bubble
          className="absolute will-change-transform"
          style={{ width: size, height: size, top, left } satisfies CSSProperties}
        >
          <span data-bubble-body className="absolute inset-0 rounded-full bg-primary/9" />
          <span data-bubble-splash className="absolute inset-0 rounded-full border-2 border-primary/40 opacity-0" />
        </span>
      ))}
    </div>
  );
};

export default CustomBubbles;
