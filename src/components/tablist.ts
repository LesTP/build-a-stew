import type { KeyboardEvent } from 'react';

const TABLIST_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']);

export function handleTablistKeyDown(event: KeyboardEvent<HTMLElement>) {
  if (!TABLIST_KEYS.has(event.key)) {
    return;
  }

  const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')).filter(
    tab => !tab.hasAttribute('disabled'),
  );

  if (tabs.length <= 1) {
    return;
  }

  const currentIndex = tabs.findIndex(tab => tab === document.activeElement);
  if (currentIndex === -1) {
    return;
  }

  let nextIndex = currentIndex;
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    nextIndex = (currentIndex + 1) % tabs.length;
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  } else if (event.key === 'Home') {
    nextIndex = 0;
  } else if (event.key === 'End') {
    nextIndex = tabs.length - 1;
  }

  if (nextIndex === currentIndex) {
    return;
  }

  event.preventDefault();
  const nextTab = tabs[nextIndex];
  nextTab.focus();
  nextTab.click();
}
