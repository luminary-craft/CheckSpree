/**
 * Converts a number to check-style text.
 * Example: 123.45 -> "One Hundred Twenty-Three and 45/100"
 */
export function numberToWords(amount) {
    if (!amount || isNaN(amount)) return "";

    const num = parseFloat(amount);
    const dollars = Math.floor(num);
    const cents = Math.round((num - dollars) * 100);

    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
    const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    function convertGroup(n) {
        let str = "";
        if (n >= 100) {
            str += ones[Math.floor(n / 100)] + " Hundred ";
            n %= 100;
        }
        if (n >= 20) {
            str += tens[Math.floor(n / 10)];
            if (n % 10 > 0) str += "-" + ones[n % 10];
        } else if (n >= 10) {
            str += teens[n - 10];
        } else if (n > 0) {
            str += ones[n];
        }
        return str.trim();
    }

    let words = "";

    if (dollars === 0) {
        words = "Zero";
    } else {
        const billions = Math.floor(dollars / 1000000000);
        const millions = Math.floor((dollars % 1000000000) / 1000000);
        const thousands = Math.floor((dollars % 1000000) / 1000);
        const remainingDollars = dollars % 1000;

        if (billions) words += convertGroup(billions) + " Billion ";
        if (millions) words += convertGroup(millions) + " Million ";
        if (thousands) words += convertGroup(thousands) + " Thousand ";
        if (remainingDollars) words += convertGroup(remainingDollars);
    }

    // Formatting "and XX/100"
    return `${words.trim()} and ${cents.toString().padStart(2, '0')}/100`;
}