/**
 * Student QR Scanner Component.
 *
 * Allows students to mark their attendance by:
 * 1. Scanning a QR code displayed by faculty using the device camera
 * 2. Manually entering the QR code string
 *
 * The scanned QR code is sent to the backend for validation and attendance marking.
 */

import { useState } from 'react';
import { Scan, Check, X } from 'lucide-react';
import QrScanner from 'react-qr-scanner';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { apiMarkAttendance } from '../utils/api';

export function StudentScanner() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [qrInput, setQrInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  /**
   * Handle a scanned or manually entered QR code.
   * Sends the code to the backend API for validation and attendance marking.
   */
  const handleScan = async (scannedData?: string | object | null) => {
    // Extract text from scanner data (react-qr-scanner v1 returns objects)
    let dataToScan = typeof scannedData === 'string'
      ? scannedData
      : (scannedData as any)?.text || qrInput;

    if (!dataToScan) return;
    if (scanning) return;  // Prevent duplicate submissions

    setQrInput(dataToScan);
    setScanning(true);

    try {
      // Call the backend to mark attendance with the QR code
      const response = await apiMarkAttendance(dataToScan);

      if (response.success) {
        setResult({
          success: true,
          message: response.message || 'Attendance marked successfully!',
        });
        // Notify other components (like dashboard) to refresh their data
        window.dispatchEvent(new Event('attendance-update'));
      } else {
        setResult({
          success: false,
          message: response.error || 'Failed to mark attendance',
        });
      }
    } catch (err: any) {
      setResult({
        success: false,
        message: err.message || 'Failed to mark attendance',
      });
    }

    setScanning(false);
    setQrInput('');

    // Clear result message after 3 seconds
    setTimeout(() => setResult(null), 3000);
  };

  /** Handle camera errors gracefully */
  const handleQrError = (err: any) => {
    console.error('QR Scanner Error:', err);
  };

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-card to-secondary p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-lg">
            <Scan className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Scan QR Code</h2>
            <p className="text-sm text-muted-foreground">Mark your attendance</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 max-w-2xl mx-auto w-full">
        {/* Camera Scanner Area */}
        <Card className="p-6 w-full bg-card border-2 border-dashed border-primary/30 flex flex-col items-center justify-center">
          <div className="aspect-square w-full max-w-sm mx-auto bg-black rounded-lg flex items-center justify-center overflow-hidden relative">
            <QrScanner
              delay={300}
              onError={handleQrError}
              className="qr-scanner-wrapper"
              onScan={(data: any) => {
                if (data && !scanning) {
                  handleScan(data);
                }
              }}
              style={{ width: '100%', height: '100%' }}
            />
            {/* Animated scanning line overlay */}
            <div className="absolute inset-x-0 top-0 h-1 bg-primary/50 animate-scan pointer-events-none" />
          </div>
        </Card>

        {/* Manual QR Code Input — fallback for when camera doesn't work */}
        <Card className="p-4 bg-card border-border">
          <h3 className="font-semibold text-foreground mb-3">Or Enter Code Manually</h3>
          <div className="flex gap-2">
            <Input
              placeholder="Enter QR code"
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleScan()}
              className="flex-1 bg-input-background border-border text-foreground"
              disabled={scanning}
            />
            <Button
              onClick={() => handleScan()}
              disabled={!qrInput || scanning}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-6"
            >
              {scanning ? 'Scanning...' : 'Scan'}
            </Button>
          </div>
        </Card>

        {/* Result Message — shown after scanning */}
        {result && (
          <Card
            className={`p-4 border-2 ${
              result.success
                ? 'bg-primary/10 border-primary/30'
                : 'bg-destructive/10 border-destructive/30'
            }`}
          >
            <div className="flex items-center gap-3">
              {result.success ? (
                <div className="p-2 bg-primary rounded-full">
                  <Check className="w-5 h-5 text-primary-foreground" />
                </div>
              ) : (
                <div className="p-2 bg-destructive rounded-full">
                  <X className="w-5 h-5 text-destructive-foreground" />
                </div>
              )}
              <div>
                <p className={`font-semibold ${result.success ? 'text-primary' : 'text-destructive'}`}>
                  {result.success ? 'Success!' : 'Error'}
                </p>
                <p className="text-sm text-foreground">{result.message}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Instructions for students */}
        <Card className="p-4 bg-card border-border">
          <h3 className="font-semibold text-foreground mb-3">Instructions</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>QR code will be displayed by faculty during class</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Scan the code within the time limit (5 minutes)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Each QR code can only be used once per student</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>You must be enrolled in the course to mark attendance</span>
            </li>
          </ul>
        </Card>
      </div>

      {/* Scanner CSS animations */}
      <style>{`
        @keyframes scan {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(300px); }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
        .qr-scanner-wrapper {
          background-color: black !important;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .qr-scanner-wrapper video {
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
          background-color: black !important;
        }
      `}
      </style>
    </div>
  );
}
