import React from "react";
import Documentation from "./Documentation";

/**
 * Main Documentation Route Entry Point.
 * Renders the full 14-screen Documentation feature.
 * Legacy blog viewer components (Doc-card, Doc-blog, CreateDoc) remain intact
 * and accessible in their respective files to preserve backwards compatibility.
 */
const Doc = () => {
  return <Documentation />;
};

export default Doc;