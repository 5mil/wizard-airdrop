/**
 * nav.js
 * Handles:
 *  1. Sticky top-nav scroll shadow
 *  2. Hamburger mobile menu
 *  3. Step navigation (goStep, step-btn active states)
 *  4. AI Engine modal open/close
 *  5. Scroll-reveal for .reveal elements
 *  6. Active nav-link highlighting by step
 */

// ====================================================================
// Step navigation
// ====================================================================
const TOTAL_STEPS = 9;
let _currentStep = 1;

/**
 * Navigate to a numbered step. Exported as window.goStep for inline HTML.
 */
export function goStep(n) {
  n = Math.max(1, Math.min(TOTAL_STEPS, n));
  _currentStep = n;

  // Show/hide step sections
  document.querySelectorAll('.step').forEach(el => {
    const stepN = parseInt(el.id.replace('step-', ''));
    el.classList.toggle('active', stepN === n);
  });

  // Update step-btn active states
  document.querySelectorAll('.step-btn').forEach(btn => {
    btn.classList.toggle('active', +btn.dataset.step === n);
  });

  // Scroll step nav button into view
  const activeBtn = document.querySelector(`.step-btn[data-step="${n}"]`);
  if (activeBtn) {
    activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
  }

  // Scroll to studio
  const studio = document.getElementById('studio');
  if (studio) {
    const offset = 60 + 42; // top-nav + step-nav heights
    const top = studio.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  }

  // Trigger reveal for newly active step
  requestAnimationFrame(() => {
    const activeStep = document.getElementById(`step-${n}`);
    if (activeStep) {
      activeStep.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
    }
  });

  // Dispatch event so other modules can react
  document.dispatchEvent(new CustomEvent('wizard:stepchange', { detail: { step: n } }));
}

export function currentStep() { return _currentStep; }

// ====================================================================
// Sticky navbar scroll behavior
// ====================================================================
function initStickyNav() {
  const nav = document.getElementById('top-nav');
  if (!nav) return;

  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ====================================================================
// Hamburger mobile menu
// ====================================================================
function initHamburger() {
  const btn  = document.getElementById('nav-hamburger');
  const menu = document.querySelector('.nav-links');
  if (!btn || !menu) return;

  btn.addEventListener('click', () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));
    menu.classList.toggle('open', !expanded);
  });

  // Close on outside click
  document.addEventListener('click', e => {
    if (!btn.contains(e.target) && !menu.contains(e.target)) {
      btn.setAttribute('aria-expanded', 'false');
      menu.classList.remove('open');
    }
  });
}

// ====================================================================
// Step-btn click wiring
// ====================================================================
function initStepButtons() {
  document.querySelectorAll('.step-btn').forEach(btn => {
    btn.addEventListener('click', () => goStep(+btn.dataset.step));
  });
}

// ====================================================================
// AI Engine modal
// ====================================================================
function initAIModal() {
  const overlay  = document.getElementById('ai-modal-overlay');
  const openBtn  = document.getElementById('btn-ai-engine');
  const closeBtn = document.getElementById('ai-modal-close');
  if (!overlay) return;

  const open = () => {
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    // Focus the close button for keyboard accessibility
    setTimeout(() => closeBtn && closeBtn.focus(), 50);
  };
  const close = () => {
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
    openBtn && openBtn.focus();
  };

  openBtn  && openBtn.addEventListener('click', open);
  closeBtn && closeBtn.addEventListener('click', close);

  // Close on backdrop click
  overlay.addEventListener('click', e => {
    if (e.target === overlay) close();
  });

  // Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !overlay.classList.contains('hidden')) close();
  });
}

// ====================================================================
// Scroll reveal (IntersectionObserver)
// ====================================================================
function initScrollReveal() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.08 });

  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
}

// ====================================================================
// Keyboard accessibility for mode cards (role=button)
// ====================================================================
function initModeCardKeyboard() {
  document.querySelectorAll('.mode-card[role=button]').forEach(card => {
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });
}

// ====================================================================
// Init
// ====================================================================
export function initNav() {
  initStickyNav();
  initHamburger();
  initStepButtons();
  initAIModal();
  initScrollReveal();
  initModeCardKeyboard();
}

// Expose globally for inline onclick HTML handlers
window.goStep = goStep;
