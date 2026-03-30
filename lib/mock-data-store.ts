// lib/mock-data-store.ts

interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  type: 'income' | 'expense';
  amount: number;
}

// Store transactions per sheet connection
const dataStore: Map<string, Transaction[]> = new Map();

function initializeSheetData(connectionId: string) {
  if (!dataStore.has(connectionId)) {
    dataStore.set(connectionId, [
      {
        id: '1',
        date: new Date().toISOString().split('T')[0],
        description: 'Sample Salary',
        category: 'Salary',
        type: 'income',
        amount: 50000,
      },
      {
        id: '2',
        date: new Date().toISOString().split('T')[0],
        description: 'Sample Expense',
        category: 'Food',
        type: 'expense',
        amount: 1500,
      },
    ]);
  }
}

export const mockDataStore = {
  getTransactions(connectionId: string): Transaction[] {
    initializeSheetData(connectionId);
    return dataStore.get(connectionId) || [];
  },

  addTransaction(connectionId: string, transaction: Omit<Transaction, 'id'>): Transaction {
    initializeSheetData(connectionId);
    const transactions = dataStore.get(connectionId)!;
    
    const newTransaction = {
      ...transaction,
      id: `${Date.now()}`,
    };
    
    transactions.push(newTransaction);
    dataStore.set(connectionId, transactions);
    
    return newTransaction;
  },

  updateTransaction(connectionId: string, transactionId: string, updates: Partial<Transaction>): Transaction | null {
    initializeSheetData(connectionId);
    const transactions = dataStore.get(connectionId);
    if (!transactions) return null;

    const index = transactions.findIndex((t) => t.id === transactionId);
    if (index === -1) return null;

    transactions[index] = {
      ...transactions[index],
      ...updates,
      id: transactions[index].id,
    };

    dataStore.set(connectionId, transactions);
    return transactions[index];
  },

  deleteTransaction(connectionId: string, transactionId: string): boolean {
    initializeSheetData(connectionId);
    const transactions = dataStore.get(connectionId);
    if (!transactions) return false;

    const index = transactions.findIndex((t) => t.id === transactionId);
    if (index === -1) return false;

    transactions.splice(index, 1);
    dataStore.set(connectionId, transactions);
    
    return true;
  },

  getTransaction(connectionId: string, transactionId: string): Transaction | null {
    const transactions = dataStore.get(connectionId);
    if (!transactions) return null;
    return transactions.find((t) => t.id === transactionId) || null;
  },

  clearConnection(connectionId: string): void {
    dataStore.delete(connectionId);
  },
};