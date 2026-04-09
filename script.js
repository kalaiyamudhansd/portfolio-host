(function () {
  "use strict";

  var CONFIG = window.__SIGARAM_CONFIG__ || {};
  var CLOUD_NAME = CONFIG.CLOUD_NAME || "";

  var ROLES = [
    "Founder of Sigaram Foundation",
    "Motivational Speaker",
    "Pattimandram Naduvar",
    "Advocate",
    "Tamil Orator",
    "Writer",
  ];

  var TYPE_SPEED = 72;
  var DELETE_SPEED = 42;
  var PAUSE_END = 2200;

  var YT_SEARCH = "https://www.youtube.com/results?search_query=Dr+Kalaiamudhan+speech";

  var GALLERY_CONFIG = [
    {
      seeds: [10, 20, 30, 40, 50],
      captions: [
        "Pattimandram Show — Chennai 2024",
        "Pattimandram Show — Coimbatore 2023",
        "Pattimandram Show — Madurai 2024",
        "Pattimandram Show — Salem 2023",
        "Pattimandram Show — Bengaluru 2024",
      ],
    },
    {
      seeds: [100, 110, 120, 130],
      captions: [
        "Motivational Speech — College Tour 2024",
        "Motivational Speech — Students Meet 2023",
        "Motivational Speech — Auditorium 2024",
        "Motivational Speech — Youth Forum 2023",
      ],
    },
    {
      seeds: [200, 210, 220, 230],
      captions: [
        "Memory Lane — Early Years",
        "Memory Lane — With Well-Wishers",
        "Memory Lane — Literary Circle",
        "Memory Lane — Felicitation",
      ],
    },
    {
      seeds: [300, 310, 320, 330],
      captions: [
        "Abroad Event — Cultural Forum",
        "Abroad Event — Tamil Gathering",
        "Abroad Event — Conference Hall",
        "Abroad Event — Guest Address",
      ],
    },
  ];

  // Same tags / folders as admin — public gallery loads these (tag JSON + /api/list-by-folder fallback).
  var GALLERY_CLOUD = [
    { listTag: "sigaram_pattimandram", folder: "gallery/pattimandram" },
    { listTag: "sigaram_motivational", folder: "gallery/motivational-speech" },
    { listTag: "sigaram_memory", folder: "gallery/memory-lane" },
    { listTag: "sigaram_abroad", folder: "gallery/abroad-events" },
  ];

  /** Keys in gallery-order.json /api/gallery-order — same order as GALLERY_CLOUD */
  var GALLERY_ORDER_KEYS = [
    "pattimandram",
    "motivational-speech",
    "memory-lane",
    "abroad-events",
  ];

  var galleryOrderPromise = null;
  function fetchGalleryOrderOnce() {
    if (!galleryOrderPromise) {
      galleryOrderPromise = (async function () {
        try {
          var r = await fetch("/api/gallery-order", { cache: "no-store" });
          if (r.ok) return await r.json();
        } catch (e) {}
        try {
          var r2 = await fetch("/gallery-order.json", { cache: "no-store" });
          if (r2.ok) return await r2.json();
        } catch (e2) {}
        return { orders: {} };
      })();
    }
    return galleryOrderPromise;
  }

  function applyGalleryOrderToResources(resources, orderedIds) {
    if (!orderedIds || !orderedIds.length) return resources;
    var map = {};
    resources.forEach(function (r) {
      map[r.public_id] = r;
    });
    var out = [];
    var seen = {};
    orderedIds.forEach(function (id) {
      if (map[id]) {
        out.push(map[id]);
        seen[id] = true;
      }
    });
    resources.forEach(function (r) {
      if (!seen[r.public_id]) out.push(r);
    });
    return out;
  }

  /* ——— Theme ——— */
  var themeToggle = document.getElementById("themeToggle");
  var themeIcon = document.getElementById("themeIcon");
  var themeLabel = document.getElementById("themeLabel");

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("theme", theme);
    } catch (e) {}

    if (!themeToggle || !themeIcon || !themeLabel) return;

    if (theme === "dark") {
      themeIcon.textContent = "☀️";
      themeLabel.textContent = "Light";
      themeToggle.setAttribute("aria-label", "Switch to light theme");
      themeToggle.style.background = "#d4af37";
      themeToggle.style.color = "#1a0a2e";
      themeToggle.classList.add("is-dark");
    } else {
      themeIcon.textContent = "🌙";
      themeLabel.textContent = "Dark";
      themeToggle.setAttribute("aria-label", "Switch to dark theme");
      themeToggle.style.background = "#6b21a8";
      themeToggle.style.color = "#ffffff";
      themeToggle.classList.remove("is-dark");
    }
  }

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var current = document.documentElement.getAttribute("data-theme") || "light";
      applyTheme(current === "dark" ? "light" : "dark");
    });
  }

  applyTheme(localStorage.getItem("theme") || "light");

  /* ——— Navbar scroll ——— */
  var header = document.getElementById("siteHeader");
  function updateHeader() {
    if (!header) return;
    if (window.scrollY > 48) {
      header.classList.add("is-scrolled");
    } else {
      header.classList.remove("is-scrolled");
    }
  }
  window.addEventListener("scroll", updateHeader, { passive: true });
  updateHeader();

  /* ——— Mobile menu ——— */
  var navToggle = document.getElementById("navToggle");
  var navMenu = document.getElementById("navMenu");
  var navBackdrop = document.getElementById("navBackdrop");

  function setNavOpen(open) {
    if (!navToggle || !navMenu) return;
    navToggle.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    navMenu.classList.toggle("is-open", open);
    if (navBackdrop) {
      navBackdrop.hidden = !open;
      navBackdrop.classList.toggle("is-visible", open);
    }
    document.body.style.overflow = open ? "hidden" : "";
  }

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", function () {
      setNavOpen(!navMenu.classList.contains("is-open"));
    });
    if (navBackdrop) {
      navBackdrop.addEventListener("click", function () {
        setNavOpen(false);
      });
    }
    navMenu.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener("click", function () {
        setNavOpen(false);
      });
    });
  }

  /* ——— Nav active section ——— */
  var navLinks = document.querySelectorAll(".nav-menu a[data-nav]");
  var sectionIds = ["home", "about", "publications", "gallery", "events", "contact"];

  function setActiveNav(id) {
    navLinks.forEach(function (a) {
      a.classList.toggle("is-active", a.getAttribute("data-nav") === id);
    });
  }

  if ("IntersectionObserver" in window && navLinks.length) {
    var sections = sectionIds
      .map(function (id) {
        return document.getElementById(id);
      })
      .filter(Boolean);

    var navObserver = new IntersectionObserver(
      function (entries) {
        var visible = entries.filter(function (e) {
          return e.isIntersecting && e.intersectionRatio > 0;
        });
        if (!visible.length) return;
        visible.sort(function (a, b) {
          return b.intersectionRatio - a.intersectionRatio;
        });
        setActiveNav(visible[0].target.id);
      },
      { root: null, rootMargin: "-12% 0px -50% 0px", threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] }
    );
    sections.forEach(function (sec) {
      navObserver.observe(sec);
    });

    window.addEventListener("load", function () {
      if (window.scrollY < 120) setActiveNav("home");
    });
    if (window.scrollY < 120) setActiveNav("home");
  }

  /* ——— Back to top ——— */
  var backToTop = document.getElementById("backToTop");
  function toggleBackToTop() {
    if (!backToTop) return;
    if (window.scrollY > 400) {
      backToTop.hidden = false;
    } else {
      backToTop.hidden = true;
    }
  }
  window.addEventListener("scroll", toggleBackToTop, { passive: true });
  toggleBackToTop();
  if (backToTop) {
    backToTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ——— Typewriter ——— */
  var typeEl = document.getElementById("typewriter");
  if (typeEl) {
    var roleIndex = 0;
    var charIndex = 0;
    var deleting = false;

    function tick() {
      var full = ROLES[roleIndex];
      if (!deleting) {
        charIndex++;
        typeEl.textContent = full.slice(0, charIndex);
        if (charIndex >= full.length) {
          deleting = true;
          setTimeout(tick, PAUSE_END);
          return;
        }
        setTimeout(tick, TYPE_SPEED);
      } else {
        charIndex--;
        typeEl.textContent = full.slice(0, charIndex);
        if (charIndex <= 0) {
          deleting = false;
          roleIndex = (roleIndex + 1) % ROLES.length;
          setTimeout(tick, 400);
          return;
        }
        setTimeout(tick, DELETE_SPEED);
      }
    }
    tick();
  }

  /* ——— Scroll reveal ——— */
  var revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length && "IntersectionObserver" in window) {
    var revealObs = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { root: null, rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    revealEls.forEach(function (el) {
      revealObs.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  /* ——— Gallery ——— */
  var CAROUSEL_INTERVAL = 3500;

  function picUrl(seed) {
    return "https://picsum.photos/seed/" + seed + "/600/400";
  }

  function cloudinaryImgUrl(publicId) {
    return "https://res.cloudinary.com/" + CLOUD_NAME + "/image/upload/q_auto,f_auto,w_1200/" + publicId;
  }

  async function fetchGalleryResources(listTag, folder) {
    if (!CLOUD_NAME) return null;
    try {
      var r = await fetch(
        "https://res.cloudinary.com/" + CLOUD_NAME + "/image/list/" + encodeURIComponent(listTag) + ".json",
        { mode: "cors", cache: "no-store" }
      );
      if (r.ok) {
        var d = await r.json();
        var list = d.resources || [];
        if (list.length > 0) return list;
      }
    } catch (e) {}
    try {
      var fr = await fetch("/api/list-by-folder?prefix=" + encodeURIComponent(folder), { cache: "no-store" });
      if (fr.ok) {
        var fd = await fr.json();
        var list2 = fd.resources || [];
        if (list2.length > 0) return list2;
      }
    } catch (e) {}
    return null;
  }

  function openLightbox(src, alt) {
    var lb = document.getElementById("lightbox");
    var img = document.getElementById("lightboxImg");
    if (!lb || !img) return;
    img.src = src;
    img.alt = alt || "Gallery image";
    lb.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    var lb = document.getElementById("lightbox");
    var img = document.getElementById("lightboxImg");
    if (!lb) return;
    lb.hidden = true;
    if (img) {
      img.src = "";
      img.alt = "";
    }
    document.body.style.overflow = "";
  }

  var lightbox = document.getElementById("lightbox");
  var lightboxClose = document.getElementById("lightboxClose");
  if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
  if (lightbox) {
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLightbox();
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && lightbox && !lightbox.hidden) closeLightbox();
  });

  function attachSwipe(el, onLeft, onRight) {
    var startX = 0;
    el.addEventListener(
      "touchstart",
      function (e) {
        startX = e.touches[0].clientX;
      },
      { passive: true }
    );
    el.addEventListener(
      "touchend",
      function (e) {
        var endX = e.changedTouches[0].clientX;
        var diff = startX - endX;
        if (Math.abs(diff) < 50) return;
        if (diff > 0) onLeft();
        else onRight();
      },
      { passive: true }
    );
  }

  function buildImageCarousel(panel, config, panelIndex) {
    var slidesData = config.seeds.map(function (seed, i) {
      return {
        src: picUrl(seed),
        alt: (config.captions && config.captions[i]) || "Gallery image",
      };
    });
    buildImageCarouselFromSlides(panel, slidesData, panelIndex);
  }

  function buildImageCarouselFromSlides(panel, slidesData, panelIndex) {
    if (!slidesData || slidesData.length === 0) return;

    var wrap = document.createElement("div");
    wrap.className = "carousel";
    wrap.setAttribute("data-carousel-idx", String(panelIndex));

    var viewport = document.createElement("div");
    viewport.className = "carousel__viewport";

    slidesData.forEach(function (item, i) {
      var slide = document.createElement("div");
      slide.className = "carousel__slide" + (i === 0 ? " is-active" : "");
      var img = document.createElement("img");
      img.src = item.src;
      img.alt = item.alt || "Gallery image";
      img.loading = "lazy";
      img.addEventListener("click", function () {
        openLightbox(img.src, img.alt);
      });
      slide.appendChild(img);
      viewport.appendChild(slide);
    });

    var captionEl = document.createElement("p");
    captionEl.className = "carousel__caption";
    captionEl.textContent = (slidesData[0] && slidesData[0].alt) || "";

    var dotsWrap = document.createElement("div");
    dotsWrap.className = "carousel__dots";
    var dots = [];
    slidesData.forEach(function (_, i) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "carousel__dot" + (i === 0 ? " is-active" : "");
      dot.setAttribute("aria-label", "Go to slide " + (i + 1));
      dotsWrap.appendChild(dot);
      dots.push(dot);
    });

    var prev = document.createElement("button");
    prev.type = "button";
    prev.className = "carousel__btn carousel__btn--prev";
    prev.setAttribute("aria-label", "Previous slide");
    prev.innerHTML = "&#8249;";

    var next = document.createElement("button");
    next.type = "button";
    next.className = "carousel__btn carousel__btn--next";
    next.setAttribute("aria-label", "Next slide");
    next.innerHTML = "&#8250;";

    wrap.appendChild(viewport);
    wrap.appendChild(captionEl);
    wrap.appendChild(dotsWrap);
    wrap.appendChild(prev);
    wrap.appendChild(next);
    panel.appendChild(wrap);

    var slides = viewport.querySelectorAll(".carousel__slide");
    var current = 0;
    var timer = null;
    var hoverPaused = false;
    var panelVisible = false;

    function updateDots() {
      dots.forEach(function (d, i) {
        d.classList.toggle("is-active", i === current);
      });
      var row = slidesData[current];
      captionEl.textContent = (row && row.alt) || "";
    }

    function go(delta) {
      slides[current].classList.remove("is-active");
      current = (current + delta + slides.length) % slides.length;
      slides[current].classList.add("is-active");
      updateDots();
    }

    function startTimer() {
      stopTimer();
      if (!panelVisible || hoverPaused) return;
      timer = setInterval(function () {
        go(1);
      }, CAROUSEL_INTERVAL);
    }

    function stopTimer() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    prev.addEventListener("click", function () {
      go(-1);
      startTimer();
    });
    next.addEventListener("click", function () {
      go(1);
      startTimer();
    });

    dots.forEach(function (dot, i) {
      dot.addEventListener("click", function () {
        slides[current].classList.remove("is-active");
        current = i;
        slides[current].classList.add("is-active");
        updateDots();
        startTimer();
      });
    });

    wrap.addEventListener("mouseenter", function () {
      wrap.classList.add("is-paused");
      hoverPaused = true;
      stopTimer();
    });
    wrap.addEventListener("mouseleave", function () {
      wrap.classList.remove("is-paused");
      hoverPaused = false;
      startTimer();
    });

    attachSwipe(
      wrap,
      function () {
        go(1);
        startTimer();
      },
      function () {
        go(-1);
        startTimer();
      }
    );

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            panelVisible = entry.isIntersecting && entry.intersectionRatio > 0.1;
            if (panelVisible && !hoverPaused) startTimer();
            else stopTimer();
          });
        },
        { root: null, threshold: [0, 0.15, 0.5] }
      );
      io.observe(panel);
    } else {
      panelVisible = true;
      startTimer();
    }
  }

  function buildVideoCarousel(panel, panelIndex) {
    var seeds = [400, 410, 420, 430];
    var captions = [
      "Speech Highlights — Search on YouTube",
      "Television Appearance — Search on YouTube",
      "Stage Moments — Search on YouTube",
      "Audience Interaction — Search on YouTube",
    ];

    var wrap = document.createElement("div");
    wrap.className = "carousel";
    wrap.setAttribute("data-carousel-idx", String(panelIndex));

    var viewport = document.createElement("div");
    viewport.className = "carousel__viewport";

    seeds.forEach(function (seed, i) {
      var slide = document.createElement("div");
      slide.className = "carousel__slide" + (i === 0 ? " is-active" : "");
      var block = document.createElement("div");
      block.className = "carousel__yt";

      var thumb = document.createElement("img");
      thumb.className = "carousel__yt-thumb";
      thumb.src = picUrl(seed);
      thumb.alt = "";
      thumb.loading = "lazy";

      var link = document.createElement("a");
      link.className = "carousel__yt-play";
      link.href = YT_SEARCH;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("aria-label", "Search Dr Kalaiamudhan speeches on YouTube");
      link.innerHTML = "&#9654;";

      block.appendChild(thumb);
      block.appendChild(link);
      slide.appendChild(block);
      viewport.appendChild(slide);
    });

    var captionEl = document.createElement("p");
    captionEl.className = "carousel__caption";
    captionEl.textContent = captions[0];

    var dotsWrap = document.createElement("div");
    dotsWrap.className = "carousel__dots";
    var dots = [];
    seeds.forEach(function (_, i) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "carousel__dot" + (i === 0 ? " is-active" : "");
      dot.setAttribute("aria-label", "Go to slide " + (i + 1));
      dotsWrap.appendChild(dot);
      dots.push(dot);
    });

    var prev = document.createElement("button");
    prev.type = "button";
    prev.className = "carousel__btn carousel__btn--prev";
    prev.setAttribute("aria-label", "Previous slide");
    prev.innerHTML = "&#8249;";

    var next = document.createElement("button");
    next.type = "button";
    next.className = "carousel__btn carousel__btn--next";
    next.setAttribute("aria-label", "Next slide");
    next.innerHTML = "&#8250;";

    wrap.appendChild(viewport);
    wrap.appendChild(captionEl);
    wrap.appendChild(dotsWrap);
    wrap.appendChild(prev);
    wrap.appendChild(next);
    panel.appendChild(wrap);

    var slides = viewport.querySelectorAll(".carousel__slide");
    var current = 0;
    var timer = null;
    var hoverPaused = false;
    var panelVisible = false;

    function updateDots() {
      dots.forEach(function (d, i) {
        d.classList.toggle("is-active", i === current);
      });
      captionEl.textContent = captions[current];
    }

    function go(delta) {
      slides[current].classList.remove("is-active");
      current = (current + delta + slides.length) % slides.length;
      slides[current].classList.add("is-active");
      updateDots();
    }

    function startTimer() {
      stopTimer();
      if (!panelVisible || hoverPaused) return;
      timer = setInterval(function () {
        go(1);
      }, CAROUSEL_INTERVAL);
    }

    function stopTimer() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    prev.addEventListener("click", function () {
      go(-1);
      startTimer();
    });
    next.addEventListener("click", function () {
      go(1);
      startTimer();
    });

    dots.forEach(function (dot, i) {
      dot.addEventListener("click", function () {
        slides[current].classList.remove("is-active");
        current = i;
        slides[current].classList.add("is-active");
        updateDots();
        startTimer();
      });
    });

    wrap.addEventListener("mouseenter", function () {
      wrap.classList.add("is-paused");
      hoverPaused = true;
      stopTimer();
    });
    wrap.addEventListener("mouseleave", function () {
      wrap.classList.remove("is-paused");
      hoverPaused = false;
      startTimer();
    });

    attachSwipe(
      wrap,
      function () {
        go(1);
        startTimer();
      },
      function () {
        go(-1);
        startTimer();
      }
    );

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            panelVisible = entry.isIntersecting && entry.intersectionRatio > 0.1;
            if (panelVisible && !hoverPaused) startTimer();
            else stopTimer();
          });
        },
        { root: null, threshold: [0, 0.15, 0.5] }
      );
      io.observe(panel);
    } else {
      panelVisible = true;
      startTimer();
    }
  }

  async function buildCarouselAsync(panelIndex) {
    var panel = document.querySelector('.gallery-panel[data-carousel="' + panelIndex + '"]');
    if (!panel) return;

    var config = GALLERY_CONFIG[panelIndex];
    var cloud = GALLERY_CLOUD[panelIndex];
    if (!config || !cloud) return;

    var resources = await fetchGalleryResources(cloud.listTag, cloud.folder);
    if (resources && resources.length > 0) {
      var orderDoc = await fetchGalleryOrderOnce();
      var orderKey = GALLERY_ORDER_KEYS[panelIndex];
      var orderedIds = orderDoc.orders && orderDoc.orders[orderKey];
      resources = applyGalleryOrderToResources(resources, orderedIds);
      var slidesData = resources.map(function (r, i) {
        return {
          src: cloudinaryImgUrl(r.public_id),
          alt: (config.captions && config.captions[i]) || (r.public_id && r.public_id.split("/").pop()) || "Gallery image",
        };
      });
      buildImageCarouselFromSlides(panel, slidesData, panelIndex);
      return;
    }
    buildImageCarousel(panel, config, panelIndex);
  }

  function buildVideoPanel() {
    var panel = document.querySelector('.gallery-panel[data-carousel="4"]');
    if (!panel) return;
    buildVideoCarousel(panel, 4);
  }

  (function initGallery() {
    var chain = Promise.resolve();
    for (var p = 0; p < 4; p++) {
      (function (idx) {
        chain = chain.then(function () {
          return buildCarouselAsync(idx);
        });
      })(p);
    }
    chain.then(function () {
      buildVideoPanel();
    });
  })();

  var tabs = document.querySelectorAll(".gallery-tab");
  var panels = document.querySelectorAll(".gallery-panel");

  function activateTab(id) {
    tabs.forEach(function (tab) {
      var active = tab.getAttribute("data-panel") === id;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
    panels.forEach(function (panel) {
      var match = panel.id === "panel-" + id;
      panel.classList.toggle("is-active", match);
      panel.hidden = !match;
    });
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      var id = tab.getAttribute("data-panel");
      if (id) activateTab(id);
    });
  });

  /* ——— Events scroller ——— */
  var scroller = document.getElementById("eventsScroller");
  var btnPrev = document.getElementById("eventsPrev");
  var btnNext = document.getElementById("eventsNext");

  function scrollEvents(dir) {
    if (!scroller) return;
    var card = scroller.querySelector(".event-card");
    var amount = card ? card.offsetWidth + 20 : 320;
    scroller.scrollBy({ left: dir * amount, behavior: "smooth" });
  }

  if (btnPrev) btnPrev.addEventListener("click", function () { scrollEvents(-1); });
  if (btnNext) btnNext.addEventListener("click", function () { scrollEvents(1); });

  if (scroller) {
    var es = 0;
    scroller.addEventListener(
      "touchstart",
      function (e) {
        es = e.touches[0].clientX;
      },
      { passive: true }
    );
    scroller.addEventListener(
      "touchend",
      function (e) {
        var diff = es - e.changedTouches[0].clientX;
        if (Math.abs(diff) < 50) return;
        if (diff > 0) scrollEvents(1);
        else scrollEvents(-1);
      },
      { passive: true }
    );
  }

  /* ——— Contact form ——— */
  var form = document.getElementById("contactForm");
  var formSuccess = document.getElementById("formSuccess");
  var formError = document.getElementById("formError");
  var formNotice = document.getElementById("formNotice");

  if (form) {
    form.addEventListener("submit", function (e) {
      var action = form.getAttribute("action") || "";
      if (action.indexOf("YOUR_ENDPOINT_HERE") !== -1) {
        e.preventDefault();
        if (formSuccess) formSuccess.hidden = true;
        if (formError) formError.hidden = true;
        if (formNotice) formNotice.hidden = false;
        return;
      }
      e.preventDefault();
      if (formNotice) formNotice.hidden = true;
      if (formSuccess) formSuccess.hidden = true;
      if (formError) formError.hidden = true;

      var fd = new FormData(form);
      fetch(action, {
        method: "POST",
        body: fd,
        headers: { Accept: "application/json" },
      })
        .then(function (res) {
          if (res.ok) {
            form.reset();
            if (formError) formError.hidden = true;
            if (formSuccess) {
              formSuccess.hidden = false;
              formSuccess.focus();
            }
          } else {
            throw new Error("Submit failed");
          }
        })
        .catch(function () {
          if (formSuccess) formSuccess.hidden = true;
          if (formError) formError.hidden = false;
        });
    });
  }

  /* ——— Publications (books.json /api/books) ——— */
  function escHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  function bookCoverSrc(url) {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    return url.indexOf("/") === 0 ? url : "/" + url.replace(/^\.\//, "");
  }

  async function loadPublications() {
    var grid = document.getElementById("pub-grid");
    if (!grid) return;
    var loading = document.getElementById("pub-loading");
    var data = null;
    try {
      try {
        var r = await fetch("/api/books", { cache: "no-store" });
        if (r.ok) data = await r.json();
      } catch (e) {}
      if (!data || !data.books) {
        try {
          var r2 = await fetch("/books.json", { cache: "no-store" });
          if (r2.ok) data = await r2.json();
        } catch (e2) {}
      }
    } finally {
      if (loading) loading.remove();
    }
    if (!data || !data.books || !data.books.length) {
      grid.innerHTML =
        '<p class="section__subtitle" style="grid-column:1/-1;">No publications to show yet.</p>';
      return;
    }
    grid.innerHTML = data.books
      .map(function (b) {
        var title = escHtml(b.titleTa || "");
        var alt = "Book cover: " + title;
        var imgSrc = escHtml(bookCoverSrc(b.coverUrl));
        var drive = (b.driveUrl || "").trim();
        var driveHref = "#contact";
        if (drive && drive !== "#") {
          driveHref = drive.indexOf("http") === 0 ? drive : "https://" + drive.replace(/^\/\//, "");
        }
        return (
          '<article class="pub-card reveal is-visible">' +
          '<div class="pub-card__accent" aria-hidden="true"></div>' +
          '<div class="pub-card__tilt">' +
          '<div class="pub-card__cover-wrap">' +
          '<span class="pub-card__shine" aria-hidden="true"></span>' +
          '<img src="' +
          imgSrc +
          '" alt="' +
          alt +
          '" class="pub-card__cover" width="280" height="400" loading="lazy" />' +
          "</div></div>" +
          '<h3 class="pub-card__title-ta" lang="ta">' +
          title +
          "</h3>" +
          '<p class="pub-card__author" lang="ta">' +
          escHtml(b.authorTa || "") +
          "</p>" +
          '<p class="pub-card__desc">' +
          escHtml(b.descriptionEn || "") +
          "</p>" +
          '<a href="' +
          escHtml(driveHref) +
          '" class="btn btn--purple btn--small"' +
          (driveHref.indexOf("http") === 0 ? ' target="_blank" rel="noopener noreferrer"' : "") +
          ">View Book</a>" +
          "</article>"
        );
      })
      .join("");
  }

  loadPublications();
})();
