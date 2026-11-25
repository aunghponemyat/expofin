import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2, X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { createGuestTransactionId, loadGuestTransactions, saveGuestTransactions } from '../lib/guestTransactions';
import {
  CATEGORY_LABEL_KEYS,
  CategoryValue,
  categoriesFor,
  paymentMethodsFor,
} from '../lib/transactionOptions';
import { Currency, PaymentMethod, Transaction, TransactionType } from '../types';
import { cn } from '../lib/utils';
import { useLanguage } from '../i18n/LanguageContext';

interface BatchRow {
  id: string;
  type: TransactionType;
  amount: string;
  currency: Currency;
  category: string;
  paymentMethod: PaymentMethod;
  remark: string;
}

interface BatchTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  isGuest: boolean;
  defaultCurrency: Currency;
  onSaved: (savedDate: string, inserted: Transaction[]) => void;
}

function createRow(currency: Currency = 'MMK', paymentMethod?: PaymentMethod): BatchRow {
  const methods = paymentMethodsFor(currency);
  const resolvedMethod = paymentMethod && methods.includes(paymentMethod) ? paymentMethod : methods[0];
  return {
    id: crypto.randomUUID(),
    type: 'expense',
    amount: '',
    currency,
    category: categoriesFor('expense')[0],
    paymentMethod: resolvedMethod,
    remark: '',
  };
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function BatchTransactionModal({
  isOpen,
  onClose,
  userId,
  isGuest,
  defaultCurrency,
  onSaved,
}: BatchTransactionModalProps) {
  const { t } = useLanguage();
  const [batchDate, setBatchDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [rows, setRows] = useState<BatchRow[]>(() => [createRow(defaultCurrency)]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translateCategory = (value: string) => {
    const key = CATEGORY_LABEL_KEYS[value as CategoryValue];
    return key ? t(key) : value;
  };

  const summary = useMemo(() => {
    const totals: Record<Currency, { income: number; expense: number }> = {
      MMK: { income: 0, expense: 0 },
      THB: { income: 0, expense: 0 },
    };

    rows.forEach((row) => {
      const val = Number(row.amount);
      if (!isNaN(val) && val > 0) {
        totals[row.currency][row.type] += val;
      }
    });

    return totals;
  }, [rows]);

  const hasInvalidRow = useMemo(() => {
    if (!batchDate || rows.length === 0) return true;
    return rows.some((row) => {
      const val = Number(row.amount);
      return !row.amount || isNaN(val) || val <= 0 || countWords(row.remark) > 15;
    });
  }, [batchDate, rows]);

  if (!isOpen) return null;

  const resetForm = () => {
    setBatchDate(format(new Date(), 'yyyy-MM-dd'));
    setRows([createRow(defaultCurrency)]);
    setError(null);
  };

  const handleClose = () => {
    if (submitting) return;
    resetForm();
    onClose();
  };

  const handleAddRow = () => {
    const lastRow = rows[rows.length - 1];
    setRows((prev) => [
      ...prev,
      createRow(lastRow ? lastRow.currency : defaultCurrency, lastRow?.paymentMethod),
    ]);
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  const updateRow = (id: string, patch: Partial<BatchRow>) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const next = { ...row, ...patch };

        if (patch.type && patch.type !== row.type) {
          const allowed = categoriesFor(patch.type);
          if (!allowed.includes(next.category)) {
            next.category = allowed[0];
          }
        }

        if (patch.currency && patch.currency !== row.currency) {
          const allowedMethods = paymentMethodsFor(patch.currency);
          if (!allowedMethods.includes(next.paymentMethod)) {
            next.paymentMethod = allowedMethods[0];
          }
        }

        return next;
      })
    );
  };

  const formatTotal = (val: number, currency: Currency) => {
    if (currency === 'MMK') {
      return `${new Intl.NumberFormat('en-US').format(val)} Ks`;
    }
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasInvalidRow || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload = rows.map((row) => ({
        user_id: userId,
        type: row.type,
        currency: row.currency,
        amount: Number(row.amount),
        category: row.category,
        payment_method: row.paymentMethod,
        date: batchDate,
        remark: row.remark.trim() || null,
      }));

      if (isGuest) {
        const now = new Date().toISOString();
        const newTransactions: Transaction[] = payload.map((item) => ({
          ...item,
          id: createGuestTransactionId(),
          created_at: now,
        }));
        const updated = [...newTransactions, ...loadGuestTransactions()].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        saveGuestTransactions(updated);
        onSaved(batchDate, newTransactions);
        resetForm();
        return;
      }

      const { data, error: insertError } = await supabase
        .from('transactions')
        .insert(payload)
        .select();

      if (insertError) throw insertError;

      onSaved(batchDate, (data as Transaction[]) || []);
      resetForm();
    } catch (err) {
      console.error('Error adding batch transactions:', err);
      setError(t('batch_error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="transaction-modal fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-transaction-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10 shrink-0">
          <h3 id="batch-transaction-title" className="text-xl font-bold text-white">
            {t('batch_transactions')}
          </h3>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            aria-label={t('cancel')}
            className="shrink-0 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Shared Date & Error */}
          <div className="px-5 pt-4 pb-3 border-b border-white/5 bg-white/[0.02] shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <label
                  htmlFor="batch-date"
                  className="text-xs font-bold text-slate-400 uppercase whitespace-nowrap"
                >
                  {t('batch_date')}
                </label>
                <input
                  id="batch-date"
                  type="date"
                  required
                  value={batchDate}
                  onChange={(e) => setBatchDate(e.target.value)}
                  className="bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-base sm:text-sm text-white focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <div className="text-xs font-medium text-slate-400">
                {t('records_count')}: <span className="text-white font-bold">{rows.length}</span>
              </div>
            </div>

            {error && (
              <div className="mt-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400">
                {error}
              </div>
            )}
          </div>

          {/* Scrollable Rows */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {rows.map((row, index) => {
              const wordCount = countWords(row.remark);
              const remarkTooLong = wordCount > 15;
              const availableCategories = categoriesFor(row.type);
              const availableMethods = paymentMethodsFor(row.currency);

              return (
                <div
                  key={row.id}
                  className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">#{index + 1}</span>
                      <div className="inline-flex rounded-lg bg-slate-800/80 p-0.5 border border-white/10">
                        <button
                          type="button"
                          onClick={() => updateRow(row.id, { type: 'expense' })}
                          className={cn(
                            'px-2.5 py-1 rounded-md text-xs font-bold uppercase transition-all',
                            row.type === 'expense'
                              ? 'bg-rose-500 text-white shadow-sm'
                              : 'text-slate-400 hover:text-rose-400'
                          )}
                        >
                          {t('expense')}
                        </button>
                        <button
                          type="button"
                          onClick={() => updateRow(row.id, { type: 'income' })}
                          className={cn(
                            'px-2.5 py-1 rounded-md text-xs font-bold uppercase transition-all',
                            row.type === 'income'
                              ? 'bg-emerald-500 text-white shadow-sm'
                              : 'text-slate-400 hover:text-emerald-400'
                          )}
                        >
                          {t('income')}
                        </button>
                      </div>
                    </div>

                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.id)}
                        aria-label={t('remove_row')}
                        title={t('remove_row')}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    {/* Amount */}
                    <div className="sm:col-span-4">
                      <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                        {t('amount')}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={row.amount}
                        onChange={(e) => updateRow(row.id, { amount: e.target.value })}
                        placeholder="0.00"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-base sm:text-sm text-white focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>

                    {/* Currency */}
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                        {t('currency')}
                      </label>
                      <select
                        value={row.currency}
                        onChange={(e) => updateRow(row.id, { currency: e.target.value as Currency })}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-2 text-base sm:text-sm text-white focus:outline-none focus:border-indigo-500/50"
                      >
                        <option value="MMK">MMK</option>
                        <option value="THB">THB</option>
                      </select>
                    </div>

                    {/* Category */}
                    <div className="sm:col-span-3">
                      <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                        {t('category')}
                      </label>
                      <select
                        value={row.category}
                        onChange={(e) => updateRow(row.id, { category: e.target.value })}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-2 text-base sm:text-sm text-white focus:outline-none focus:border-indigo-500/50"
                      >
                        {availableCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {translateCategory(cat)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Payment Method */}
                    <div className="sm:col-span-3">
                      <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                        {t('payment_method')}
                      </label>
                      <select
                        value={row.paymentMethod}
                        onChange={(e) =>
                          updateRow(row.id, { paymentMethod: e.target.value as PaymentMethod })
                        }
                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-2 text-base sm:text-sm text-white focus:outline-none focus:border-indigo-500/50 capitalize"
                      >
                        {availableMethods.map((method) => (
                          <option key={method} value={method}>
                            {method}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Remark */}
                    <div className="sm:col-span-12">
                      <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                        {t('remark')}
                      </label>
                      <input
                        type="text"
                        value={row.remark}
                        onChange={(e) => updateRow(row.id, { remark: e.target.value })}
                        placeholder={t('remark_placeholder')}
                        className={cn(
                          'w-full bg-white/5 border rounded-lg px-3 py-2 text-base sm:text-sm text-white focus:outline-none transition-all',
                          remarkTooLong
                            ? 'border-rose-500 focus:border-rose-500'
                            : 'border-white/10 focus:border-indigo-500/50'
                        )}
                      />
                      {remarkTooLong && (
                        <p className="text-xs sm:text-[10px] text-rose-400 mt-1 font-medium">
                          {t('remark_warning')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={handleAddRow}
              className="w-full py-2.5 border border-dashed border-white/20 hover:border-indigo-400/60 hover:bg-indigo-500/10 text-indigo-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t('add_row')}
            </button>
          </div>

          {/* Footer with Totals & Actions */}
          <div className="px-5 py-4 border-t border-white/10 bg-slate-900/95 shrink-0 space-y-3">
            {(summary.MMK.expense > 0 ||
              summary.MMK.income > 0 ||
              summary.THB.expense > 0 ||
              summary.THB.income > 0) && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                {summary.MMK.income > 0 && (
                  <span className="text-emerald-400 font-medium">
                    MMK +{formatTotal(summary.MMK.income, 'MMK')}
                  </span>
                )}
                {summary.MMK.expense > 0 && (
                  <span className="text-rose-400 font-medium">
                    MMK -{formatTotal(summary.MMK.expense, 'MMK')}
                  </span>
                )}
                {summary.THB.income > 0 && (
                  <span className="text-emerald-400 font-medium">
                    THB +{formatTotal(summary.THB.income, 'THB')}
                  </span>
                )}
                {summary.THB.expense > 0 && (
                  <span className="text-rose-400 font-medium">
                    THB -{formatTotal(summary.THB.expense, 'THB')}
                  </span>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all uppercase tracking-wider text-xs disabled:opacity-50"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={hasInvalidRow || submitting}
                className="py-3 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:pointer-events-none text-white rounded-xl font-bold transition-all uppercase tracking-wider text-xs shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? t('saving') : t('submit_batch')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
