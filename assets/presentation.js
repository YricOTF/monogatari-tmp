(() => {
  "use strict";

  const deck = document.querySelector("[data-deck]");
  if (!deck) return;

  const stage = deck.querySelector("[data-deck-stage]");
  const slides = Array.from(stage.children);
  const navigation = deck.querySelector("[data-deck-navigation]");
  const chapters = Array.from(navigation.querySelectorAll("[data-deck-jump]"));
  const counter = navigation.querySelector("[data-deck-count]");
  const status = deck.querySelector("[data-deck-status]");
  const playButton = navigation.querySelector("[data-deck-play]");
  const playLabel = playButton.querySelector("[data-play-label]");
  const fullscreenButton = deck.querySelector("[data-deck-fullscreen]");
  const fullscreenLabel = fullscreenButton.querySelector("[data-fullscreen-label]");

  let current = 0;
  let playing = false;
  let timer;
  let touchStart;

  function showSlide(index, direction) {
    const next = (index + slides.length) % slides.length;
    if (next === current) return;

    if (slides[current].contains(document.activeElement)) {
      stage.focus({ preventScroll: true });
    }

    deck.style.setProperty("--deck-offset", direction < 0 ? "-24px" : "24px");
    slides[current].classList.remove("is-current");
    chapters[current].removeAttribute("aria-current");
    current = next;
    slides[current].classList.add("is-current");
    chapters[current].setAttribute("aria-current", "true");
    counter.textContent = String(current + 1).padStart(2, "0");
    deck.style.setProperty("--deck-progress", String((current + 1) / slides.length));
    status.textContent = `第 ${current + 1} 页，共 ${slides.length} 页，${chapters[current].textContent}`;
  }

  function schedulePlayback() {
    window.clearTimeout(timer);
    if (playing && !document.hidden) {
      timer = window.setTimeout(() => {
        showSlide(current + 1, 1);
        schedulePlayback();
      }, 8000);
    }
  }

  function setPlaying(value) {
    playing = value;
    playButton.setAttribute("aria-pressed", String(playing));
    playLabel.textContent = playing ? "暂停播放" : "自动播放";
    status.setAttribute("aria-live", playing ? "off" : "polite");
    schedulePlayback();
  }

  function goTo(index, direction) {
    if (playing) setPlaying(false);
    showSlide(index, direction);
  }

  navigation.querySelector("[data-deck-prev]").addEventListener("click", () => goTo(current - 1, -1));
  navigation.querySelector("[data-deck-next]").addEventListener("click", () => goTo(current + 1, 1));

  chapters.forEach((chapter, index) => {
    chapter.addEventListener("click", () => goTo(index, index - current));
  });

  playButton.addEventListener("click", () => setPlaying(!playing));
  document.addEventListener("visibilitychange", schedulePlayback);
  stage.addEventListener("focusin", () => {
    if (playing) setPlaying(false);
  });

  deck.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const { key } = event;
    if (key === "ArrowLeft" || key === "ArrowRight") {
      const direction = key === "ArrowLeft" ? -1 : 1;
      event.preventDefault();
      goTo(current + direction, direction);
    } else if (key === "Home" || key === "End") {
      const first = key === "Home";
      event.preventDefault();
      goTo(first ? 0 : slides.length - 1, first ? -1 : 1);
    }
  });

  stage.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch" && event.isPrimary && !event.target.closest("a")) {
      touchStart = { x: event.clientX, y: event.clientY };
    }
  });

  stage.addEventListener("pointerup", (event) => {
    if (!touchStart || event.pointerType !== "touch" || !event.isPrimary) return;
    const dx = event.clientX - touchStart.x;
    const dy = event.clientY - touchStart.y;
    touchStart = undefined;
    if (Math.abs(dx) > 52 && Math.abs(dx) > 1.4 * Math.abs(dy)) {
      const direction = dx < 0 ? 1 : -1;
      goTo(current + direction, direction);
    }
  });

  stage.addEventListener("pointercancel", () => { touchStart = undefined; });

  if (document.fullscreenEnabled && deck.requestFullscreen) {
    fullscreenButton.hidden = false;
    fullscreenButton.addEventListener("click", () => {
      const operation = document.fullscreenElement === deck
        ? document.exitFullscreen()
        : deck.requestFullscreen();
      operation.catch(() => { status.textContent = "当前无法切换全屏"; });
    });

    document.addEventListener("fullscreenchange", () => {
      fullscreenLabel.textContent = document.fullscreenElement === deck ? "退出全屏" : "全屏";
    });

    stage.addEventListener("click", (event) => {
      const link = event.target.closest('a[href^="#"]');
      if (!link || document.fullscreenElement !== deck) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      event.preventDefault();
      const hash = link.getAttribute("href");
      document.exitFullscreen().then(() => {
        if (location.hash === hash) document.getElementById(hash.slice(1)).scrollIntoView();
        else location.hash = hash;
      }).catch(() => { status.textContent = "当前无法退出全屏"; });
    });
  }

  stage.tabIndex = 0;
  stage.setAttribute("role", "group");
  stage.setAttribute("aria-label", "幻灯片，使用左右方向键翻页");
  deck.classList.add("is-ready");
  navigation.hidden = false;
})();
