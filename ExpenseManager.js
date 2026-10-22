// This class stores and manages expense objects.
export class ExpenseManager {
    constructor(expenses = []) {
        this.expenses = expenses;
    }

    add(name, amount, category, date) {
        const expense = {
            id: Date.now().toString() + Math.random().toString(16).slice(2),
            name: name.trim(),
            amount: Number(amount),
            category: category,
            date: date
        };

        this.expenses.push(expense);
        return expense;
    }

    delete(id) {
        this.expenses = this.expenses.filter(function (expense) {
            return expense.id !== id;
        });
    }

    replace(expenses) {
        this.expenses = expenses;
    }
}
