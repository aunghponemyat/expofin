import { format } from 'date-fns';
import { Transaction } from '../types';

const GUEST_TRANSACTIONS_KEY = 'expofin:guest-transactions';
const GUEST_USER_ID = 'guest';

function createSampleTransactions(): Transaction[] {
  const today = new Date();
  const date = (dayOffset: number) => format(new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayOffset), 'yyyy-MM-dd');
  const createdAt = today.toISOString();

  return [
    { id: 'guest-salary', user_id: GUEST_USER_ID, type: 'income', currency: 'MMK', amount: 1500000, category: 'salary', payment_method: 'bank transfer', date: date(8), remark: 'Monthly salary', created_at: createdAt },
    { id: 'guest-groceries', user_id: GUEST_USER_ID, type: 'expense', currency: 'MMK', amount: 85000, category: 'groceries', payment_method: 'kpay', date: date(3), remark: 'Weekly groceries', created_at: createdAt },
    { id: 'guest-transport', user_id: GUEST_USER_ID, type: 'expense', currency: 'MMK', amount: 25000, category: 'transport', payment_method: 'cash', date: date(1), remark: 'Taxi fares', created_at: createdAt },
  ];
}

export function loadGuestTransactions(): Transaction[] {
  try {
    const stored = window.localStorage.getItem(GUEST_TRANSACTIONS_KEY);
    if (stored) {
      const transactions = JSON.parse(stored);
      if (Array.isArray(transactions)) return transactions as Transaction[];
    }
  } catch (error) {
    console.warn('Unable to read guest transactions:', error);
  }

  const samples = createSampleTransactions();
  saveGuestTransactions(samples);
  return samples;
}

export function saveGuestTransactions(transactions: Transaction[]) {
  try {
    window.localStorage.setItem(GUEST_TRANSACTIONS_KEY, JSON.stringify(transactions));
  } catch (error) {
    console.warn('Unable to save guest transactions:', error);
  }
}

export function createGuestTransactionId() {
  return `guest-${crypto.randomUUID()}`;
}
