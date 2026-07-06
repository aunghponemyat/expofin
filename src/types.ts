export type TransactionType = 'income' | 'expense';

export type Currency = 'MMK' | 'THB';
export type PaymentMethod = 'cash' | 'kpay' | 'wave' | 'bank transfer' | 'true money';

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  currency: Currency;
  amount: number;
  category: string;
  payment_method: PaymentMethod;
  date: string;
  remark?: string;
  created_at: string;
}
