import React, { createContext, useContext, useState } from "react";

const ScanContext = createContext(null);

export function ScanProvider({ children }) {
  const [scanResults, setScanResults] = useState(null);
  const [scannedUrl,  setScannedUrl]  = useState("");
  const [scanMode,    setScanMode]    = useState(null);
  const [scanError,   setScanError]   = useState(null);

  const clearScan = () => {
    setScanResults(null);
    setScannedUrl("");
    setScanMode(null);
    setScanError(null);
  };

  return (
    <ScanContext.Provider value={{
      scanResults, setScanResults,
      scannedUrl,  setScannedUrl,
      scanMode,    setScanMode,
      scanError,   setScanError,
      clearScan,
    }}>
      {children}
    </ScanContext.Provider>
  );
}

export const useScan = () => useContext(ScanContext);
