import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import { Plus, Trash2, Save, Download, Mail, FileText, User, Building2, Calendar, DollarSign } from 'lucide-react';
import axios from 'axios';
import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

if (pdfFonts && pdfFonts.pdfMake && pdfFonts.pdfMake.vfs) {
  pdfMake.vfs = pdfFonts.pdfMake.vfs;
}

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
];

const InvoiceGenerator = () => {
  const [invoiceData, setInvoiceData] = useState({
    brandName: '',
    brandEmail: '',
    brandPhone: '',
    brandAddress: '',
    brandLogo: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientAddress: '',
    invoiceNumber: `INV-${Date.now()}`,
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [{ name: '', description: '', quantity: 1, unitPrice: 0 }],
    taxRate: 0,
    discount: 0,
    shipping: 0,
    currency: 'USD',
    notes: ''
  });

  const [savedClients, setSavedClients] = useState([]);
  const [savedInvoices, setSavedInvoices] = useState([]);
  const [showClientDialog, setShowClientDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    loadFromLocalStorage();
  }, []);

  const loadFromLocalStorage = () => {
    const clients = localStorage.getItem('invoiceClients');
    const invoices = localStorage.getItem('invoiceHistory');
    if (clients) setSavedClients(JSON.parse(clients));
    if (invoices) setSavedInvoices(JSON.parse(invoices));
  };

  const handleInputChange = (field, value) => {
    setInvoiceData(prev => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...invoiceData.items];
    newItems[index][field] = value;
    setInvoiceData(prev => ({ ...prev, items: newItems }));
  };

  const addItem = () => {
    setInvoiceData(prev => ({
      ...prev,
      items: [...prev.items, { name: '', description: '', quantity: 1, unitPrice: 0 }]
    }));
  };

  const removeItem = (index) => {
    if (invoiceData.items.length > 1) {
      setInvoiceData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleInputChange('brandLogo', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const calculateSubtotal = () => {
    return invoiceData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const calculateTax = () => {
    return (calculateSubtotal() * invoiceData.taxRate) / 100;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTax();
    return subtotal + tax - invoiceData.discount + invoiceData.shipping;
  };

  const getCurrencySymbol = () => {
    return CURRENCIES.find(c => c.code === invoiceData.currency)?.symbol || '$';
  };

  const saveClient = () => {
    const client = {
      id: Date.now(),
      name: invoiceData.clientName,
      email: invoiceData.clientEmail,
      phone: invoiceData.clientPhone,
      address: invoiceData.clientAddress
    };
    const updatedClients = [...savedClients, client];
    setSavedClients(updatedClients);
    localStorage.setItem('invoiceClients', JSON.stringify(updatedClients));
    toast.success('Client saved successfully!');
  };

  const loadClient = (client) => {
    setInvoiceData(prev => ({
      ...prev,
      clientName: client.name,
      clientEmail: client.email,
      clientPhone: client.phone,
      clientAddress: client.address
    }));
    setShowClientDialog(false);
    toast.success('Client loaded!');
  };

  const deleteClient = (id) => {
    const updatedClients = savedClients.filter(c => c.id !== id);
    setSavedClients(updatedClients);
    localStorage.setItem('invoiceClients', JSON.stringify(updatedClients));
    toast.success('Client deleted!');
  };

  const saveInvoice = () => {
    const invoice = {
      id: Date.now(),
      ...invoiceData,
      total: calculateTotal(),
      savedAt: new Date().toISOString()
    };
    const updatedInvoices = [invoice, ...savedInvoices];
    setSavedInvoices(updatedInvoices);
    localStorage.setItem('invoiceHistory', JSON.stringify(updatedInvoices));
    toast.success('Invoice saved!');
  };

  const loadInvoice = (invoice) => {
    setInvoiceData(invoice);
    setShowHistoryDialog(false);
    toast.success('Invoice loaded!');
  };

  const deleteInvoice = (id) => {
    const updatedInvoices = savedInvoices.filter(inv => inv.id !== id);
    setSavedInvoices(updatedInvoices);
    localStorage.setItem('invoiceHistory', JSON.stringify(updatedInvoices));
    toast.success('Invoice deleted!');
  };

  const generatePDF = () => {
    const currencySymbol = getCurrencySymbol();
    const subtotal = calculateSubtotal();
    const tax = calculateTax();
    const total = calculateTotal();

    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [40, 80, 40, 60],
      header: function(currentPage, pageCount) {
        return {
          columns: [
            {
              width: '*',
              text: invoiceData.brandName || 'Your Brand',
              style: 'headerBrand',
              margin: [40, 30, 0, 0]
            },
            {
              width: 'auto',
              text: 'INVOICE',
              style: 'headerInvoice',
              margin: [0, 30, 40, 0]
            }
          ]
        };
      },
      content: [
        {
          columns: [
            {
              width: '50%',
              stack: [
                { text: 'From:', style: 'sectionHeader', margin: [0, 0, 0, 8] },
                { text: invoiceData.brandName || 'Brand Name', bold: true, fontSize: 11, margin: [0, 0, 0, 4] },
                { text: invoiceData.brandEmail || '', fontSize: 9, color: '#666', margin: [0, 0, 0, 2] },
                { text: invoiceData.brandPhone || '', fontSize: 9, color: '#666', margin: [0, 0, 0, 2] },
                { text: invoiceData.brandAddress || '', fontSize: 9, color: '#666', margin: [0, 0, 0, 2] }
              ]
            },
            {
              width: '50%',
              stack: [
                { text: 'Bill To:', style: 'sectionHeader', margin: [0, 0, 0, 8] },
                { text: invoiceData.clientName || 'Client Name', bold: true, fontSize: 11, margin: [0, 0, 0, 4] },
                { text: invoiceData.clientEmail || '', fontSize: 9, color: '#666', margin: [0, 0, 0, 2] },
                { text: invoiceData.clientPhone || '', fontSize: 9, color: '#666', margin: [0, 0, 0, 2] },
                { text: invoiceData.clientAddress || '', fontSize: 9, color: '#666', margin: [0, 0, 0, 2] }
              ]
            }
          ],
          margin: [0, 0, 0, 20]
        },
        {
          columns: [
            {
              width: '33%',
              stack: [
                { text: 'Invoice Number', fontSize: 9, color: '#666', margin: [0, 0, 0, 4] },
                { text: invoiceData.invoiceNumber, bold: true, fontSize: 10 }
              ]
            },
            {
              width: '33%',
              stack: [
                { text: 'Invoice Date', fontSize: 9, color: '#666', margin: [0, 0, 0, 4] },
                { text: invoiceData.invoiceDate, fontSize: 10 }
              ]
            },
            {
              width: '34%',
              stack: [
                { text: 'Due Date', fontSize: 9, color: '#666', margin: [0, 0, 0, 4] },
                { text: invoiceData.dueDate, fontSize: 10 }
              ]
            }
          ],
          margin: [0, 0, 0, 30]
        },
        {
          table: {
            headerRows: 1,
            widths: ['*', '30%', '15%', '15%', '20%'],
            body: [
              [
                { text: 'Item', style: 'tableHeader' },
                { text: 'Description', style: 'tableHeader' },
                { text: 'Qty', style: 'tableHeader', alignment: 'center' },
                { text: 'Price', style: 'tableHeader', alignment: 'right' },
                { text: 'Amount', style: 'tableHeader', alignment: 'right' }
              ],
              ...invoiceData.items.map(item => [
                { text: item.name || '-', fontSize: 9, margin: [0, 5, 0, 5] },
                { text: item.description || '-', fontSize: 9, color: '#666', margin: [0, 5, 0, 5] },
                { text: item.quantity.toString(), fontSize: 9, alignment: 'center', margin: [0, 5, 0, 5] },
                { text: `${currencySymbol}${item.unitPrice.toFixed(2)}`, fontSize: 9, alignment: 'right', margin: [0, 5, 0, 5] },
                { text: `${currencySymbol}${(item.quantity * item.unitPrice).toFixed(2)}`, fontSize: 9, alignment: 'right', margin: [0, 5, 0, 5] }
              ])
            ]
          },
          layout: {
            fillColor: function (rowIndex) {
              return rowIndex === 0 ? '#4a5568' : (rowIndex % 2 === 0 ? '#f7fafc' : null);
            },
            hLineWidth: function (i, node) {
              return (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5;
            },
            vLineWidth: function () {
              return 0;
            },
            hLineColor: function (i) {
              return i === 1 ? '#4a5568' : '#e2e8f0';
            }
          },
          margin: [0, 0, 0, 20]
        },
        {
          columns: [
            {
              width: '60%',
              stack: invoiceData.notes ? [
                { text: 'Notes:', fontSize: 9, color: '#666', margin: [0, 0, 0, 4] },
                { text: invoiceData.notes, fontSize: 9, color: '#333' }
              ] : []
            },
            {
              width: '40%',
              stack: [
                {
                  columns: [
                    { text: 'Subtotal:', fontSize: 10, color: '#666' },
                    { text: `${currencySymbol}${subtotal.toFixed(2)}`, fontSize: 10, alignment: 'right' }
                  ],
                  margin: [0, 0, 0, 8]
                },
                ...(invoiceData.taxRate > 0 ? [{
                  columns: [
                    { text: `Tax (${invoiceData.taxRate}%):`, fontSize: 10, color: '#666' },
                    { text: `${currencySymbol}${tax.toFixed(2)}`, fontSize: 10, alignment: 'right' }
                  ],
                  margin: [0, 0, 0, 8]
                }] : []),
                ...(invoiceData.discount > 0 ? [{
                  columns: [
                    { text: 'Discount:', fontSize: 10, color: '#666' },
                    { text: `-${currencySymbol}${invoiceData.discount.toFixed(2)}`, fontSize: 10, alignment: 'right' }
                  ],
                  margin: [0, 0, 0, 8]
                }] : []),
                ...(invoiceData.shipping > 0 ? [{
                  columns: [
                    { text: 'Shipping:', fontSize: 10, color: '#666' },
                    { text: `${currencySymbol}${invoiceData.shipping.toFixed(2)}`, fontSize: 10, alignment: 'right' }
                  ],
                  margin: [0, 0, 0, 8]
                }] : []),
                {
                  canvas: [
                    {
                      type: 'line',
                      x1: 0, y1: 5,
                      x2: 200, y2: 5,
                      lineWidth: 1,
                      lineColor: '#cbd5e0'
                    }
                  ],
                  margin: [0, 0, 0, 8]
                },
                {
                  columns: [
                    { text: 'Total:', fontSize: 12, bold: true },
                    { text: `${currencySymbol}${total.toFixed(2)}`, fontSize: 12, bold: true, alignment: 'right' }
                  ]
                }
              ]
            }
          ]
        }
      ],
      styles: {
        headerBrand: {
          fontSize: 20,
          bold: true,
          color: '#2d3748'
        },
        headerInvoice: {
          fontSize: 28,
          bold: true,
          color: '#4299e1'
        },
        sectionHeader: {
          fontSize: 10,
          bold: true,
          color: '#4a5568',
          decoration: 'underline'
        },
        tableHeader: {
          fontSize: 10,
          bold: true,
          color: '#ffffff',
          fillColor: '#4a5568',
          margin: [0, 5, 0, 5]
        }
      },
      footer: function(currentPage, pageCount) {
        return {
          text: `Page ${currentPage} of ${pageCount}`,
          alignment: 'center',
          fontSize: 8,
          color: '#999',
          margin: [0, 20, 0, 0]
        };
      }
    };

    return pdfMake.createPdf(docDefinition);
  };

  const downloadPDF = () => {
    const pdf = generatePDF();
    pdf.download(`${invoiceData.invoiceNumber}.pdf`);
    toast.success('Invoice downloaded!');
  };

  const printPDF = () => {
    const pdf = generatePDF();
    pdf.print();
  };

  const sendEmail = async () => {
    if (!recipientEmail) {
      toast.error('Please enter recipient email');
      return;
    }

    setIsSending(true);
    try {
      const pdf = generatePDF();
      
      pdf.getBase64((data) => {
        axios.post(`${API}/send-invoice-email`, {
          to_email: recipientEmail,
          subject: `Invoice ${invoiceData.invoiceNumber} from ${invoiceData.brandName}`,
          body: `Dear ${invoiceData.clientName},\n\nPlease find attached invoice ${invoiceData.invoiceNumber}.\n\nTotal Amount: ${getCurrencySymbol()}${calculateTotal().toFixed(2)}\nDue Date: ${invoiceData.dueDate}\n\nThank you for your business!\n\nBest regards,\n${invoiceData.brandName}`,
          pdf_base64: data,
          filename: `${invoiceData.invoiceNumber}.pdf`
        })
        .then(() => {
          toast.success('Invoice sent successfully!');
          setShowEmailDialog(false);
          setRecipientEmail('');
        })
        .catch((error) => {
          toast.error(error.response?.data?.detail || 'Failed to send email');
        })
        .finally(() => {
          setIsSending(false);
        });
      });
    } catch (error) {
      toast.error('Error generating PDF');
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8" data-testid="invoice-generator">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-800 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }} data-testid="page-title">
            Brand Invoice Generator
          </h1>
          <p className="text-gray-600" data-testid="page-subtitle">Create professional invoices in minutes</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Left Column - Form */}
          <div className="space-y-6">
            {/* Brand Details */}
            <Card data-testid="brand-details-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Brand Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="brandName">Brand Name *</Label>
                  <Input
                    id="brandName"
                    data-testid="brand-name-input"
                    value={invoiceData.brandName}
                    onChange={(e) => handleInputChange('brandName', e.target.value)}
                    placeholder="Your Business Name"
                  />
                </div>
                <div>
                  <Label htmlFor="brandLogo">Brand Logo</Label>
                  <Input
                    id="brandLogo"
                    data-testid="brand-logo-input"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                  />
                  {invoiceData.brandLogo && (
                    <img src={invoiceData.brandLogo} alt="Logo preview" className="mt-2 h-16 w-auto" data-testid="brand-logo-preview" />
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="brandEmail">Email</Label>
                    <Input
                      id="brandEmail"
                      data-testid="brand-email-input"
                      type="email"
                      value={invoiceData.brandEmail}
                      onChange={(e) => handleInputChange('brandEmail', e.target.value)}
                      placeholder="contact@brand.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="brandPhone">Phone</Label>
                    <Input
                      id="brandPhone"
                      data-testid="brand-phone-input"
                      value={invoiceData.brandPhone}
                      onChange={(e) => handleInputChange('brandPhone', e.target.value)}
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="brandAddress">Address</Label>
                  <Input
                    id="brandAddress"
                    data-testid="brand-address-input"
                    value={invoiceData.brandAddress}
                    onChange={(e) => handleInputChange('brandAddress', e.target.value)}
                    placeholder="123 Business St, City, Country"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Client Details */}
            <Card data-testid="client-details-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Client Details
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={saveClient}
                      disabled={!invoiceData.clientName}
                      data-testid="save-client-button"
                    >
                      <Save className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                    <Dialog open={showClientDialog} onOpenChange={setShowClientDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" data-testid="load-client-button">
                          Load
                        </Button>
                      </DialogTrigger>
                      <DialogContent data-testid="client-dialog">
                        <DialogHeader>
                          <DialogTitle>Saved Clients</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {savedClients.length === 0 ? (
                            <p className="text-gray-500 text-center py-4" data-testid="no-clients-message">No saved clients</p>
                          ) : (
                            savedClients.map(client => (
                              <div key={client.id} className="flex items-center justify-between p-3 border rounded" data-testid={`client-item-${client.id}`}>
                                <div className="flex-1">
                                  <p className="font-medium">{client.name}</p>
                                  <p className="text-sm text-gray-500">{client.email}</p>
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => loadClient(client)} data-testid={`load-client-${client.id}`}>Load</Button>
                                  <Button size="sm" variant="destructive" onClick={() => deleteClient(client.id)} data-testid={`delete-client-${client.id}`}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="clientName">Client Name *</Label>
                  <Input
                    id="clientName"
                    data-testid="client-name-input"
                    value={invoiceData.clientName}
                    onChange={(e) => handleInputChange('clientName', e.target.value)}
                    placeholder="Client Name"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="clientEmail">Email</Label>
                    <Input
                      id="clientEmail"
                      data-testid="client-email-input"
                      type="email"
                      value={invoiceData.clientEmail}
                      onChange={(e) => handleInputChange('clientEmail', e.target.value)}
                      placeholder="client@email.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientPhone">Phone</Label>
                    <Input
                      id="clientPhone"
                      data-testid="client-phone-input"
                      value={invoiceData.clientPhone}
                      onChange={(e) => handleInputChange('clientPhone', e.target.value)}
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="clientAddress">Address</Label>
                  <Input
                    id="clientAddress"
                    data-testid="client-address-input"
                    value={invoiceData.clientAddress}
                    onChange={(e) => handleInputChange('clientAddress', e.target.value)}
                    placeholder="Client Address"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Invoice Details */}
            <Card data-testid="invoice-details-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Invoice Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="invoiceNumber">Invoice Number *</Label>
                    <Input
                      id="invoiceNumber"
                      data-testid="invoice-number-input"
                      value={invoiceData.invoiceNumber}
                      onChange={(e) => handleInputChange('invoiceNumber', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={invoiceData.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                      <SelectTrigger data-testid="currency-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map(curr => (
                          <SelectItem key={curr.code} value={curr.code} data-testid={`currency-option-${curr.code}`}>
                            {curr.symbol} {curr.code} - {curr.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="invoiceDate">Invoice Date</Label>
                    <Input
                      id="invoiceDate"
                      data-testid="invoice-date-input"
                      type="date"
                      value={invoiceData.invoiceDate}
                      onChange={(e) => handleInputChange('invoiceDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      data-testid="due-date-input"
                      type="date"
                      value={invoiceData.dueDate}
                      onChange={(e) => handleInputChange('dueDate', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items */}
            <Card data-testid="items-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Items / Services</span>
                  <Button onClick={addItem} size="sm" data-testid="add-item-button">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Item
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {invoiceData.items.map((item, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3" data-testid={`item-${index}`}>
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Item {index + 1}</h4>
                      {invoiceData.items.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          data-testid={`remove-item-${index}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label>Item Name *</Label>
                        <Input
                          data-testid={`item-name-${index}`}
                          value={item.name}
                          onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                          placeholder="Item name"
                        />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Input
                          data-testid={`item-description-${index}`}
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          placeholder="Description"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label>Quantity</Label>
                        <Input
                          data-testid={`item-quantity-${index}`}
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 1)}
                        />
                      </div>
                      <div>
                        <Label>Unit Price</Label>
                        <Input
                          data-testid={`item-price-${index}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label>Total</Label>
                        <Input
                          data-testid={`item-total-${index}`}
                          value={`${getCurrencySymbol()}${(item.quantity * item.unitPrice).toFixed(2)}`}
                          disabled
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Additional Charges */}
            <Card data-testid="additional-charges-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Additional Charges
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="taxRate">Tax Rate (%)</Label>
                    <Input
                      id="taxRate"
                      data-testid="tax-rate-input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={invoiceData.taxRate}
                      onChange={(e) => handleInputChange('taxRate', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="discount">Discount ({getCurrencySymbol()})</Label>
                    <Input
                      id="discount"
                      data-testid="discount-input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={invoiceData.discount}
                      onChange={(e) => handleInputChange('discount', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="shipping">Shipping ({getCurrencySymbol()})</Label>
                    <Input
                      id="shipping"
                      data-testid="shipping-input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={invoiceData.shipping}
                      onChange={(e) => handleInputChange('shipping', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="notes">Notes / Terms</Label>
                  <Input
                    id="notes"
                    data-testid="notes-input"
                    value={invoiceData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Payment terms, thank you note, etc."
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Preview */}
          <div className="lg:sticky lg:top-6 h-fit">
            <Card data-testid="preview-card">
              <CardHeader>
                <CardTitle>Invoice Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-white p-8 shadow-lg rounded-lg border">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      {invoiceData.brandLogo && (
                        <img src={invoiceData.brandLogo} alt="Brand Logo" className="h-12 w-auto mb-2" />
                      )}
                      <h2 className="text-2xl font-bold text-gray-800">{invoiceData.brandName || 'Brand Name'}</h2>
                      <p className="text-sm text-gray-600">{invoiceData.brandEmail}</p>
                      <p className="text-sm text-gray-600">{invoiceData.brandPhone}</p>
                      <p className="text-sm text-gray-600">{invoiceData.brandAddress}</p>
                    </div>
                    <div className="text-right">
                      <h1 className="text-3xl font-bold text-blue-600">INVOICE</h1>
                      <p className="text-sm text-gray-600 mt-1">{invoiceData.invoiceNumber}</p>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-2">Bill To:</h3>
                      <p className="text-sm font-medium">{invoiceData.clientName || 'Client Name'}</p>
                      <p className="text-sm text-gray-600">{invoiceData.clientEmail}</p>
                      <p className="text-sm text-gray-600">{invoiceData.clientPhone}</p>
                      <p className="text-sm text-gray-600">{invoiceData.clientAddress}</p>
                    </div>
                    <div className="text-right">
                      <div className="mb-2">
                        <span className="text-sm text-gray-600">Invoice Date: </span>
                        <span className="text-sm font-medium">{invoiceData.invoiceDate}</span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Due Date: </span>
                        <span className="text-sm font-medium">{invoiceData.dueDate}</span>
                      </div>
                    </div>
                  </div>

                  <table className="w-full mb-6">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="text-left p-2 text-sm font-semibold">Item</th>
                        <th className="text-center p-2 text-sm font-semibold">Qty</th>
                        <th className="text-right p-2 text-sm font-semibold">Price</th>
                        <th className="text-right p-2 text-sm font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceData.items.map((item, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="p-2 text-sm">
                            <div className="font-medium">{item.name || '-'}</div>
                            <div className="text-xs text-gray-500">{item.description}</div>
                          </td>
                          <td className="text-center p-2 text-sm">{item.quantity}</td>
                          <td className="text-right p-2 text-sm">{getCurrencySymbol()}{item.unitPrice.toFixed(2)}</td>
                          <td className="text-right p-2 text-sm">{getCurrencySymbol()}{(item.quantity * item.unitPrice).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium" data-testid="preview-subtotal">{getCurrencySymbol()}{calculateSubtotal().toFixed(2)}</span>
                      </div>
                      {invoiceData.taxRate > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Tax ({invoiceData.taxRate}%):</span>
                          <span className="font-medium" data-testid="preview-tax">{getCurrencySymbol()}{calculateTax().toFixed(2)}</span>
                        </div>
                      )}
                      {invoiceData.discount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Discount:</span>
                          <span className="font-medium" data-testid="preview-discount">-{getCurrencySymbol()}{invoiceData.discount.toFixed(2)}</span>
                        </div>
                      )}
                      {invoiceData.shipping > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Shipping:</span>
                          <span className="font-medium" data-testid="preview-shipping">{getCurrencySymbol()}{invoiceData.shipping.toFixed(2)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span className="text-blue-600" data-testid="preview-total">{getCurrencySymbol()}{calculateTotal().toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {invoiceData.notes && (
                    <div className="mt-6 p-3 bg-gray-50 rounded">
                      <p className="text-xs text-gray-700">{invoiceData.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <Button onClick={saveInvoice} variant="outline" className="w-full" data-testid="save-invoice-button">
                <Save className="w-4 h-4 mr-2" />
                Save Invoice
              </Button>
              <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full" data-testid="view-history-button">
                    <Calendar className="w-4 h-4 mr-2" />
                    History
                  </Button>
                </DialogTrigger>
                <DialogContent data-testid="history-dialog">
                  <DialogHeader>
                    <DialogTitle>Invoice History</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {savedInvoices.length === 0 ? (
                      <p className="text-gray-500 text-center py-4" data-testid="no-invoices-message">No saved invoices</p>
                    ) : (
                      savedInvoices.map(invoice => (
                        <div key={invoice.id} className="flex items-center justify-between p-3 border rounded" data-testid={`invoice-item-${invoice.id}`}>
                          <div className="flex-1">
                            <p className="font-medium">{invoice.invoiceNumber}</p>
                            <p className="text-sm text-gray-500">{invoice.clientName} - {getCurrencySymbol()}{invoice.total.toFixed(2)}</p>
                            <p className="text-xs text-gray-400">{new Date(invoice.savedAt).toLocaleDateString()}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => loadInvoice(invoice)} data-testid={`load-invoice-${invoice.id}`}>Load</Button>
                            <Button size="sm" variant="destructive" onClick={() => deleteInvoice(invoice.id)} data-testid={`delete-invoice-${invoice.id}`}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </DialogContent>
              </Dialog>
              <Button onClick={downloadPDF} className="w-full" data-testid="download-pdf-button">
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button onClick={printPDF} variant="outline" className="w-full" data-testid="print-button">
                <FileText className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
                <DialogTrigger asChild>
                  <Button className="w-full col-span-2" data-testid="email-invoice-button">
                    <Mail className="w-4 h-4 mr-2" />
                    Send via Email
                  </Button>
                </DialogTrigger>
                <DialogContent data-testid="email-dialog">
                  <DialogHeader>
                    <DialogTitle>Send Invoice via Email</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="recipientEmail">Recipient Email</Label>
                      <Input
                        id="recipientEmail"
                        data-testid="recipient-email-input"
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="recipient@email.com"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={sendEmail} disabled={isSending} data-testid="send-email-button">
                      {isSending ? 'Sending...' : 'Send Email'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceGenerator;