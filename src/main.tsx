import React from "react";
import { createRoot } from "react-dom/client";
import ArchiveApp from "./ArchiveApp";
import "./styles.css";
import "./archive.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ArchiveApp />
  </React.StrictMode>,
);
