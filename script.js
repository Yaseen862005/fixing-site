const body = document.body;
const siteHeader = document.querySelector(".site-header");
const navToggle = document.querySelector(".nav-toggle");
const navMenu = document.getElementById("site-menu");
const navLinks = Array.from(document.querySelectorAll(".site-nav a"));
const navShell = document.querySelector(".nav-shell");
const root = document.documentElement;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const mobileNavMode = window.matchMedia("(max-width: 860px)");
const headerGap = 16;
let lockedScrollY = 0;
const sectionNavItems = navLinks
  .filter((link) => {
    const href = link.getAttribute("href") || "";
    return href.startsWith("#") && href !== "#top" && !link.classList.contains("button");
  })
  .map((link) => {
    const id = (link.getAttribute("href") || "").slice(1);
    const section = document.getElementById(id);

    return section ? { id, link, section } : null;
  })
  .filter(Boolean);
const sectionTargets = new Map(sectionNavItems.map((item) => [item.id, item.section]));
const anchorLinks = Array.from(document.querySelectorAll('a[href^="#"]')).filter((link) => {
  const href = link.getAttribute("href") || "";

  if (href === "#" || href.length < 2) {
    return false;
  }

  if (href === "#top") {
    return true;
  }

  return sectionTargets.has(href.slice(1));
});

function getHeaderOffset() {
  if (!siteHeader) {
    return 0;
  }

  const navHeight = navShell ? navShell.getBoundingClientRect().height : siteHeader.getBoundingClientRect().height;
  const borderBottomWidth = parseFloat(window.getComputedStyle(siteHeader).borderBottomWidth) || 0;

  return Math.ceil(navHeight + borderBottomWidth);
}

function syncLayoutMetrics() {
  root.style.setProperty("--header-offset", `${getHeaderOffset()}px`);
  root.style.setProperty("--header-gap", `${headerGap}px`);

  if (siteHeader) {
    root.style.setProperty(
      "--header-total-height",
      `${Math.ceil(siteHeader.getBoundingClientRect().height)}px`
    );
  }

  root.style.setProperty(
    "--viewport-height",
    `${Math.ceil(window.visualViewport ? window.visualViewport.height : window.innerHeight)}px`
  );
}

function setCurrentSection(id = "") {
  sectionNavItems.forEach((item) => {
    item.link.classList.toggle("is-current", item.id === id);
  });
}

function updateCurrentSection() {
  if (!sectionNavItems.length) {
    return;
  }

  const activationPoint = window.scrollY + getHeaderOffset() + headerGap + 12;
  const pageBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
  let currentId = "";

  sectionNavItems.forEach((item) => {
    if (item.section.offsetTop <= activationPoint) {
      currentId = item.id;
    }
  });

  if (pageBottom) {
    currentId = sectionNavItems[sectionNavItems.length - 1].id;
  }

  setCurrentSection(currentId);
}

function getScrollBehavior(preferSmooth = true) {
  return preferSmooth && !reducedMotion.matches ? "smooth" : "auto";
}

function scrollToHashTarget(hash, { behavior = "auto", updateHistory = false } = {}) {
  if (!hash) {
    return false;
  }

  if (hash === "#top") {
    if (updateHistory) {
      history[location.hash === hash ? "replaceState" : "pushState"](null, "", hash);
    }

    window.scrollTo({ top: 0, behavior });
    setCurrentSection("");
    return true;
  }

  const target = sectionTargets.get(hash.slice(1));

  if (!target) {
    return false;
  }

  if (updateHistory) {
    history[location.hash === hash ? "replaceState" : "pushState"](null, "", hash);
  }

  const targetTop = Math.max(
    0,
    window.scrollY + target.getBoundingClientRect().top - getHeaderOffset() - headerGap
  );

  window.scrollTo({ top: targetTop, behavior });
  setCurrentSection(target.id);
  return true;
}

if (siteHeader) {
  let ticking = false;
  let isHeaderCollapsed = false;
  const collapseOffset = 120;
  const expandOffset = 36;

  const updatePageState = () => {
    const y = window.scrollY;
    const shouldCollapse = isHeaderCollapsed ? y > expandOffset : y > collapseOffset;

    if (shouldCollapse !== isHeaderCollapsed) {
      isHeaderCollapsed = shouldCollapse;
      siteHeader.classList.toggle("is-scrolled", isHeaderCollapsed);
    }

    updateCurrentSection();
    ticking = false;
  };

  syncLayoutMetrics();
  updatePageState();
  window.addEventListener(
    "scroll",
    () => {
      if (ticking) {
        return;
      }

      ticking = true;
      window.requestAnimationFrame(updatePageState);
    },
    { passive: true }
  );
}

if (navToggle && navMenu) {
  const closeNavMenu = () => {
    const isOpen = body.classList.contains("nav-open");
    body.classList.remove("nav-open");
    body.style.top = "";
    navToggle.setAttribute("aria-expanded", "false");

    if (isOpen) {
      window.scrollTo({ top: lockedScrollY, behavior: "auto" });
      lockedScrollY = 0;
    }
  };

  const openNavMenu = () => {
    if (body.classList.contains("nav-open")) {
      return;
    }

    lockedScrollY = window.scrollY;
    body.style.top = `-${lockedScrollY}px`;
    body.classList.add("nav-open");
    navToggle.setAttribute("aria-expanded", "true");
    syncLayoutMetrics();
  };

  navToggle.addEventListener("click", () => {
    if (body.classList.contains("nav-open")) {
      closeNavMenu();
      return;
    }

    openNavMenu();
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      closeNavMenu();
    });
  });

  window.addEventListener("resize", () => {
    syncLayoutMetrics();
    updateCurrentSection();

    if (!mobileNavMode.matches) {
      closeNavMenu();
    }
  });

  document.addEventListener("click", (event) => {
    if (!body.classList.contains("nav-open") || !navShell) {
      return;
    }

    if (event.target instanceof Node && !navShell.contains(event.target)) {
      closeNavMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeNavMenu();
    }
  });
}

anchorLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const hash = link.getAttribute("href") || "";

    if (!hash) {
      return;
    }

    event.preventDefault();
    syncLayoutMetrics();
    scrollToHashTarget(hash, { behavior: getScrollBehavior(true), updateHistory: true });
  });
});

window.addEventListener("hashchange", () => {
  syncLayoutMetrics();
  scrollToHashTarget(location.hash, { behavior: "auto" });
  updateCurrentSection();
});

window.addEventListener("load", () => {
  syncLayoutMetrics();

  if (location.hash) {
    window.requestAnimationFrame(() => {
      scrollToHashTarget(location.hash, { behavior: "auto" });
      updateCurrentSection();
    });

    return;
  }

  updateCurrentSection();
});

const testimonialStage = document.querySelector("[data-testimonial-stage]");
const testimonials = Array.from(document.querySelectorAll("[data-testimonial]"));
const directionButtons = document.querySelectorAll("[data-direction]");
const logoTrack = document.querySelector(".logo-track");
const primaryLogoStrip = document.querySelector(".logo-strip");
const logoPixelsPerSecond = 52;
let activeIndex = Math.max(
  0,
  testimonials.findIndex((card) => card.classList.contains("is-active"))
);
let isTestimonialAnimating = false;
let testimonialAnimationTimer = 0;
let logoAnimationFrame = 0;
let logoLastTimestamp = 0;
let logoOffset = 0;
let logoShift = 0;

function syncLogoTrackMetrics() {
  if (!logoTrack || !primaryLogoStrip) {
    return;
  }

  const stripWidth = primaryLogoStrip.getBoundingClientRect().width;
  const trackStyles = window.getComputedStyle(logoTrack);
  const trackGap = parseFloat(trackStyles.columnGap || trackStyles.gap) || 0;

  logoShift = Math.ceil(stripWidth + trackGap);

  if (logoShift > 0) {
    logoOffset = ((logoOffset % logoShift) + logoShift) % logoShift;

    if (logoOffset > 0) {
      logoOffset -= logoShift;
    }
  } else {
    logoOffset = 0;
  }

  logoTrack.style.transform = `translate3d(${logoOffset}px, 0, 0)`;
}

function stepLogoTrack(timestamp) {
  if (!logoTrack || reducedMotion.matches || logoShift <= 0) {
    logoAnimationFrame = 0;
    return;
  }

  if (!logoLastTimestamp) {
    logoLastTimestamp = timestamp;
  }

  const elapsed = Math.min(timestamp - logoLastTimestamp, 64);
  logoLastTimestamp = timestamp;
  logoOffset -= (logoPixelsPerSecond * elapsed) / 1000;

  if (logoOffset <= -logoShift) {
    logoOffset += logoShift;
  }

  logoTrack.style.transform = `translate3d(${logoOffset}px, 0, 0)`;
  logoAnimationFrame = window.requestAnimationFrame(stepLogoTrack);
}

function startLogoTrack() {
  if (!logoTrack || reducedMotion.matches || logoAnimationFrame) {
    return;
  }

  logoLastTimestamp = 0;
  logoAnimationFrame = window.requestAnimationFrame(stepLogoTrack);
}

function stopLogoTrack({ reset = false } = {}) {
  if (logoAnimationFrame) {
    window.cancelAnimationFrame(logoAnimationFrame);
    logoAnimationFrame = 0;
  }

  logoLastTimestamp = 0;

  if (reset) {
    logoOffset = 0;

    if (logoTrack) {
      logoTrack.style.transform = "translate3d(0, 0, 0)";
    }
  }
}

function setTestimonialStageHeight(card) {
  if (!testimonialStage || !card) {
    return;
  }

  testimonialStage.style.height = `${card.scrollHeight}px`;
}

function finishTestimonialTransition(nextCard, previousCard) {
  if (previousCard && previousCard !== nextCard) {
    previousCard.hidden = true;
    previousCard.classList.remove("is-active", "is-leaving");
  }

  nextCard.hidden = false;
  nextCard.classList.remove("is-entering", "is-before-enter");
  nextCard.classList.add("is-active");
  setTestimonialStageHeight(nextCard);

  if (testimonialStage) {
    delete testimonialStage.dataset.direction;
  }

  isTestimonialAnimating = false;
  testimonialAnimationTimer = 0;
}

function showTestimonial(index, { immediate = false, direction = "next" } = {}) {
  if (!testimonials.length) {
    return;
  }

  const nextIndex = (index + testimonials.length) % testimonials.length;
  const nextCard = testimonials[nextIndex];
  const previousCard = testimonials[activeIndex];

  if (!nextCard) {
    return;
  }

  if (!testimonialStage || immediate || reducedMotion.matches) {
    if (testimonialAnimationTimer) {
      window.clearTimeout(testimonialAnimationTimer);
      testimonialAnimationTimer = 0;
    }

    testimonials.forEach((card, cardIndex) => {
      const isActive = cardIndex === nextIndex;
      card.hidden = !isActive;
      card.classList.toggle("is-active", isActive);
      card.classList.remove("is-entering", "is-before-enter", "is-leaving");
    });

    activeIndex = nextIndex;
    setTestimonialStageHeight(nextCard);
    return;
  }

  if (isTestimonialAnimating || nextIndex === activeIndex) {
    return;
  }

  isTestimonialAnimating = true;
  activeIndex = nextIndex;
  testimonialStage.dataset.direction = direction;
  testimonialStage.style.height = `${previousCard.scrollHeight}px`;

  previousCard.hidden = false;
  previousCard.classList.remove("is-active");
  previousCard.classList.add("is-leaving");

  nextCard.hidden = false;
  nextCard.classList.remove("is-active", "is-leaving");
  nextCard.classList.add("is-entering", "is-before-enter");

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      testimonialStage.style.height = `${nextCard.scrollHeight}px`;
      nextCard.classList.remove("is-before-enter");
    });
  });

  testimonialAnimationTimer = window.setTimeout(() => {
    finishTestimonialTransition(nextCard, previousCard);
  }, 520);
}

directionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const direction = button.getAttribute("data-direction") || "next";
    showTestimonial(activeIndex + (direction === "next" ? 1 : -1), { direction });
  });
});

if (testimonialStage && testimonials.length) {
  testimonialStage.classList.add("is-enhanced");
  showTestimonial(activeIndex, { immediate: true });

  const syncTestimonialLayout = () => {
    syncLayoutMetrics();
    setTestimonialStageHeight(testimonials[activeIndex]);
  };

  window.addEventListener("resize", () => {
    syncTestimonialLayout();
  });

  window.addEventListener("load", () => {
    syncTestimonialLayout();
  });

  window.addEventListener("pageshow", () => {
    syncTestimonialLayout();
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", syncTestimonialLayout);
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      syncTestimonialLayout();
    });
  }
}

if (logoTrack && primaryLogoStrip) {
  syncLogoTrackMetrics();
  startLogoTrack();

  window.addEventListener("resize", () => {
    syncLogoTrackMetrics();
  });

  window.addEventListener("load", () => {
    syncLogoTrackMetrics();
  });

  window.addEventListener("pageshow", () => {
    syncLogoTrackMetrics();
    startLogoTrack();
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", syncLogoTrackMetrics);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopLogoTrack();
      return;
    }

    syncLogoTrackMetrics();
    startLogoTrack();
  });

  if (typeof reducedMotion.addEventListener === "function") {
    reducedMotion.addEventListener("change", () => {
      if (reducedMotion.matches) {
        stopLogoTrack({ reset: true });
        return;
      }

      syncLogoTrackMetrics();
      startLogoTrack();
    });
  }
}

const form = document.getElementById("quote-form");
const formMessage = document.getElementById("form-message");

if (form && formMessage) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const service = String(formData.get("service") || "").trim();
    const details = String(formData.get("details") || "").trim();

    formMessage.classList.remove("is-error", "is-success");

    if (!name || !phone || !service || !details) {
      formMessage.textContent = "Please fill in the required fields before sending your request.";
      formMessage.classList.add("is-error");
      return;
    }

    formMessage.textContent = `Thanks, ${name}. Your ${service.toLowerCase()} request is ready for submission.`;
    formMessage.classList.add("is-success");
    form.reset();
  });
}

const year = document.getElementById("year");

if (year) {
  year.textContent = String(new Date().getFullYear());
}
