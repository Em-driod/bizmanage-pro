
export enum UserRole {
  ADMIN = 'admin',
  STAFF = 'staff'
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  businessId: string;
  businessName?: string;
}

export interface Business {
  _id: string;
  name: string;
  address: string;
  email: string;
  phone: string;
  currency: string;
}

export interface Client {
  _id: string;
  name: string;
  email: string;
  phone: string;
  businessId: string;
  businessValue: number;
  status: 'active' | 'inactive';
}

export interface Transaction {
  _id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  clientId?: string;
  businessId: string;
  date: string;
  recordedBy: string;
}

export interface Payroll {
  _id: string;
  staffName: string;
  salary: number;
  payday: string;
  status: 'paid' | 'pending';
  businessId: string;
  staffId?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface ParsedScanItem {
  amount: number;
  type: 'income' | 'expense' | 'unassigned'; // Added 'unassigned' for flexibility
  description: string;
  category: string;
  status?: 'pending' | 'committed' | 'edited'; // Add status field, optional for now
}

export interface ScanResponse {
  text: string;
  transactions: ParsedScanItem[];
}

export interface ScannedInvoiceLineItem {
  description: string;
  quantity: number;
  price: number;
  total: number;
}

export interface ScannedInvoice {
  invoiceNumber?: string;
  total: number;
  tax: number;
  dueDate?: string;
  lineItems: ScannedInvoiceLineItem[];
}

export interface IScannedTransaction {
  _id: string;
  businessId: string;
  rawText: string;
  originalFileName: string;
  status: 'pending' | 'processed';
  recordedBy: string;
  createdAt: string;
  updatedAt: string;
  parsedDetails: ParsedScanItem[];
}
