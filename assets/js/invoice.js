// Invoice Generator using JSPDF / HTML2PDF CDN fallback or pure HTML print invoice
export function generatePDFInvoice(order) {
  const printWindow = window.open('', '_blank', 'width=800,height=900');

  const itemsHTML = order.items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.name} ${item.variant ? `(${item.variant})` : ''}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">৳${item.price}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">৳${item.price * item.quantity}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice - ${order.id}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }
        .invoice-box { max-width: 800px; margin: auto; border: 1px solid #eee; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.05); }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0B4D3C; padding-bottom: 10px; }
        .logo-title { color: #0B4D3C; margin: 0; font-size: 24px; font-weight: bold; }
        .tagline { color: #F5820A; font-size: 12px; font-weight: bold; }
        .meta { margin-top: 20px; display: flex; justify-content: space-between; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background-color: #0B4D3C; color: white; padding: 10px; text-align: left; font-size: 14px; }
        .totals { margin-top: 20px; text-align: right; font-size: 14px; }
        .totals p { margin: 4px 0; }
        .grand-total { font-size: 18px; font-weight: bold; color: #0B4D3C; }
        .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #777; border-top: 1px solid #eee; padding-top: 10px; }
        .btn-print { background-color: #0B4D3C; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 14px; margin-bottom: 20px; }
        @media print { .btn-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="invoice-box">
        <button class="btn-print" onclick="window.print()">Print / Download PDF</button>
        <div class="header">
          <div>
            <h1 class="logo-title">Bangla Bazar</h1>
            <span class="tagline">OFFER OFFER OFFER</span>
            <p style="font-size: 12px; color: #555; margin-top: 4px;">Kushtia, Bangladesh | Mobile: 01342697743</p>
          </div>
          <div style="text-align: right;">
            <h2 style="margin: 0; color: #333; font-size: 20px;">INVOICE</h2>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #555;">Order ID: <strong>#${order.id}</strong></p>
            <p style="margin: 2px 0 0 0; font-size: 12px; color: #555;">Date: ${new Date(order.createdAt?.seconds ? order.createdAt.seconds * 1000 : Date.now()).toLocaleDateString()}</p>
          </div>
        </div>

        <div class="meta">
          <div>
            <strong>Customer Details:</strong><br>
            Name: ${order.customerInfo?.name || 'Valued Customer'}<br>
            Phone: ${order.customerInfo?.phone || 'N/A'}<br>
            Email: ${order.customerInfo?.email || 'N/A'}
          </div>
          <div>
            <strong>Shipping Address:</strong><br>
            ${order.shippingAddress?.village || ''}<br>
            ${order.shippingAddress?.union ? order.shippingAddress.union + ', ' : ''}${order.shippingAddress?.thana || order.shippingAddress?.upazila || ''}<br>
            ${order.shippingAddress?.district || ''}, ${order.shippingAddress?.division || ''}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item Description</th>
              <th style="text-align: center;">Price</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>

        <div class="totals">
          <p>Subtotal: ৳${order.subtotal || order.totalAmount - (order.deliveryCharge || 0)}</p>
          <p>Delivery Charge (${order.shippingAddress?.district === 'Kushtia' ? 'Inside Kushtia' : 'Outside Kushtia'}): ৳${order.deliveryCharge || 0}</p>
          ${order.discountAmount ? `<p>Discount: -৳${order.discountAmount}</p>` : ''}
          <p class="grand-total">Grand Total: ৳${order.totalAmount}</p>
          <p style="font-size: 12px; color: #555; margin-top: 6px;">Payment Method: <strong>${order.paymentMethod?.toUpperCase()}</strong> (${order.paymentStatus || 'Pending'})</p>
          ${order.bKashTxnId ? `<p style="font-size: 12px; color: #555;">bKash TrxID: ${order.bKashTxnId}</p>` : ''}
        </div>

        <div class="footer">
          Thank you for shopping with Bangla Bazar! For support, call 01342697743 or email saripofficialsupport@gmail.com
        </div>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
