export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Security Analyst' | 'Viewer';
  mfaEnabled: boolean;
}

export interface AnomalyAlert {
  id: string;
  timestamp: string;
  sourceIP: string;
  destinationIP: string;
  protocol: string;
  reconstructionError: number;
  threshold?: number;
  confidenceScore?: number;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'New' | 'Investigating' | 'Resolved';
  prediction?: string;
}

export interface NetworkMetric {
  time: string;
  normalTraffic: number;
  anomalousTraffic: number;
  reconstructionError: number;
  threshold: number;
}
