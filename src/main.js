import { createStandaloneApplication } from './standalone/application.js';
import { bindPageEdgeSmoothing } from './standalone/edgeSmoothing.js';
import { describeError } from './standalone/errors.js';
import { applyPageLocale } from './standalone/locale.js';
import { applyPageReadability } from './standalone/readability.js';
import { startContactDetails } from './ui/contactDetails.js';
import { startObjectDetails } from './ui/objectDetailsDialog.js';
import { startTrafficPanel } from './ui/trafficPanel.js';

applyPageLocale();
applyPageReadability();
const applyEdgeSmoothing = bindPageEdgeSmoothing();
startContactDetails();

const application = createStandaloneApplication({
  googleApiKey: import.meta.env.GOOGLE_MAPS_API_KEY,
  cesiumToken: import.meta.env.CESIUM_ION_TOKEN,
  allowQaRegistration: import.meta.env.DEV,
});

application
  .start()
  .then(applyEdgeSmoothing)
  .then(() => {
    // Both need the globe and the data layers, which exist once start() resolves.
    startTrafficPanel();
    startObjectDetails();
  })
  .catch((error) => {
    console.error("God's Eye View initialization failed:", error);
    const loaderStatus = document.querySelector(
      '#loading-screen .loader-status',
    );
    loaderStatus.textContent = `Error: ${describeError(error)}`;
    loaderStatus.style.color = '#ff4444';
  });

export { application };
