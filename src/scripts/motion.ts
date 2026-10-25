import { animate, inView } from "motion";

const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
let dispose = () => {};

function setupPointerTilt() {
  const active = new Map<
    HTMLElement,
    { x: number; y: number; rx: number; ry: number }
  >();
  const getTarget = (event: Event) =>
    event.target instanceof Element
      ? event.target.closest<HTMLElement>("[data-pointer-tilt]")
      : null;
  const setTilt = (element: HTMLElement, x: number, y: number) => {
    element.style.setProperty("--pointer-tilt-x", `${x}deg`);
    element.style.setProperty("--pointer-tilt-y", `${y}deg`);
  };
  const onMove = (event: PointerEvent) => {
    const element = getTarget(event);
    if (!element || event.pointerType !== "mouse") return;
    const drag = active.get(element);
    if (drag) {
      setTilt(
        element,
        drag.rx - (event.clientY - drag.y) * 0.38,
        drag.ry + (event.clientX - drag.x) * 0.48,
      );
      return;
    }
    const rect = element.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    const scale = element.dataset.pointerTilt === "logo" ? 18 : 7;
    setTilt(element, -y * scale, x * scale);
  };
  const onLeave = (event: PointerEvent) => {
    const element = getTarget(event);
    if (element && !element.contains(event.relatedTarget as Node | null)) {
      element.style.removeProperty("--pointer-tilt-x");
      element.style.removeProperty("--pointer-tilt-y");
    }
  };
  const onDown = (event: PointerEvent) => {
    const element = getTarget(event);
    if (
      !element ||
      element.dataset.pointerTilt !== "logo" ||
      event.button !== 0
    )
      return;
    active.set(element, {
      x: event.clientX,
      y: event.clientY,
      rx:
        Number.parseFloat(element.style.getPropertyValue("--pointer-tilt-x")) ||
        7,
      ry:
        Number.parseFloat(element.style.getPropertyValue("--pointer-tilt-y")) ||
        -18,
    });
    element.classList.add("is-dragging");
    element.setPointerCapture(event.pointerId);
  };
  const onUp = () => {
    active.forEach((_, element) => element.classList.remove("is-dragging"));
    active.clear();
  };
  const onKey = (event: KeyboardEvent) => {
    const element = getTarget(event);
    if (!element || element.dataset.pointerTilt !== "logo") return;
    const step = event.shiftKey ? 10 : 4;
    const keys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const currentX =
      Number.parseFloat(element.style.getPropertyValue("--pointer-tilt-x")) ||
      7;
    const currentY =
      Number.parseFloat(element.style.getPropertyValue("--pointer-tilt-y")) ||
      -18;
    setTilt(
      element,
      currentX +
        (event.key === "ArrowUp"
          ? -step
          : event.key === "ArrowDown"
            ? step
            : 0),
      currentY +
        (event.key === "ArrowRight"
          ? step
          : event.key === "ArrowLeft"
            ? -step
            : 0),
    );
  };
  document.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("pointerover", onMove, { passive: true });
  document.addEventListener("pointerout", onLeave, { passive: true });
  document.addEventListener("pointerdown", onDown);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  document.addEventListener("keydown", onKey);
  return () => {
    onUp();
    document
      .querySelectorAll<HTMLElement>("[data-pointer-tilt]")
      .forEach((element) => {
        element.style.removeProperty("--pointer-tilt-x");
        element.style.removeProperty("--pointer-tilt-y");
      });
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerover", onMove);
    document.removeEventListener("pointerout", onLeave);
    document.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    document.removeEventListener("keydown", onKey);
  };
}

function setupMotion() {
  dispose();
  if (preference.matches) return;

  const cleanups: (() => void)[] = [];
  cleanups.push(setupPointerTilt());
  // Map native document progress to decorative offsets; never consume wheel input.
  // Reference concepts: JIEJOE 007-02 scroll follow and 020 window blinds.
  const scenes = [
    ...document.querySelectorAll<HTMLElement>(".showcase-section"),
  ];
  const visibleScenes = new Set<HTMLElement>();
  let sceneFrame = 0;
  const updateScenes = () => {
    sceneFrame = 0;
    visibleScenes.forEach((scene) => {
      const rect = scene.getBoundingClientRect();
      const progress = Math.max(
        0,
        Math.min(1, (innerHeight - rect.top) / (innerHeight + rect.height)),
      );
      scene.style.setProperty("--scene-progress", progress.toFixed(3));
      scene.style.setProperty(
        "--scene-drift",
        `${((progress - 0.5) * (innerWidth < 768 ? 12 : 32)).toFixed(2)}px`,
      );
    });
  };
  const scheduleScenes = () => {
    if (!sceneFrame) sceneFrame = requestAnimationFrame(updateScenes);
  };
  const sceneObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const scene = entry.target as HTMLElement;
        if (entry.isIntersecting) visibleScenes.add(scene);
        else visibleScenes.delete(scene);
      });
      scheduleScenes();
    },
    { rootMargin: "120px" },
  );
  scenes.forEach((scene) => sceneObserver.observe(scene));
  window.addEventListener("scroll", scheduleScenes, { passive: true });
  window.addEventListener("resize", scheduleScenes);
  cleanups.push(() => {
    sceneObserver.disconnect();
    cancelAnimationFrame(sceneFrame);
    window.removeEventListener("scroll", scheduleScenes);
    window.removeEventListener("resize", scheduleScenes);
    scenes.forEach((scene) => {
      scene.style.removeProperty("--scene-progress");
      scene.style.removeProperty("--scene-drift");
    });
  });
  const animated = new Set<HTMLElement>();
  const animations: ReturnType<typeof animate>[] = [];
  const reveal = (element: HTMLElement, delay = 0) => {
    animated.add(element);
    animations.push(
      animate(
        element,
        element.matches(".section-title")
          ? {
              opacity: [0, 1],
              y: [24, 0],
              clipPath: ["inset(0 0 100% 0)", "inset(0 0 0% 0)"],
            }
          : { opacity: [0, 1], y: [18, 0] },
        {
          duration: 0.65,
          delay,
          ease: [0.22, 1, 0.36, 1],
        },
      ),
    );
  };

  document
    .querySelectorAll<HTMLElement>("[data-reveal]")
    .forEach((element, index) => reveal(element, index * 0.07));
  document
    .querySelectorAll<HTMLElement>(
      ".section-kicker, .section-title, .section-intro, [data-motion-item], .gallery-card, .roadmap-step",
    )
    .forEach((element) => {
      cleanups.push(
        inView(
          element,
          () => {
            const siblings = element.parentElement?.children;
            const index = siblings ? Array.from(siblings).indexOf(element) : 0;
            reveal(element, Math.min(index * 0.055, 0.22));
          },
          { margin: "0px 0px -40px 0px" },
        ),
      );
    });

  const hero = document.querySelector<HTMLElement>(".hero");
  if (hero) {
    let frame = 0;
    const updateHero = () => {
      frame = 0;
      const bounds = hero.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, -bounds.top / bounds.height));
      hero.style.setProperty("--exit-opacity", String(1 - progress * 0.55));
      hero.style.setProperty("--exit-y", `${-progress * 36}px`);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(updateHero);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    updateHero();
    cleanups.push(() => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      hero.style.removeProperty("--exit-opacity");
      hero.style.removeProperty("--exit-y");
    });
  }

  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document
      .querySelectorAll<HTMLElement>("[data-portrait], [data-magnetic]")
      .forEach((element) => {
        let frame = 0;
        const portrait = element.hasAttribute("data-portrait");
        const reset = () => {
          cancelAnimationFrame(frame);
          [
            "--portrait-x",
            "--portrait-y",
            "--portrait-rx",
            "--portrait-ry",
            "--magnet-x",
            "--magnet-y",
          ].forEach((property) => element.style.removeProperty(property));
        };
        const move = (event: PointerEvent) => {
          if (
            event.pointerType !== "mouse" ||
            event.buttons ||
            element.matches(":disabled")
          )
            return;
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(() => {
            const rect = element.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width - 0.5;
            const y = (event.clientY - rect.top) / rect.height - 0.5;
            if (portrait) {
              element.style.setProperty("--portrait-x", `${x * 12}px`);
              element.style.setProperty("--portrait-y", `${y * 8}px`);
              element.style.setProperty("--portrait-rx", `${-y * 5}deg`);
              element.style.setProperty("--portrait-ry", `${x * 7}deg`);
            } else {
              element.style.setProperty("--magnet-x", `${x * 6}px`);
              element.style.setProperty("--magnet-y", `${y * 6}px`);
            }
          });
        };
        element.addEventListener("pointermove", move, { passive: true });
        element.addEventListener("pointerleave", reset);
        element.addEventListener("pointerdown", reset);
        cleanups.push(() => {
          reset();
          element.removeEventListener("pointermove", move);
          element.removeEventListener("pointerleave", reset);
          element.removeEventListener("pointerdown", reset);
        });
      });
    document.querySelectorAll<HTMLElement>(".showcase-card").forEach((card) => {
      let frame = 0;
      const move = (event: PointerEvent) => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const bounds = card.getBoundingClientRect();
          card.style.setProperty(
            "--pointer-x",
            `${event.clientX - bounds.left}px`,
          );
          card.style.setProperty(
            "--pointer-y",
            `${event.clientY - bounds.top}px`,
          );
        });
      };
      card.addEventListener("pointermove", move, { passive: true });
      cleanups.push(() => {
        cancelAnimationFrame(frame);
        card.removeEventListener("pointermove", move);
      });
    });
  }

  document
    .querySelectorAll<HTMLDialogElement>(".member-dialog")
    .forEach((dialog) => {
      const observer = new MutationObserver(() => {
        if (!dialog.open) return;
        animated.add(dialog);
        animations.push(
          animate(
            dialog,
            { opacity: [0, 1], y: [16, 0], scale: [0.98, 1] },
            { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
          ),
        );
      });
      observer.observe(dialog, { attributes: true, attributeFilter: ["open"] });
      cleanups.push(() => observer.disconnect());
    });

  dispose = () => {
    cleanups.forEach((cleanup) => cleanup());
    animations.forEach((animation) => animation.stop());
    animated.forEach((element) => {
      element.style.removeProperty("opacity");
      element.style.removeProperty("transform");
      element.style.removeProperty("clip-path");
    });
  };
}
setupMotion();
preference.addEventListener("change", setupMotion);
// CSS animations also stop while the tab is hidden.
const syncVisibility = () =>
  document.documentElement.classList.toggle("page-hidden", document.hidden);
document.addEventListener("visibilitychange", syncVisibility);
syncVisibility();
