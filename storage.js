// Read saved data when the app starts.
export function loadExpenses() {
    try {
        const saved = localStorage.getItem("spendsmart-expenses");
        return saved ? JSON.parse(saved) : [];
    } catch (error) {
        console.error("Could not load expenses:", error);
        return [];
    }
}

export function saveExpenses(expenses) {
    localStorage.setItem("spendsmart-expenses", JSON.stringify(expenses));
}

export function loadBudget() {
    const saved = localStorage.getItem("spendsmart-budget");
    const budget = Number(saved);
    return saved !== null && Number.isFinite(budget) && budget >= 0 ? budget : 0;
}

export function saveBudget(budget) {
    localStorage.setItem("spendsmart-budget", String(budget));
}
