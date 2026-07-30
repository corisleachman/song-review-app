// Shared cookie consent controller for the marketing site, app and blog.
(() => {
  const CONSENT_KEY = 'tsr_analytics_consent';
  const MEASUREMENT_ID = 'G-8VW86YBN6C';
  const BANNER_ID = 'tsr-cookie-banner';
  const SETTINGS_ID = 'tsr-cookie-settings';

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };

  window.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500,
  });

  function getChoice() {
    try {
      return window.localStorage.getItem(CONSENT_KEY);
    } catch {
      return null;
    }
  }

  function saveChoice(value) {
    try {
      window.localStorage.setItem(CONSENT_KEY, value);
    } catch {
      // The preference cannot be persisted, but the current-page choice still applies.
    }
  }

  function grantAnalyticsConsent() {
    window.gtag('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
  }

  function loadAnalytics() {
    grantAnalyticsConsent();

    if (document.querySelector(`script[data-tsr-ga="${MEASUREMENT_ID}"]`)) {
      return;
    }

    window.gtag('js', new Date());
    window.gtag('config', MEASUREMENT_ID, { anonymize_ip: true });

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
    script.dataset.tsrGa = MEASUREMENT_ID;
    document.head.appendChild(script);
  }

  function removeAnalyticsCookies() {
    const names = document.cookie
      .split(';')
      .map((part) => part.split('=')[0].trim())
      .filter((name) => name === '_ga' || name.startsWith('_ga_'));

    for (const name of names) {
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
      document.cookie = `${name}=; Max-Age=0; path=/; domain=.${window.location.hostname}; SameSite=Lax`;
    }
  }

  function denyAnalytics() {
    window.gtag('consent', 'update', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
    removeAnalyticsCookies();
  }

  function hideBanner() {
    document.getElementById(BANNER_ID)?.remove();
    showSettingsButton();
  }

  function acceptAnalytics() {
    saveChoice('accepted');
    loadAnalytics();
    hideBanner();
  }

  function rejectAnalytics() {
    saveChoice('rejected');
    denyAnalytics();
    hideBanner();
  }

  function showSettingsButton() {
    if (document.getElementById(SETTINGS_ID)) return;
    const button = document.createElement('button');
    button.id = SETTINGS_ID;
    button.type = 'button';
    button.className = 'tsr-cookie-settings';
    button.textContent = 'Cookie settings';
    button.addEventListener('click', showBanner);
    document.body.appendChild(button);
  }

  function showBanner() {
    document.getElementById(BANNER_ID)?.remove();
    document.getElementById(SETTINGS_ID)?.remove();

    const banner = document.createElement('section');
    banner.id = BANNER_ID;
    banner.className = 'tsr-cookie-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Cookie preferences');
    banner.innerHTML = `
      <div class="tsr-cookie-copy">
        <h2>Analytics cookies</h2>
        <p>We use optional Google Analytics cookies to understand how people use The Song Room and improve the experience. They are off unless you accept.</p>
      </div>
      <div class="tsr-cookie-actions">
        <button type="button" class="tsr-cookie-button tsr-cookie-button-secondary" data-cookie-choice="reject">Reject</button>
        <button type="button" class="tsr-cookie-button tsr-cookie-button-primary" data-cookie-choice="accept">Accept analytics</button>
      </div>
    `;

    banner.querySelector('[data-cookie-choice="reject"]')?.addEventListener('click', rejectAnalytics);
    banner.querySelector('[data-cookie-choice="accept"]')?.addEventListener('click', acceptAnalytics);
    document.body.appendChild(banner);
  }

  function initialise() {
    const choice = getChoice();
    if (choice === 'accepted') {
      loadAnalytics();
      showSettingsButton();
      return;
    }
    if (choice === 'rejected') {
      denyAnalytics();
      showSettingsButton();
      return;
    }
    showBanner();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialise, { once: true });
  } else {
    initialise();
  }
})();
