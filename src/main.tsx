import React from "react";
import ReactDOM from "react-dom/client";
import App from "./PulsoFit";
import { AuthProvider } from "./auth";
import "lenis/dist/lenis.css"; // estilos base del scroll suave (Lenis)
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
