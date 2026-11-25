import { Currency, PaymentMethod, TransactionType } from '../types';

export const EXPENSE_CATEGORIES = ['bills', 'food', 'groceries', 'electronics', 'transport', 'entertainment', 'health', 'other'];

export const INCOME_CATEGORIES = ['salary', 'bonus', 'freelance', 'investment', 'gift', 'other'];

export const CATEGORY_LABEL_KEYS = {
  'bills': 'category_meter_bills',
  'food': 'category_food',
  'groceries': 'category_groceries',
  'electronics': 'category_electronics',
  'transport': 'category_transport',
  'entertainment': 'category_entertainment',
  'health': 'category_health',
  'other': 'category_other',
  'salary': 'category_salary',
  'bonus': 'category_bonus',
  'freelance': 'category_freelance',
  'investment': 'category_investment',
  'gift': 'category_gift',
} as const;

export type CategoryValue = keyof typeof CATEGORY_LABEL_KEYS;

export const MMK_PAYMENT_METHODS: PaymentMethod[] = ['cash', 'kpay', 'wave', 'bank transfer'];

export const THB_PAYMENT_METHODS: PaymentMethod[] = ['cash', 'true money', 'bank transfer'];

export const PAYMENT_METHODS = ['cash', 'kpay', 'wave', 'bank transfer', 'true money'] as const;

export function categoriesFor(type: TransactionType): string[] {
  return type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
}

export function paymentMethodsFor(currency: Currency): PaymentMethod[] {
  return currency === 'MMK' ? MMK_PAYMENT_METHODS : THB_PAYMENT_METHODS;
}