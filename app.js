import { ExpenseManager } from "./ExpenseManager.js";
import { loadExpenses, saveExpenses, loadBudget, saveBudget } from "./storage.js";

const manager = new ExpenseManager(loadExpenses());
let budget = loadBudget();

const form = document.getElementById("expenseForm");
const nameInput = document.getElementById("name");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");
const budgetForm = document.getElementById("budgetForm");
const budgetInput = document.getElementById("budget");
const searchInput = document.getElementById("search");
const categoryFilter = document.getElementById("categoryFilter");
const sortDate = document.getElementById("sortDate");
const expenseList = document.getElementById("expenseList");

const today = new Date();
dateInput.value = today.toISOString().slice(0, 10);
budgetInput.value = budget;

function money(amount) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(amount);
}

function currentMonthExpenses() {
    const year = today.getFullYear();
    const month = today.getMonth();

    return manager.expenses.filter(function (expense) {
        const date = new Date(expense.date + "T00:00:00");
        return date.getFullYear() === year && date.getMonth() === month;
    });
}

function updateDashboard() {
    const monthlyExpenses = currentMonthExpenses();

    const total = monthlyExpenses.reduce(function (sum, expense) {
        return sum + expense.amount;
    }, 0);

    document.getElementById("totalSpent").textContent = money(total);
    document.getElementById("expenseCount").textContent = monthlyExpenses.length;
    document.getElementById("remainingBudget").textContent = money(budget - total);

    const warning = document.getElementById("budgetWarning");
    if (total > budget) {
        warning.textContent = "Budget exceeded by " + money(total - budget) + ".";
        warning.hidden = false;
    } else {
        warning.hidden = true;
    }
}

function showExpenses() {
    const searchText = searchInput.value.trim().toLowerCase();
    const selectedCategory = categoryFilter.value;
    const direction = sortDate.value;

    let shownExpenses = manager.expenses.filter(function (expense) {
        const matchesName = expense.name.toLowerCase().includes(searchText);
        const matchesCategory = selectedCategory === "All" || expense.category === selectedCategory;
        return matchesName && matchesCategory;
    });

    shownExpenses.sort(function (a, b) {
        if (direction === "newest") {
            return b.date.localeCompare(a.date);
        }
        return a.date.localeCompare(b.date);
    });

    expenseList.replaceChildren();

    shownExpenses.forEach(function (expense) {
        const row = document.createElement("tr");

        const nameCell = document.createElement("td");
        nameCell.textContent = expense.name;

        const amountCell = document.createElement("td");
        amountCell.textContent = money(expense.amount);

        const categoryCell = document.createElement("td");
        categoryCell.textContent = expense.category;

        const dateCell = document.createElement("td");
        dateCell.textContent = expense.date;

        const actionCell = document.createElement("td");
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.className = "delete-button";
        deleteButton.type = "button";
        deleteButton.addEventListener("click", function () {
            manager.delete(expense.id);
            saveExpenses(manager.expenses);
            refresh();
        });

        actionCell.appendChild(deleteButton);
        row.append(nameCell, amountCell, categoryCell, dateCell, actionCell);
        expenseList.appendChild(row);
    });

    document.getElementById("emptyMessage").hidden = shownExpenses.length > 0;
    document.getElementById("transactionCount").textContent =
        "Showing " + shownExpenses.length + " of " + manager.expenses.length + " transactions";
}

function refresh() {
    updateDashboard();
    showExpenses();
}

form.addEventListener("submit", function (event) {
    event.preventDefault();

    const name = nameInput.value.trim();
    const amount = Number(amountInput.value);
    const category = categoryInput.value;
    const date = dateInput.value;
    const validCategories = ["Food", "Travel", "Shopping", "Other"];
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;

    if (!name || !Number.isFinite(amount) || amount <= 0 ||
        !validCategories.includes(category) || !datePattern.test(date)) {
        document.getElementById("formMessage").textContent =
            "Enter a name, positive amount, valid category and date.";
        return;
    }

    manager.add(name, amount, category, date);
    saveExpenses(manager.expenses);
    form.reset();
    dateInput.value = new Date().toISOString().slice(0, 10);
    document.getElementById("formMessage").textContent = "Expense added!";
    refresh();
});

budgetForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const newBudget = Number(budgetInput.value);

    if (!Number.isFinite(newBudget) || newBudget < 0 || budgetInput.value.trim() === "") {
        alert("Enter a valid budget of zero or more.");
        return;
    }

    budget = newBudget;
    saveBudget(budget);
    refresh();
});

searchInput.addEventListener("input", showExpenses);
categoryFilter.addEventListener("change", showExpenses);
sortDate.addEventListener("change", showExpenses);

document.getElementById("clearButton").addEventListener("click", function () {
    if (confirm("Delete all expenses? Your budget will be kept.")) {
        manager.replace([]);
        saveExpenses(manager.expenses);
        refresh();
    }
});

document.getElementById("exportButton").addEventListener("click", function () {
    const file = new Blob([JSON.stringify(manager.expenses, null, 2)], {
        type: "application/json"
    });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "spendsmart-expenses.json";
    link.click();
    URL.revokeObjectURL(url);
});

document.getElementById("importFile").addEventListener("change", async function (event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const imported = JSON.parse(text);
        const validCategories = ["Food", "Travel", "Shopping", "Other"];
        const valid = Array.isArray(imported) && imported.every(function (expense) {
            return expense &&
                typeof expense.id === "string" &&
                typeof expense.name === "string" && expense.name.trim() !== "" &&
                typeof expense.amount === "number" && Number.isFinite(expense.amount) && expense.amount > 0 &&
                validCategories.includes(expense.category) &&
                typeof expense.date === "string" &&
                /^\d{4}-\d{2}-\d{2}$/.test(expense.date);
        });

        if (!valid) {
            throw new Error("The JSON file does not contain valid expenses.");
        }

        if (confirm("Replace all current expenses with " + imported.length + " imported expenses?")) {
            manager.replace(imported);
            saveExpenses(manager.expenses);
            refresh();
            document.getElementById("fileMessage").textContent = "Expenses imported successfully.";
        }
    } catch (error) {
        document.getElementById("fileMessage").textContent = "Import failed: " + error.message;
    }

    event.target.value = "";
});

// Optional exchange-rate example using fetch(), Promises and async/await.
async function showUsdConversion() {
    try {
        const response = await fetch("https://open.er-api.com/v6/latest/INR");
        if (!response.ok) throw new Error("Exchange rate request failed.");
        const data = await response.json();
        const rate = data.rates.USD;
        console.log("Current-month spending in USD:", (currentMonthExpenses().reduce(
            (sum, expense) => sum + expense.amount, 0
        ) * rate).toFixed(2));
    } catch (error) {
        console.log("USD conversion unavailable:", error.message);
    }
}

refresh();
showUsdConversion();
