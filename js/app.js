/* =========================================================
   Expense & Budget Visualizer — app.js
   Vanilla JS only. No frameworks. Data stored in localStorage.
========================================================= */

(function () {
  "use strict";

  /* ---------- Constants ---------- */
  const STORAGE_KEY = "ebv_transactions";
  const LIMIT_KEY = "ebv_limit";
  const THEME_KEY = "ebv_theme";

  const CATEGORY_COLORS = {
    Food: "#2ecc71",
    Transport: "#4a90d9",
    Fun: "#f39c12",
  };

  /* ---------- DOM references ---------- */
  const form = document.getElementById("transactionForm");
  const itemNameInput = document.getElementById("itemName");
  const amountInput = document.getElementById("amount");
  const categoryInput = document.getElementById("category");

  const itemNameError = document.getElementById("itemNameError");
  const amountError = document.getElementById("amountError");
  const categoryError = document.getElementById("categoryError");

  const balanceAmountEl = document.getElementById("balanceAmount");
  const limitInput = document.getElementById("limitInput");
  const limitWarning = document.getElementById("limitWarning");

  const transactionListEl = document.getElementById("transactionList");
  const emptyStateEl = document.getElementById("emptyState");
  const sortSelect = document.getElementById("sortSelect");

  const chartCanvas = document.getElementById("spendingChart");
  const chartEmptyEl = document.getElementById("chartEmpty");

  const themeToggleBtn = document.getElementById("themeToggle");
  const themeIconEl = document.getElementById("themeIcon");

  /* ---------- State ---------- */
  let transactions = loadTransactions();
  let spendingChart = null;
  let currentSort = "newest";

  /* ---------- Storage helpers ---------- */
  function loadTransactions() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.error("Failed to load transactions:", err);
      return [];
    }
  }

  function saveTransactions() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  }

  function loadLimit() {
    const raw = localStorage.getItem(LIMIT_KEY);
    return raw ? parseFloat(raw) : null;
  }

  function saveLimit(value) {
    if (value === null || Number.isNaN(value)) {
      localStorage.removeItem(LIMIT_KEY);
    } else {
      localStorage.setItem(LIMIT_KEY, String(value));
    }
  }

  /* ---------- Theme (dark/light toggle) ---------- */
  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY) || "light";
    applyTheme(saved);
  }

  function applyTheme(theme) {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      themeIconEl.textContent = "☀️";
    } else {
      document.documentElement.removeAttribute("data-theme");
      themeIconEl.textContent = "🌙";
    }
    localStorage.setItem(THEME_KEY, theme);
  }

  themeToggleBtn.addEventListener("click", function () {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    applyTheme(isDark ? "light" : "dark");
  });

  /* ---------- Formatting ---------- */
  function formatCurrency(value) {
    const rounded = Math.round(value);
    return "Rp" + rounded.toLocaleString("id-ID");
  }

  /* ---------- Validation ---------- */
  function validateForm() {
    let isValid = true;

    itemNameError.textContent = "";
    amountError.textContent = "";
    categoryError.textContent = "";
    itemNameInput.classList.remove("invalid");
    amountInput.classList.remove("invalid");
    categoryInput.classList.remove("invalid");

    const name = itemNameInput.value.trim();
    const amountValue = amountInput.value.trim();
    const category = categoryInput.value;

    if (!name) {
      itemNameError.textContent = "Item name is required.";
      itemNameInput.classList.add("invalid");
      isValid = false;
    }

    if (!amountValue) {
      amountError.textContent = "Amount is required.";
      amountInput.classList.add("invalid");
      isValid = false;
    } else if (isNaN(amountValue) || parseFloat(amountValue) <= 0) {
      amountError.textContent = "Enter a valid amount greater than 0.";
      amountInput.classList.add("invalid");
      isValid = false;
    }

    if (!category) {
      categoryError.textContent = "Please select a category.";
      categoryInput.classList.add("invalid");
      isValid = false;
    }

    return isValid;
  }

  /* ---------- Transaction operations ---------- */
  function addTransaction(name, amount, category) {
    const transaction = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      name: name,
      amount: parseFloat(amount),
      category: category,
      createdAt: Date.now(),
    };
    transactions.push(transaction);
    saveTransactions();
    renderAll();
  }

  function deleteTransaction(id) {
    transactions = transactions.filter(function (t) {
      return t.id !== id;
    });
    saveTransactions();
    renderAll();
  }

  /* ---------- Sorting ---------- */
  function getSortedTransactions() {
    const list = transactions.slice();

    switch (currentSort) {
      case "amountDesc":
        list.sort(function (a, b) {
          return b.amount - a.amount;
        });
        break;
      case "amountAsc":
        list.sort(function (a, b) {
          return a.amount - b.amount;
        });
        break;
      case "category":
        list.sort(function (a, b) {
          return a.category.localeCompare(b.category);
        });
        break;
      case "newest":
      default:
        list.sort(function (a, b) {
          return b.createdAt - a.createdAt;
        });
        break;
    }

    return list;
  }

  /* ---------- Rendering: Transaction list ---------- */
  function renderTransactionList() {
    const sorted = getSortedTransactions();

    transactionListEl.innerHTML = "";

    if (sorted.length === 0) {
      const li = document.createElement("li");
      li.className = "empty-state";
      li.id = "emptyState";
      li.textContent = "No transactions yet. Add one above!";
      transactionListEl.appendChild(li);
      return;
    }

    sorted.forEach(function (t) {
      const li = document.createElement("li");
      li.className = "transaction-item";

      const info = document.createElement("div");
      info.className = "tx-info";

      const name = document.createElement("p");
      name.className = "tx-name";
      name.textContent = t.name;

      const amount = document.createElement("p");
      amount.className = "tx-amount";
      amount.textContent = formatCurrency(t.amount);

      const badge = document.createElement("span");
      badge.className = "tx-category-badge";
      badge.textContent = t.category;

      info.appendChild(name);
      info.appendChild(amount);
      info.appendChild(badge);

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-btn";
      deleteBtn.type = "button";
      deleteBtn.textContent = "Delete";
      deleteBtn.setAttribute("aria-label", "Delete " + t.name);
      deleteBtn.addEventListener("click", function () {
        deleteTransaction(t.id);
      });

      li.appendChild(info);
      li.appendChild(deleteBtn);
      transactionListEl.appendChild(li);
    });
  }

  /* ---------- Rendering: Balance + limit highlight ---------- */
  function renderBalance() {
    const total = transactions.reduce(function (sum, t) {
      return sum + t.amount;
    }, 0);

    balanceAmountEl.textContent = formatCurrency(total);

    const limit = loadLimit();
    if (limit !== null && !Number.isNaN(limit) && limit > 0 && total > limit) {
      balanceAmountEl.classList.add("over-limit");
      limitWarning.hidden = false;
    } else {
      balanceAmountEl.classList.remove("over-limit");
      limitWarning.hidden = true;
    }
  }

  /* ---------- Rendering: Pie chart ---------- */
  function renderChart() {
    const totalsByCategory = transactions.reduce(function (acc, t) {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

    const labels = Object.keys(totalsByCategory);
    const data = labels.map(function (label) {
      return totalsByCategory[label];
    });
    const colors = labels.map(function (label) {
      return CATEGORY_COLORS[label] || "#95a5a6";
    });

    if (labels.length === 0) {
      chartCanvas.style.display = "none";
      chartEmptyEl.style.display = "block";
      if (spendingChart) {
        spendingChart.destroy();
        spendingChart = null;
      }
      return;
    }

    chartCanvas.style.display = "block";
    chartEmptyEl.style.display = "none";

    if (spendingChart) {
      spendingChart.data.labels = labels;
      spendingChart.data.datasets[0].data = data;
      spendingChart.data.datasets[0].backgroundColor = colors;
      spendingChart.update();
      return;
    }

    spendingChart = new Chart(chartCanvas, {
      type: "pie",
      data: {
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: colors,
            borderColor: "#ffffff",
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: "bottom",
          },
        },
      },
    });
  }

  /* ---------- Master render ---------- */
  function renderAll() {
    renderBalance();
    renderTransactionList();
    renderChart();
  }

  /* ---------- Event listeners ---------- */
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    addTransaction(itemNameInput.value.trim(), amountInput.value.trim(), categoryInput.value);

    form.reset();
    itemNameInput.focus();
  });

  sortSelect.addEventListener("change", function () {
    currentSort = sortSelect.value;
    renderTransactionList();
  });

  limitInput.addEventListener("input", function () {
    const value = limitInput.value === "" ? null : parseFloat(limitInput.value);
    saveLimit(value);
    renderBalance();
  });

  /* ---------- Init ---------- */
  function init() {
    initTheme();

    const savedLimit = loadLimit();
    if (savedLimit !== null && !Number.isNaN(savedLimit)) {
      limitInput.value = savedLimit;
    }

    renderAll();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
