import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Transaction, TransactionType, PaymentMethod, Currency } from '../types';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { LogOut, Trash2, X, ChevronLeft, ChevronRight, ChevronDown, Globe, Pencil } from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../i18n/LanguageContext';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const EXPENSE_CATEGORIES = ['bills', 'food', 'groceries', 'electronics', 'transport', 'entertainment', 'health', 'other'];
const INCOME_CATEGORIES = ['salary', 'bonus', 'freelance', 'investment', 'gift', 'other'];
const CATEGORY_LABEL_KEYS = {
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
type CategoryValue = keyof typeof CATEGORY_LABEL_KEYS;
const MMK_PAYMENT_METHODS: PaymentMethod[] = ['cash', 'kpay', 'wave', 'bank transfer'];
const THB_PAYMENT_METHODS: PaymentMethod[] = ['cash', 'true money', 'bank transfer'];

export function Dashboard() {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [user, setUser] = useState<any>(null);

  // Delete Confirmation State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Edit State
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState<PaymentMethod>('cash');
  const [editRemark, setEditRemark] = useState('');
  const [editCurrency, setEditCurrency] = useState<Currency>('MMK');

  // Form State
  const [activeTab, setActiveTab] = useState<TransactionType>('expense');
  const [formCurrency, setFormCurrency] = useState<Currency>('MMK');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [remark, setRemark] = useState('');

  // Filter State
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');
  const [filterPayment, setFilterPayment] = useState<PaymentMethod | 'all'>('all');

  // Balance Display Currency
  const [balanceCurrency, setBalanceCurrency] = useState<Currency>('MMK');

  // Category Display Currency
  const [categoryCurrency, setCategoryCurrency] = useState<Currency>('MMK');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Month Selection State
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const translateCategory = (value: string) => {
    const key = CATEGORY_LABEL_KEYS[value as CategoryValue];
    return key ? t(key) : value;
  };

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user, selectedMonth]);

  // Adjust categories based on active tab
  useEffect(() => {
    if (activeTab === 'expense') {
      setCategory(EXPENSE_CATEGORIES[0]);
    } else {
      setCategory(INCOME_CATEGORIES[0]);
    }
  }, [activeTab]);

  const checkUser = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        navigate('/login');
      } else {
        setUser(session.user);
      }
    } catch (err) {
      console.error(err);
      navigate('/login');
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);

    // Calculate start and end based on selectedMonth
    const [year, month] = selectedMonth.split('-');
    const dateInMonth = new Date(Number(year), Number(month) - 1, 1);

    const start = format(startOfMonth(dateInMonth), 'yyyy-MM-dd');
    const end = format(endOfMonth(dateInMonth), 'yyyy-MM-dd');

    try {
      // Fetch selected month's transactions
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data as Transaction[] || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleClearForm = () => {
    setAmount('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setCategory(activeTab === 'expense' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0]);
    setPaymentMethod('cash');
    setRemark('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount || isNaN(Number(amount))) return;

    try {
      const newTx = {
        user_id: user.id,
        type: activeTab,
        currency: formCurrency,
        amount: Number(amount),
        category,
        payment_method: paymentMethod,
        date,
        remark: remark.trim() || null,
      };

      const { data, error } = await supabase
        .from('transactions')
        .insert([newTx])
        .select()
        .single();

      if (error) throw error;

      setTransactions(prev => [data as Transaction, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      handleClearForm();
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Failed to add transaction. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      setTransactions(prev => prev.filter(t => t.id !== id));
      setDeletingId(null);
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  const handleEditClick = (tx: Transaction) => {
    setEditingTx(tx);
    setEditAmount(tx.amount.toString());
    setEditDate(tx.date);
    setEditCurrency(tx.currency || 'MMK');
    setEditCategory(tx.category);
    setEditPaymentMethod(tx.payment_method);
    setEditRemark(tx.remark || '');
  };

  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingTx || !editAmount || isNaN(Number(editAmount))) return;

    try {
      const updatedTx = {
        amount: Number(editAmount),
        date: editDate,
        currency: editCurrency,
        category: editCategory,
        payment_method: editPaymentMethod,
        remark: editRemark.trim() || null,
      };

      const { data, error } = await supabase
        .from('transactions')
        .update(updatedTx)
        .eq('id', editingTx.id)
        .select()
        .single();

      if (error) throw error;

      setTransactions(prev => prev.map(t => t.id === editingTx.id ? (data as Transaction) : t));
      setEditingTx(null);
    } catch (error) {
      console.error('Error updating transaction:', error);
      alert('Failed to update transaction. Please try again.');
    }
  };

  // Calculations
  const balances = useMemo(() => {
    const result = {
      MMK: { totalIncome: 0, totalExpense: 0, balance: 0 },
      THB: { totalIncome: 0, totalExpense: 0, balance: 0 }
    };
    transactions.forEach(tx => {
      const cur = tx.currency || 'MMK';
      if (tx.type === 'income') {
        result[cur as 'MMK' | 'THB'].totalIncome += tx.amount;
        result[cur as 'MMK' | 'THB'].balance += tx.amount;
      } else {
        result[cur as 'MMK' | 'THB'].totalExpense += tx.amount;
        result[cur as 'MMK' | 'THB'].balance -= tx.amount;
      }
    });
    return result;
  }, [transactions]);

  const expensesByCategory = useMemo(() => {
    const result: Record<string, { MMK: number; THB: number }> = {};
    transactions.forEach(tx => {
      if (tx.type === 'expense') {
        const cur = tx.currency || 'MMK';
        if (!result[tx.category]) {
          result[tx.category] = { MMK: 0, THB: 0 };
        }
        result[tx.category][cur as 'MMK' | 'THB'] += tx.amount;
        console.log(tx.category)
      }
    });
    return result;
  }, [transactions]);

  // Filtering & Pagination
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchType = filterType === 'all' || tx.type === filterType;
      const matchPayment = filterPayment === 'all' || tx.payment_method === filterPayment;
      return matchType && matchPayment;
    });
  }, [transactions, filterType, filterPayment]);

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Auto-reset page if filtering changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, filterPayment]);

  // Adjust payment methods if currency changes
  useEffect(() => {
    const availableMethods = formCurrency === 'MMK' ? MMK_PAYMENT_METHODS : THB_PAYMENT_METHODS;
    if (!availableMethods.includes(paymentMethod)) {
      setPaymentMethod(availableMethods[0]);
    }
  }, [formCurrency]);

  const formatCurrency = (val: number, currency: string = 'MMK') => {
    if (currency === 'MMK') {
      return new Intl.NumberFormat('en-US').format(val) + ' Ks';
    } else if (currency === 'THB') {
      return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(val);
    }
    return new Intl.NumberFormat('en-US').format(val);
  };

  const getPaymentMethodColor = (method: PaymentMethod) => {
    switch (method.toLowerCase()) {
      case 'cash': return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
      case 'kpay': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'wave': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      case 'bank transfer': return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      case 'true money': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans flex justify-center sm:p-6 items-start">
      <div className="w-full max-w-xl sm:bg-[#0f172a] sm:border sm:border-white/10 sm:rounded-3xl sm:shadow-2xl flex flex-col relative min-h-screen sm:min-h-0 sm:my-4">
        <div className="p-4 sm:p-8 flex flex-col gap-6">
          {/* Header */}
          <header className="flex justify-between items-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
            <div className="flex flex-col gap-1 items-start">
              <h1 className="text-xl font-bold tracking-tight text-white hidden sm:block">{t('app_title')}</h1>
              <h1 className="text-lg font-bold tracking-tight text-white sm:hidden">{t('app_title_short')}</h1>
              <span className="text-[10px] font-medium bg-white/10 text-slate-300 px-2 py-0.5 rounded-md border border-white/10">v1.1.1</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setLanguage(language === 'en' ? 'my' : 'en')}
                className="p-2 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-lg text-slate-300 transition-all flex items-center justify-center"
                title={language === 'en' ? 'Switch to Myanmar' : 'Switch to English'}
              >
                <Globe className="w-4 h-4" />
                <span className="ml-2 text-xs font-semibold uppercase">{language}</span>
              </button>
              <button
                onClick={handleSignOut}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-lg text-xs font-semibold transition-all flex items-center space-x-2"
              >
                <span className="hidden sm:inline">{t('log_out')}</span>
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          </header>

          <main className="flex-1 flex flex-col gap-6 pb-6">
            {/* Top Section: Overview & Input */}
            <div className="flex flex-col gap-6">

              {/* Balances */}
              <div className="flex flex-col gap-4">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 flex gap-2">
                    <select
                      value={balanceCurrency}
                      onChange={(e) => setBalanceCurrency(e.target.value as Currency)}
                      className="bg-slate-900 border border-white/10 text-slate-300 text-sm sm:text-xs rounded-lg px-3 sm:px-2 py-2 sm:py-1.5 focus:outline-none focus:border-indigo-500/50 appearance-none"
                    >
                      <option value="MMK">MMK</option>
                      <option value="THB">THB</option>
                    </select>
                    <DatePicker
                      selected={parseISO(`${selectedMonth}-01`)}
                      onChange={(date: Date | null) => {
                        if (date) {
                          setSelectedMonth(format(date, 'yyyy-MM'));
                        }
                      }}
                      dateFormat="MMMM yyyy"
                      showMonthYearPicker
                      portalId="datepicker-portal"
                      onKeyDown={(e) => e.preventDefault()}
                      className="bg-slate-900 border border-white/10 text-slate-300 text-sm sm:text-xs rounded-lg px-3 sm:px-2 py-2 sm:py-1.5 caret-transparent focus:outline-none focus:border-indigo-500/50 cursor-pointer w-32 sm:w-28 text-center animate-none"
                      popperPlacement="bottom-end"
                      popperClassName="dashboard-month-picker-popper"
                      wrapperClassName="flex items-center"
                    />
                  </div>

                  <p className="text-xs sm:text-[13px] font-bold text-slate-400 uppercase tracking-widest mb-1 mt-2">{t('current_balance')}</p>
                  <p className="text-2xl sm:text-2xl font-light text-white mb-2">
                    {formatCurrency(balances[balanceCurrency].balance, balanceCurrency)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
                    <p className="text-[15px] sm:text-[13px] font-bold text-emerald-400 uppercase tracking-widest mb-1">{t('total_income')}</p>
                    <p className="text-base sm:text-lg font-light text-emerald-400">+{formatCurrency(balances[balanceCurrency].totalIncome, balanceCurrency)}</p>
                  </div>
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
                    <p className="text-[15px] sm:text-[13px] font-bold text-rose-400 uppercase tracking-widest mb-1">{t('total_expenses')}</p>
                    <p className="text-base sm:text-lg font-light text-rose-400">-{formatCurrency(balances[balanceCurrency].totalExpense, balanceCurrency)}</p>
                  </div>
                </div>
              </div>

              {/* Input Form */}
              <div className="flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 overflow-hidden">
                <h2 className="text-lg font-semibold mb-4 text-white">{t('new_transaction')}</h2>
                <div className="flex flex-col gap-4 flex-1">
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('income')}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-sm font-bold transition-all uppercase",
                        activeTab === 'income'
                          ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 border-2 border-emerald-400/50"
                          : "bg-white/5 text-slate-400 border border-white/5 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30"
                      )}
                    >
                      {t('income')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('expense')}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-sm font-bold transition-all uppercase",
                        activeTab === 'expense'
                          ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20 border-2 border-rose-400/50"
                          : "bg-white/5 text-slate-400 border border-white/5 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30"
                      )}
                    >
                      {t('expense')}
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-[15px] sm:text-[13px] font-bold text-slate-400 uppercase mb-1 block">{t('amount')}</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg p-3 sm:p-2.5 text-white text-base focus:outline-none focus:border-indigo-500/50"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="w-24">
                        <label className="text-[15px] sm:text-[13px] font-bold text-slate-400 uppercase mb-1 block">{t('currency')}</label>
                        <select
                          value={formCurrency}
                          onChange={(e) => setFormCurrency(e.target.value as Currency)}
                          className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 sm:p-2.5 text-white text-base focus:outline-none appearance-none"
                        >
                          <option value="MMK">MMK</option>
                          <option value="THB">THB</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[15px] sm:text-[13px] font-bold text-slate-400 uppercase mb-1 block">{t('date')}</label>
                        <input
                          type="date"
                          required
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg p-3 sm:p-2.5 text-white text-base sm:text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[15px] sm:text-[13px] font-bold text-slate-400 uppercase mb-1 block">{t('category')}</label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 sm:p-2.5 text-white text-base sm:text-xs focus:outline-none appearance-none"
                        >
                          {(activeTab === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(cat => (
                            <option key={cat} value={cat}>{translateCategory(cat)}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[15px] sm:text-[13px] font-bold text-slate-400 uppercase mb-1 block">{t('payment_method')}</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 sm:p-2.5 text-white text-base sm:text-xs focus:outline-none appearance-none capitalize"
                      >
                        {(formCurrency === 'MMK' ? MMK_PAYMENT_METHODS : THB_PAYMENT_METHODS).map(method => (
                          <option key={method} value={method}>{method}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[15px] sm:text-[13px] font-bold text-slate-400 uppercase mb-1 block">{t('remark')}</label>
                      <input
                        type="text"
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        className={cn(
                          "w-full bg-white/5 border rounded-lg p-3 sm:p-2.5 text-white text-base sm:text-xs focus:outline-none transition-all",
                          remark.trim().split(/\s+/).filter(w => w.length > 0).length > 15
                            ? "border-rose-500 focus:border-rose-500"
                            : "border-white/10 focus:border-indigo-500/50"
                        )}
                        placeholder={t('remark_placeholder')}
                      />
                      {remark.trim().split(/\s+/).filter(w => w.length > 0).length > 15 && (
                        <p className="text-xs sm:text-[10px] text-rose-400 mt-1 font-medium">{t('remark_warning')}</p>
                      )}
                    </div>

                    <div className="mt-4 flex flex-col gap-2">
                      <button
                        type="submit"
                        disabled={remark.trim().split(/\s+/).filter(w => w.length > 0).length > 15}
                        className="w-full py-3 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:pointer-events-none text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all"
                      >
                        {t('submit_record')}
                      </button>
                      <button
                        type="button"
                        onClick={handleClearForm}
                        className="w-full py-2 bg-transparent text-slate-400 hover:text-white text-sm sm:text-xs transition-all"
                      >
                        {t('cancel')}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* Middle Section: Expenses by Category */}
            {Object.keys(expensesByCategory).length > 0 && (
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col p-5 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">{t('expenses_by_category')}</h2>
                  <div className="relative">
                    <select
                      value={categoryCurrency}
                      onChange={(e) => setCategoryCurrency(e.target.value as Currency)}
                      className="appearance-none bg-slate-900 border border-white/10 hover:border-white/20 text-slate-300 text-sm sm:text-xs rounded-lg pl-3 pr-8 py-2.5 sm:py-2 focus:outline-none focus:border-indigo-500/50 transition-all cursor-pointer min-w-[80px]"
                    >
                      <option value="MMK">MMK</option>
                      <option value="THB">THB</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  {Object.entries(expensesByCategory)
                    .filter(([_, amounts]) => amounts[categoryCurrency] > 0)
                    .sort((a, b) => b[1][categoryCurrency] - a[1][categoryCurrency])
                    .map(([cat, amounts]) => (
                      <div key={cat} className="flex items-center justify-between p-3 border border-white/5 rounded-xl bg-white/[0.02]">
                        <span className="text-base font-medium text-slate-300">{translateCategory(cat)}</span>
                        <div className="text-base font-medium text-rose-400 flex gap-2">
                          <span>{formatCurrency(amounts[categoryCurrency], categoryCurrency)}</span>
                        </div>
                      </div>
                    ))}

                  {Object.entries(expensesByCategory).filter(([_, amounts]) => amounts[categoryCurrency] > 0).length === 0 && (
                    <div className="py-4 text-center text-slate-500 text-sm">
                      {t('no_transactions_found')}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bottom Section: History Log */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col p-5 overflow-hidden">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-4">
                <h2 className="text-lg font-semibold text-white">{t('history_log')}</h2>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value as any)}
                      className="appearance-none bg-slate-900 border border-white/10 hover:border-white/20 text-slate-300 text-sm sm:text-xs rounded-lg pl-3 pr-8 py-2.5 sm:py-2 focus:outline-none focus:border-indigo-500/50 transition-all cursor-pointer min-w-[120px]"
                    >
                      <option value="all" className="bg-slate-900 text-slate-300">{t('type')}</option>
                      <option value="income" className="bg-slate-900 text-slate-300">{t('income')}</option>
                      <option value="expense" className="bg-slate-900 text-slate-300">{t('expense')}</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  <div className="relative">
                    <select
                      value={filterPayment}
                      onChange={(e) => setFilterPayment(e.target.value as any)}
                      className="appearance-none bg-slate-900 border border-white/10 hover:border-white/20 text-slate-300 text-sm sm:text-xs rounded-lg pl-3 pr-8 py-2.5 sm:py-2 focus:outline-none focus:border-indigo-500/50 transition-all cursor-pointer min-w-[130px] capitalize"
                    >
                      <option value="all" className="bg-slate-900 text-slate-300">{t('payment_method')}</option>
                      {[...MMK_PAYMENT_METHODS, 'true money'].filter((m, i, self) => self.indexOf(m) === i).map(m => (
                        <option key={m} value={m} className="bg-slate-900 text-slate-300">{m}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-x-hidden">
                {loading ? (
                  <div className="py-12 text-center text-slate-500 text-sm">{t('loading_transactions')}</div>
                ) : paginatedTransactions.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-sm">{t('no_transactions_found')}</div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {paginatedTransactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-3 border border-white/5 rounded-xl bg-white/[0.02] hover:bg-white/5 transition-colors group">
                        <div className="flex flex-col gap-1 min-w-0 pr-3">
                          <div className="flex items-center pb-0.5">
                            <span className={cn(
                              "px-2 py-0.5 text-xs sm:text-[10px] uppercase tracking-wider font-semibold rounded border whitespace-nowrap",
                              getPaymentMethodColor(tx.payment_method)
                            )}>
                              {tx.payment_method}
                            </span>
                          </div>
                          <span className="text-sm sm:text-xs font-medium text-slate-400 whitespace-nowrap">{tx.date}</span>
                          <p className="font-bold text-white text-base truncate">{translateCategory(tx.category)}</p>
                          <p className="text-sm text-slate-400 truncate font-normal">{tx.remark || t('no_remark')}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={cn(
                            "text-base font-semibold",
                            tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                          )}>
                            {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, tx.currency || 'MMK')}
                          </span>
                          <div className="flex items-center gap-1 mt-1">
                            <button
                              onClick={() => handleEditClick(tx)}
                              className="text-slate-500 hover:text-indigo-400 transition-colors p-1"
                              title="Edit Record"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeletingId(tx.id)}
                              className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                              title="Delete Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-4 pt-4 border-t border-white/5">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 text-slate-400 hover:bg-white/10 disabled:opacity-50 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="text-xs text-slate-400 px-2 font-medium">
                    Page {currentPage} of {totalPages}
                  </div>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 text-slate-400 hover:bg-white/10 disabled:opacity-50 transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </main>

          {/* Footer */}
          <div className="text-center pb-4 text-xs text-slate-500 font-medium w-full">
            <p>Made with ❤️ by All Your AOT Thing</p>
          </div>

          {/* Edit Modal */}
          {editingTx && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
              <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl scale-100 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">{t('edit_transaction')}</h3>
                  <button
                    onClick={() => setEditingTx(null)}
                    className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleUpdateTransaction} className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-[15px] sm:text-[13px] font-bold text-slate-400 uppercase mb-1 block">{t('amount')}</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 sm:p-2.5 text-white text-base focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>
                    <div className="w-24">
                      <label className="text-[15px] sm:text-[13px] font-bold text-slate-400 uppercase mb-1 block">{t('currency')}</label>
                      <select
                        value={editCurrency}
                        onChange={(e) => setEditCurrency(e.target.value as Currency)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 sm:p-2.5 text-white text-base focus:outline-none appearance-none"
                      >
                        <option value="MMK">MMK</option>
                        <option value="THB">THB</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[15px] sm:text-[13px] font-bold text-slate-400 uppercase mb-1 block">{t('date')}</label>
                      <input
                        type="date"
                        required
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 sm:p-2.5 text-white text-base sm:text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[15px] sm:text-[13px] font-bold text-slate-400 uppercase mb-1 block">{t('category')}</label>
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 sm:p-2.5 text-white text-base sm:text-xs focus:outline-none appearance-none"
                      >
                        {(editingTx.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(cat => (
                          <option key={cat} value={cat}>{translateCategory(cat)}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[15px] sm:text-[13px] font-bold text-slate-400 uppercase mb-1 block">{t('payment_method')}</label>
                    <select
                      value={editPaymentMethod}
                      onChange={(e) => setEditPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 sm:p-2.5 text-white text-base sm:text-xs focus:outline-none appearance-none capitalize"
                    >
                      {(editCurrency === 'MMK' ? MMK_PAYMENT_METHODS : THB_PAYMENT_METHODS).map(method => (
                        <option key={method} value={method}>{method}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[15px] sm:text-[13px] font-bold text-slate-400 uppercase mb-1 block">{t('remark')}</label>
                    <input
                      type="text"
                      value={editRemark}
                      onChange={(e) => setEditRemark(e.target.value)}
                      className={cn(
                        "w-full bg-white/5 border rounded-lg p-3 sm:p-2.5 text-white text-base sm:text-xs focus:outline-none transition-all",
                        editRemark.trim().split(/\s+/).filter(w => w.length > 0).length > 15
                          ? "border-rose-500 focus:border-rose-500"
                          : "border-white/10 focus:border-indigo-500/50"
                      )}
                      placeholder={t('remark_placeholder')}
                    />
                    {editRemark.trim().split(/\s+/).filter(w => w.length > 0).length > 15 && (
                      <p className="text-xs sm:text-[10px] text-rose-400 mt-1 font-medium">{t('remark_warning')}</p>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setEditingTx(null)}
                      className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all uppercase tracking-wider text-xs"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold transition-all uppercase tracking-wider text-xs shadow-lg shadow-indigo-500/20"
                    >
                      {t('update')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deletingId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
              <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 w-full max-w-[320px] shadow-2xl scale-100 animate-in zoom-in-95 duration-200 mx-auto">
                <h3 className="text-lg font-semibold text-white mb-2">{t('delete_transaction')}</h3>
                <p className="text-sm text-slate-400 mb-6">
                  {t('delete_confirmation')}
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setDeletingId(null)}
                    className="px-4 py-2 text-sm font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={() => handleDelete(deletingId)}
                    className="px-4 py-2 text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/20 rounded-xl transition-all flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t('delete')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
