import { createRoot } from "react-dom/client";
import { Auth0Provider } from "@auth0/auth0-react";
import App from "./App.tsx";
import "./index.css";

const domain = import.meta.env.VITE_AUTH0_DOMAIN;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

if (!domain || !clientId) {
  throw new Error(
    "Missing Auth0 config: set VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID in your environment.",
  );
}

createRoot(document.getElementById("root")!).render(
  <Auth0Provider
    domain={domain}
    clientId={clientId}
    cacheLocation="localstorage"
    useRefreshTokens
    authorizationParams={{
      redirect_uri: window.location.origin,
      ...(audience ? { audience } : {}),
    }}
  >
    <App />
  </Auth0Provider>,
);
