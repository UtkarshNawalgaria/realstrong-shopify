const ccThemeRole = Shopify.theme.role ?? 'unknown';
const scriptElement = document.querySelector('script[src*=store-info]');

if (!localStorage.getItem('cc-settings-loaded') || localStorage.getItem('cc-settings-loaded') !== ccThemeRole) {
  fetch('https://check.cleancanvas.co.uk/', {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    method: 'POST',
    mode: 'cors',
    body: new URLSearchParams({
      shop: Shopify.shop,
      theme: (scriptElement === null || scriptElement === void 0 ? void 0 : scriptElement.dataset.theme) ?? '',
      version: (scriptElement === null || scriptElement === void 0 ? void 0 : scriptElement.dataset.version) ?? '',
      role: ccThemeRole,
      contact: (scriptElement === null || scriptElement === void 0 ? void 0 : scriptElement.dataset.contact) ?? ''
    })
  }).
  then((response) => {
    if (response.ok) {
      localStorage.setItem('cc-settings-loaded', ccThemeRole);
    }
  });
}