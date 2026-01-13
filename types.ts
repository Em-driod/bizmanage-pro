
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
