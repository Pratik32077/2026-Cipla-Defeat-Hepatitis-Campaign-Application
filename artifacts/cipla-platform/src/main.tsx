import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";

const apiBase = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";
setBaseUrl(apiBase || null);

if (apiBase) {
  console.info("API base URL:", apiBase);
} else {
  console.info("API base URL: relative path (using /api proxy or same-origin requests)");
}

createRoot(document.getElementById("root")!).render(<App />);
