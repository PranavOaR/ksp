// AppSail entrypoint: Catalyst hands us the listen port via
// X_ZOHO_CATALYST_LISTEN_PORT; Next standalone reads PORT/HOSTNAME.
const DEFAULT_APPSAIL_PORT = '9000';

process.env.PORT =
  process.env.X_ZOHO_CATALYST_LISTEN_PORT ||
  process.env.PORT ||
  DEFAULT_APPSAIL_PORT;
process.env.HOSTNAME = '0.0.0.0';

require('./server.js');
