/**
 * Background music — "Married Life" (SelfMusic) by the project author.
 * Browsers require a user gesture before audio can play; we start on first click/drag.
 */

const MUSIC_SOURCES = [
  { src: 'audio/married-life-self.m4a', type: 'audio/mp4' },
];

export function initSceneMusic() {
  const audio = document.createElement('audio');
  audio.id = 'scene-music';
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = 0.34;

  MUSIC_SOURCES.forEach(({ src, type }) => {
    const source = document.createElement('source');
    source.src = src;
    source.type = type;
    audio.appendChild(source);
  });

  document.body.appendChild(audio);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'music-toggle';
  btn.setAttribute('aria-label', 'Toggle background music');
  btn.textContent = '♪ Music off';
  Object.assign(btn.style, {
    position: 'fixed',
    bottom: '14px',
    right: '14px',
    zIndex: '20',
    padding: '10px 14px',
    font: '13px system-ui, sans-serif',
    color: '#eef6ff',
    background: 'rgba(8, 16, 32, 0.82)',
    border: '1px solid rgba(120, 180, 255, 0.4)',
    borderRadius: '8px',
    cursor: 'pointer',
    boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
  });
  document.body.appendChild(btn);

  let playing = false;
  let unlocked = false;

  function updateButton() {
    btn.textContent = playing ? '♪ Music on' : '♪ Music off';
    btn.setAttribute('aria-pressed', playing ? 'true' : 'false');
  }

  async function playMusic() {
    try {
      await audio.play();
      playing = true;
      unlocked = true;
      updateButton();
      return true;
    } catch {
      return false;
    }
  }

  function pauseMusic() {
    audio.pause();
    playing = false;
    updateButton();
  }

  async function toggleMusic() {
    if (playing) {
      pauseMusic();
    } else {
      await playMusic();
    }
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMusic();
  });

  function onFirstInteraction() {
    if (!unlocked) playMusic();
  }

  document.addEventListener('pointerdown', onFirstInteraction, { once: true });
  document.addEventListener('keydown', onFirstInteraction, { once: true });

  updateButton();
}
