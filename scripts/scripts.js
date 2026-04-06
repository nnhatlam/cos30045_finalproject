async function injectComponent(targetId, filePath) {
  const target = document.getElementById(targetId);
  if (!target) {
    return;
  }

  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to load component: ${filePath}`);
    }
    target.innerHTML = await response.text();
  } catch (error) {
    target.innerHTML = '<p>Unable to load section.</p>';
    console.error(error);
  }
}

function setActiveNav(pageName) {
  const activeLink = document.querySelector(`[data-nav="${pageName}"]`);
  if (activeLink) {
    activeLink.classList.add("is-active");
  }
}

function setupMobileMenu() {
  const menuButton = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".site-nav");

  if (!menuButton || !nav) {
    return;
  }

  menuButton.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
    });
  });
}

function initScrollAnimations() {
  const io = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      
      const el = entry.target;
      
      // Trigger fade in
      if (el.classList.contains("fade-in")) {
        el.classList.add("visible");
        observer.unobserve(el);
      }
      
      // Trigger counter
      if (el.hasAttribute("data-count") && !el.classList.contains("counted")) {
        el.classList.add("counted");
        animateSingleCounter(el);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -50px 0px" });

  document.querySelectorAll(".fade-in, [data-count]").forEach(el => io.observe(el));
}

function animateSingleCounter(counter) {
  const target = Number(counter.getAttribute("data-count"));
  if (Number.isNaN(target)) return;

  const duration = 1800;
  const startTime = performance.now();

  const tick = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    // easing out
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const value = Math.floor(target * easeProgress);
    counter.textContent = value.toLocaleString("en-AU");

    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

document.addEventListener("DOMContentLoaded", async () => {
  await injectComponent("navbar", "components/navbar.html");
  await injectComponent("footer", "components/footer.html");

  const pageName = document.body.dataset.page;
  if (pageName) setActiveNav(pageName);
  setupMobileMenu();
  initScrollAnimations();
});
