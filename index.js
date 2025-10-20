
        // Global utility to format numbers as currency (USD for simplicity)
        const formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        });

        // --- Line Item Management Functions ---

        /**
         * Calculates the total for a single line item (Quantity * Price) and updates the UI.
         * @param {HTMLInputElement} element - The input element (quantity or price) that changed.
         * Also triggers a full invoice generation after calculation.
         */
        function calculateItemTotal(element) {
            const row = element.closest('.item-row');
            if (!row) return;

            // Ensure we handle non-numeric inputs gracefully
            const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
            const price = parseFloat(row.querySelector('.item-price').value) || 0;
            const total = quantity * price;

            row.querySelector('.total-cell').textContent = formatter.format(total);
            
            // Auto-update the invoice preview after changing item totals
            generateInvoice(); 
        }

        /**
         * Adds a new, empty line item row to the table.
         */
        function addItemRow() {
            const body = document.getElementById('line-items-body');
            const newRow = document.createElement('tr');
            newRow.className = 'item-row';
            newRow.innerHTML = `
                <td class="p-1"><input type="text" value="" placeholder="Description" class="item-description w-full p-1 border border-gray-200 rounded-md"></td>
                <td class="p-1"><input type="number" min="1" value="1" class="item-quantity w-full p-1 border border-gray-200 rounded-md" oninput="calculateItemTotal(this)"></td>
                <td class="p-1"><input type="number" min="0.01" value="0.00" step="0.01" class="item-price w-full p-1 border border-gray-200 rounded-md" oninput="calculateItemTotal(this)"></td>
                <td class="p-1 text-right font-medium total-cell">${formatter.format(0.00)}</td>
                <td class="p-1 text-center"><button onclick="removeItem(this)" class="text-red-500 hover:text-red-700 font-bold text-lg leading-none">&times;</button></td>
            `;
            body.appendChild(newRow);
            // Calculate total for the new row and generate invoice
            calculateItemTotal(newRow.querySelector('.item-quantity'));
        }

        /**
         * Removes a line item row from the table and regenerates the invoice.
         * @param {HTMLButtonElement} button - The remove button clicked.
         */
        function removeItem(button) {
            const row = button.closest('.item-row');
            if (document.querySelectorAll('.item-row').length > 1) {
                row.remove();
                generateInvoice(); // Regenerate invoice after removal
            } else {
                console.error("Cannot remove the last line item.");
            }
        }

        // --- Invoice Generation Logic ---

        /**
         * Collects all form data and generates the HTML structure for the invoice preview.
         */
        function generateInvoice() {
            // 1. Collect Header Data
            const businessName = document.getElementById('business-name').value || 'Your Business Name';
            const clientName = document.getElementById('client-name').value || 'Client Name';
            const invoiceNumber = document.getElementById('invoice-number').value || 'N/A';
            const invoiceDate = document.getElementById('invoice-date').value || new Date().toISOString().substring(0, 10);
            const logoUrl = document.getElementById('logo-url').value;
            const notes = document.getElementById('payment-notes').value;

            // 2. Collect Line Item Data & Calculate Subtotal
            let subtotal = 0;
            const items = [];
            document.querySelectorAll('.item-row').forEach(row => {
                const description = row.querySelector('.item-description').value;
                // Use the calculated total from the display cell, which is more reliable
                // after calculateItemTotal has run, but for robustness, recalculate here.
                const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
                const price = parseFloat(row.querySelector('.item-price').value) || 0;
                const total = quantity * price;

                if (description && (quantity > 0 || price > 0 || description)) {
                    items.push({ description, quantity, price, total });
                    subtotal += total;
                }
            });

            // 3. Collect Calculation Data
            const taxRate = parseFloat(document.getElementById('tax-rate').value) || 0;
            const discountAmount = parseFloat(document.getElementById('discount-amount').value) || 0;

            // 4. Calculate Final Totals (rounded to two decimal places)
            const taxAmount = (subtotal * (taxRate / 100)).toFixed(2);
            const totalDue = (subtotal + parseFloat(taxAmount) - discountAmount).toFixed(2);

            // 5. Build Invoice Header HTML
            const logoHtml = logoUrl 
                ? `<img src="${logoUrl}" alt="Company Logo" class="h-16 w-auto object-contain" onerror="this.onerror=null; this.src='https://placehold.co/150x50/3730a3/ffffff?text=LOGO'">` 
                : `<div class="text-3xl font-bold text-indigo-700">${businessName}</div>`;

            let invoiceHtml = `
                <!-- Header Section -->
                <div class="flex justify-between items-start pb-6 border-b border-gray-200">
                    <div class="max-w-[150px]">
                        ${logoHtml}
                    </div>
                    <div class="text-right">
                        <h1 class="text-3xl font-extrabold text-gray-900 mb-2">INVOICE</h1>
                        <p class="text-sm text-gray-500">Invoice \#<span class="font-semibold text-gray-700">${invoiceNumber}</span></p>
                        <p class="text-sm text-gray-500">Date: <span class="font-semibold text-gray-700">${invoiceDate}</span></p>
                    </div>
                </div>

                <!-- Billing Information -->
                <div class="grid grid-cols-2 gap-4 py-6 text-sm">
                    <div>
                        <p class="font-bold text-gray-700 uppercase mb-1">Billed From:</p>
                        <p class="text-gray-600">${businessName}</p>
                        <!-- Add business address/contact if desired -->
                    </div>
                    <div class="text-right">
                        <p class="font-bold text-gray-700 uppercase mb-1">Billed To:</p>
                        <p class="text-gray-600">${clientName}</p>
                        <!-- Add client address/contact if desired -->
                    </div>
                </div>

                <!-- Items Table -->
                <div class="mt-4">
                    <table class="w-full text-left text-sm">
                        <thead>
                            <tr class="bg-indigo-700 text-white uppercase text-xs">
                                <th class="py-3 px-4 w-1/2 rounded-tl-lg">Description</th>
                                <th class="py-3 px-4 text-center">Qty</th>
                                <th class="py-3 px-4 text-right">Price</th>
                                <th class="py-3 px-4 text-right rounded-tr-lg">Total</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200 text-gray-700">
            `;

            // 6. Build Item Rows HTML
            items.forEach(item => {
                invoiceHtml += `
                    <tr>
                        <td class="py-2 px-4">${item.description}</td>
                        <td class="py-2 px-4 text-center">${item.quantity}</td>
                        <td class="py-2 px-4 text-right">${formatter.format(item.price)}</td>
                        <td class="py-2 px-4 text-right">${formatter.format(item.total)}</td>
                    </tr>
                `;
            });

            invoiceHtml += `
                        </tbody>
                    </table>
                </div>

                <!-- Summary and Notes -->
                <div class="mt-6 flex justify-end">
                    <div class="w-full md:w-1/2 lg:w-2/3">
                        <div class="grid grid-cols-2 gap-2 text-sm">
                            <div class="text-left py-1 text-gray-600 font-medium">Subtotal:</div>
                            <div class="text-right py-1 font-semibold text-gray-800">${formatter.format(subtotal)}</div>

                            <div class="text-left py-1 text-gray-600 font-medium">Tax (${taxRate}%):</div>
                            <div class="text-right py-1 font-semibold text-gray-800">${formatter.format(taxAmount)}</div>

                            <div class="text-left py-1 text-gray-600 font-medium">Discount:</div>
                            <div class="text-right py-1 font-semibold text-red-500">- ${formatter.format(discountAmount)}</div>
                            
                            <!-- Total Due Row -->
                            <div class="col-span-2 border-t border-gray-300 mt-2"></div>
                            <div class="text-left py-2 text-lg font-extrabold text-indigo-700">TOTAL DUE:</div>
                            <div class="text-right py-2 text-lg font-extrabold text-indigo-700">${formatter.format(totalDue)}</div>
                        </div>

                        <!-- Payment Terms/Notes -->
                        <div class="mt-8 pt-4 border-t border-gray-200">
                            <p class="font-bold text-gray-700 uppercase text-xs mb-1">Notes / Terms:</p>
                            <p class="text-xs text-gray-500">${notes}</p>
                        </div>
                    </div>
                </div>
            `;

            // 7. Update the Preview
            document.getElementById('invoice-template').innerHTML = invoiceHtml;
            document.getElementById('download-btn').disabled = false;
        }

        // --- PDF Generation Logic ---

        /**
         * Downloads the current invoice preview as a PDF file.
         */
        async function downloadPdf() {
            document.getElementById('download-btn').textContent = 'Generating PDF...';
            document.getElementById('download-btn').disabled = true;

            const invoiceElement = document.getElementById('invoice-template');
            // FIX: Correctly access the jsPDF constructor from the UMD bundle
            // It is typically exposed as window.jspdf.jsPDF for version 2.x
            const pdfjs = window.jspdf.jsPDF; 

            // Use html2canvas to render the invoice element to a canvas
            const canvas = await html2canvas(invoiceElement, {
                scale: 2, // Higher scale for better resolution
                useCORS: true, // Required if using external images (like the logo URL)
                logging: false,
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new pdfjs('p', 'mm', 'a4'); // 'p' for portrait, 'mm' for units, 'a4' size
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgHeight = canvas.height * pdfWidth / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;

            // Add the image to the PDF
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;

            // Handle multi-page content (for very long invoices)
            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;
            }

            const invoiceNumber = document.getElementById('invoice-number').value || 'Invoice';
            pdf.save(`${invoiceNumber}.pdf`);

            document.getElementById('download-btn').textContent = 'Download Invoice as PDF';
            document.getElementById('download-btn').disabled = false;
        }


        // --- Initial Setup ---

        // Attach listeners to recalculate on input changes for instant feedback
        document.addEventListener('DOMContentLoaded', () => {
            // Initial calculation for the default rows
            document.querySelectorAll('.item-row').forEach(row => {
                calculateItemTotal(row.querySelector('.item-quantity'));
            });

            // Elements that should trigger an immediate preview update when their value changes.
            const updateElements = [
                document.getElementById('tax-rate'),
                document.getElementById('discount-amount'),
                document.getElementById('business-name'),
                document.getElementById('client-name'),
                document.getElementById('invoice-number'),
                document.getElementById('invoice-date'),
                document.getElementById('logo-url'),
                document.getElementById('payment-notes'),
            ];

            updateElements.forEach(element => {
                if (element) {
                    // Use 'input' for text/number/date fields for live updates
                    element.addEventListener('input', generateInvoice);
                }
            });
            
            // Generate the invoice on load to populate the preview
            generateInvoice();
        });
    
