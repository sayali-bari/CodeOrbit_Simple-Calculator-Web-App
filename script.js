
// ==================== ELEMENTS ====================

const display = document.getElementById("display");
const expressionDisplay = document.getElementById("expression");
const message = document.getElementById("message");
const keypad = document.getElementById("keypad");
const historyList = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistory");
const themeToggle = document.getElementById("themeToggle");
const copyBtn = document.getElementById("copyBtn");
const toast = document.getElementById("toast");

let expression = "";
let justCalculated = false;
let history = [];
let toastTimer;

// ==================== DISPLAY ====================

function updateDisplay() {
    display.value = expression || "0";
}

function showMessage(text) {
    message.textContent = text;
}

function showToast(text) {
    toast.textContent = text;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2200);
}

function formatResult(number) {
    if (!Number.isFinite(number)) {
        throw new Error("Invalid calculation");
    }

    if (Object.is(number, -0)) {
        number = 0;
    }

    const rounded = Number(number.toPrecision(12));

    return String(rounded);
}

// ==================== INPUT HANDLING ====================

function appendValue(value) {
    const operators = ["+", "-", "*", "/"];

    if (justCalculated) {
        if (operators.includes(value)) {
            justCalculated = false;
        } else {
            expression = "";
            justCalculated = false;
        }
    }

    if (expression === "Error") {
        expression = "";
    }

    const lastChar = expression.slice(-1);

    if (operators.includes(value)) {
        if (!expression && value !== "-") {
            return;
        }

        if (operators.includes(lastChar)) {
            if (value === "-" && lastChar !== "-") {
                expression += value;
            } else {
                expression = expression.slice(0, -1) + value;
            }
        } else {
            expression += value;
        }
    } else if (value === ".") {
        const currentNumber = expression.split(/[+\-*/]/).pop();

        if (currentNumber.includes(".")) {
            return;
        }

        if (!currentNumber || operators.includes(lastChar)) {
            expression += "0.";
        } else {
            expression += ".";
        }
    } else {
        expression += value;
    }

    updateDisplay();
    showMessage("Ready for your next calculation");
}

function clearDisplay() {
    expression = "";
    justCalculated = false;

    expressionDisplay.textContent = "";
    updateDisplay();
    showMessage("Display cleared");
}

function deleteLast() {
    if (justCalculated || expression === "Error") {
        expression = "";
        justCalculated = false;
    } else {
        expression = expression.slice(0, -1);
    }

    updateDisplay();
    showMessage("Last character deleted");
}

function toggleSign() {
    if (justCalculated) {
        expression = expression ? String(-Number(expression)) : "";
        justCalculated = false;
    } else {
        const match = expression.match(/-?\d*\.?\d+$/);

        if (!match) {
            if (!expression || /[+*/-]$/.test(expression)) {
                expression += "-";
            }

            updateDisplay();
            return;
        }

        const number = match[0];
        const start = match.index;
        const before = expression.slice(0, start);

        if (
            number.startsWith("-") &&
            (!before || /[+*/-]$/.test(before))
        ) {
            expression =
                before + number.slice(1);
        } else if (
            number.startsWith("-")
        ) {
            expression =
                before + number.slice(1);
        } else {
            expression =
                before + "-" + number;
        }
    }

    updateDisplay();
}

// ==================== PERCENTAGE ====================

function appendPercent() {
    if (justCalculated) {
        expression = expression ? expression + "%" : "";
        justCalculated = false;
    } else if (/\d$/.test(expression)) {
        expression += "%";
    }

    updateDisplay();
}

// ==================== SAFE EXPRESSION PARSER ====================

// Supports +, -, *, /, unary signs, decimals, and percentages.

function evaluateExpression(input) {
    const tokens = input.replace(/\s+/g, "");

    if (!tokens) {
        throw new Error("Enter a calculation");
    }

    let position = 0;

    function parseExpression() {
        let result = parseTerm();

        while (position < tokens.length) {
            const operator = tokens[position];

            if (operator !== "+" && operator !== "-") {
                break;
            }

            position++;

            const right = parseTerm();

            if (operator === "+") {
                result += right;
            } else {
                result -= right;
            }
        }

        return result;
    }

    function parseTerm() {
        let result = parseUnary();

        while (position < tokens.length) {
            const operator = tokens[position];

            if (operator !== "*" && operator !== "/") {
                break;
            }

            position++;

            const right = parseUnary();

            if (operator === "*") {
                result *= right;
            } else {
                if (right === 0) {
                    throw new Error("Cannot divide by zero");
                }

                result /= right;
            }
        }

        return result;
    }

    function parseUnary() {
        if (tokens[position] === "+") {
            position++;
            return parseUnary();
        }

        if (tokens[position] === "-") {
            position++;
            return -parseUnary();
        }

        return parseNumber();
    }

    function parseNumber() {
        const start = position;
        let decimalCount = 0;
        let digitCount = 0;

        while (position < tokens.length) {
            const char = tokens[position];

            if (char >= "0" && char <= "9") {
                digitCount++;
                position++;
            } else if (char === ".") {
                decimalCount++;
                position++;

                if (decimalCount > 1) {
                    throw new Error("Invalid number");
                }
            } else {
                break;
            }
        }

        if (digitCount === 0) {
            throw new Error("Invalid expression");
        }

        let number = Number(tokens.slice(start, position));

        while (tokens[position] === "%") {
            number /= 100;
            position++;
        }

        return number;
    }

    const result = parseExpression();

    if (position !== tokens.length) {
        throw new Error("Invalid expression");
    }

    if (!Number.isFinite(result)) {
        throw new Error("Result is too large");
    }

    return result;
}

// ==================== CALCULATE RESULT ====================

function calculateResult() {
    if (!expression || expression === "Error") {
        showMessage("Enter a calculation first");
        return;
    }

    const originalExpression = expression;

    try {
        const result = evaluateExpression(expression);
        const formattedResult = formatResult(result);

        addToHistory(originalExpression, formattedResult);

        expressionDisplay.textContent =
            originalExpression + " =";

        expression = formattedResult;
        justCalculated = true;

        updateDisplay();
        showMessage("Calculation completed successfully");

        display.classList.remove("result-flash");
        void display.offsetWidth;
        display.classList.add("result-flash");

    } catch (error) {
        showMessage(error.message || "Invalid calculation");
        showToast(error.message || "Invalid calculation");
    }
}

// ==================== CALCULATION HISTORY ====================

function addToHistory(originalExpression, result) {
    history.unshift({
        expression: originalExpression,
        result: result
    });

    // Keep only the latest 10 calculations.
    history = history.slice(0, 10);

    renderHistory();
}

function renderHistory() {
    historyList.innerHTML = "";

    if (history.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-history";

        const icon = document.createElement("span");
        icon.className = "history-icon";
        icon.textContent = "↗";

        const title = document.createElement("p");
        title.textContent = "No calculations yet";

        const description = document.createElement("span");
        description.textContent = "Your results will appear here.";

        empty.append(icon, title, description);
        historyList.appendChild(empty);
        return;
    }

    history.forEach((item) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "history-item";

        const oldExpression = document.createElement("span");
        oldExpression.className = "history-expression";
        oldExpression.textContent = item.expression + " =";

        const oldResult = document.createElement("span");
        oldResult.className = "history-result";
        oldResult.textContent = item.result;

        button.append(oldExpression, oldResult);

        button.addEventListener("click", () => {
            expression = item.result;
            justCalculated = true;

            expressionDisplay.textContent =
                item.expression + " =";

            updateDisplay();
            showMessage("Previous result selected");
        });

        historyList.appendChild(button);
    });
}

clearHistoryBtn.addEventListener("click", () => {
    history = [];
    renderHistory();
    showToast("History cleared");
});

// ==================== BUTTON EVENTS ====================

keypad.addEventListener("click", (event) => {
    const button = event.target.closest("button");

    if (!button) {
        return;
    }

    if (button.dataset.value !== undefined) {
        appendValue(button.dataset.value);
        return;
    }

    switch (button.dataset.action) {
        case "clear":
            clearDisplay();
            break;

        case "delete":
            deleteLast();
            break;

        case "calculate":
            calculateResult();
            break;

        case "decimal":
            appendValue(".");
            break;

        case "percent":
            appendPercent();
            break;

        case "sign":
            toggleSign();
            break;
    }
});

// ==================== KEYBOARD SUPPORT ====================

document.addEventListener("keydown", (event) => {
    if (/^[0-9]$/.test(event.key)) {
        appendValue(event.key);
    } else if (["+", "-", "*", "/"].includes(event.key)) {
        appendValue(event.key);
    } else if (event.key === ".") {
        appendValue(".");
    } else if (event.key === "%") {
        appendPercent();
    } else if (event.key === "Enter" || event.key === "=") {
        event.preventDefault();
        calculateResult();
    } else if (event.key === "Backspace") {
        deleteLast();
    } else if (event.key === "Escape" || event.key === "Delete") {
        clearDisplay();
    }
});

// ==================== COPY RESULT ====================

copyBtn.addEventListener("click", async () => {
    const value = display.value;

    if (!value || value === "0" || value === "Error") {
        showToast("No result to copy");
        return;
    }

    try {
        await navigator.clipboard.writeText(value);
        showToast("Result copied!");
    } catch {
        // Fallback for browsers where Clipboard API is unavailable.
        const temporaryInput = document.createElement("textarea");
        temporaryInput.value = value;
        temporaryInput.style.position = "fixed";
        temporaryInput.style.opacity = "0";

        document.body.appendChild(temporaryInput);
        temporaryInput.select();

        const copied = document.execCommand("copy");
        temporaryInput.remove();

        showToast(copied ? "Result copied!" : "Unable to copy result");
    }
});

// ==================== THEME TOGGLE ====================

themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("light-theme");

    const lightMode =
        document.body.classList.contains("light-theme");

    themeToggle.textContent = lightMode ? "☾" : "☼";
    themeToggle.title = lightMode
        ? "Switch to dark theme"
        : "Switch to light theme";

    showToast(lightMode ? "Light theme enabled" : "Dark theme enabled");
});

// ==================== YEAR ====================

document.getElementById("year").textContent =
    new Date().getFullYear();

// ==================== STARTUP ====================

updateDisplay();
renderHistory();
