import React, { useState, useRef, useEffect } from 'react';
import {
  Fuel,
  Wallet,
  QrCode,
  Scan,
  Clock,
  Camera,
  RefreshCw,
  Calendar as CalendarIcon,
  Printer,
  X,
  RotateCcw,
  FileUp,
  FileText,
  Mail,
  CheckCircle2,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface WholesaleOrder {
  id: string;
  agency: 'Anuradhapura' | 'Mihintale';
  shopName: string;
  category: 'Supermarket' | 'Wholesale';
  totalAmount: number;
  discountPercentage: number;
  netAmount: number;
  date: string;
  status: 'Pending Approval' | 'Dispatched';
  paymentStatus: 'Unpaid' | 'Partially Paid' | 'Fully Paid';
  paidAmount: number;
}

interface PdfPageBill {
  pageNumber: number;
  imageUrl: string;
  invoiceNo: string;
  shopName: string;
  amount: string;
  paymentStatus: 'Unpaid' | 'Partially Paid' | 'Fully Paid';
}

interface UploadedBillItem {
  id: string;
  fileName: string;
  fileType: 'pdf' | 'image';
  dataUrl: string;
  invoiceNo: string;
  shopName: string;
  amount: string;
  paymentStatus: 'Unpaid' | 'Partially Paid' | 'Fully Paid';
  pages: PdfPageBill[];
  isRendering?: boolean;
  renderError?: string;
}

const STORAGE_KEY = 'golden_distributors_erp_orders_v1';
const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const JSQR_CDN = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';

const getLocalDateString = (offsetDays = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const loadExternalScript = (src: string, timeoutMs = 10000): Promise<void> => {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }
      const timer = window.setTimeout(() => reject(new Error(`Timeout loading ${src}`)), timeoutMs);
      existing.addEventListener('load', () => {
        window.clearTimeout(timer);
        resolve();
      });
      existing.addEventListener('error', () => {
        window.clearTimeout(timer);
        reject(new Error(`Failed to load ${src}`));
      });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    const timer = window.setTimeout(() => reject(new Error(`Timeout loading ${src}`)), timeoutMs);

    script.onload = () => {
      window.clearTimeout(timer);
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error(`Failed to load ${src}`));
    };
    document.head.appendChild(script);
  });
};

export default function App() {
  const todayStr = getLocalDateString(0);
  const yesterdayStr = getLocalDateString(-1);

  const getDefaultOrders = (): WholesaleOrder[] => [
    {
      id: '26NOV_R187SIN_801',
      agency: 'Mihintale',
      shopName: 'Niranjala Stores - R187-000156',
      category: 'Wholesale',
      totalAmount: 3300,
      discountPercentage: 0,
      netAmount: 3300,
      date: todayStr,
      status: 'Dispatched',
      paymentStatus: 'Unpaid',
      paidAmount: 0
    },
    {
      id: 'CG0392DSI034516',
      agency: 'Mihintale',
      shopName: 'Saliyapura Farm Shop - R187-000143',
      category: 'Wholesale',
      totalAmount: 3625,
      discountPercentage: 0,
      netAmount: 3625,
      date: todayStr,
      status: 'Dispatched',
      paymentStatus: 'Unpaid',
      paidAmount: 0
    },
    {
      id: 'CG0392DSI034515',
      agency: 'Mihintale',
      shopName: 'Govijana Stores - CUS25722',
      category: 'Wholesale',
      totalAmount: 1924.75,
      discountPercentage: 0,
      netAmount: 1924.75,
      date: yesterdayStr,
      status: 'Dispatched',
      paymentStatus: 'Partially Paid',
      paidAmount: 1000
    },
    {
      id: 'ORD-3881',
      agency: 'Anuradhapura',
      shopName: 'Anuradhapura Super Stores (Route 1)',
      category: 'Supermarket',
      totalAmount: 150000,
      discountPercentage: 26,
      netAmount: 111000,
      date: todayStr,
      status: 'Pending Approval',
      paymentStatus: 'Unpaid',
      paidAmount: 0
    }
  ];

  const [activeAgency, setActiveAgency] = useState<'Anuradhapura' | 'Mihintale'>('Mihintale');
  const [activeTab, setActiveTab] = useState<'pdf' | 'orders' | 'credits' | 'scanner'>('pdf');
  const [selectedDate, setSelectedDate] = useState<string>('ALL');
  const [isSyncing, setIsSyncing] = useState(false);
  const [billToPrint, setBillToPrint] = useState<WholesaleOrder | null>(null);

  const [uploadedBills, setUploadedBills] = useState<UploadedBillItem[]>([]);
  const [billToPrintModal, setBillToPrintModal] = useState<UploadedBillItem | null>(null);
  const [selectedPrintPage, setSelectedPrintPage] = useState<number | 'ALL'>('ALL');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [scanningActive, setScanningActive] = useState(false);
  const [scannedResultText, setScannedResultText] = useState<string>('');
  const [matchedScannedOrder, setMatchedScannedOrder] = useState<WholesaleOrder | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scanCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  const [orders, setOrders] = useState<WholesaleOrder[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.error('Failed to load orders from localStorage:', err);
    }
    return getDefaultOrders();
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    } catch (err) {
      console.error('Failed to save orders to localStorage:', err);
    }
  }, [orders]);

  useEffect(() => {
    return () => {
      if (scanIntervalRef.current) {
        window.clearInterval(scanIntervalRef.current);
      }
    };
  }, []);

  const [newShop, setNewShop] = useState('');
  const [newTotal, setNewTotal] = useState('');
  const [newDiscount, setNewDiscount] = useState('');

  const getQrPayloadFromValues = (
    invoiceNo: string,
    agency: 'Anuradhapura' | 'Mihintale',
    dateStr: string,
    amount: string | number,
    status: string
  ) => {
    const agencyCode = agency === 'Anuradhapura' ? 'CG0388' : 'CG0392';
    return `${invoiceNo}|${agencyCode}|${dateStr}|${amount}|${status}`;
  };

  const getQrImageUrlFromPayload = (payload: string, size = 200) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&ecc=M&margin=6&data=${encodeURIComponent(payload)}`;
  };

  const getQrPayload = (ord: WholesaleOrder) => {
    return getQrPayloadFromValues(ord.id, ord.agency, ord.date, ord.netAmount, ord.paymentStatus);
  };

  const getQrImageUrl = (ord: WholesaleOrder) => {
    return getQrImageUrlFromPayload(getQrPayload(ord), 200);
  };

  const extractBillDetailsFromPageText = (
    pageText: string,
    fallbackInvoice: string,
    pageNum: number
  ): { invoiceNo: string; shopName: string; amount: string } => {
    const normalized = pageText.replace(/\s+/g, ' ').trim();

    const invMatch = normalized.match(
      /(?:Invoice\s*No\s*:?\s*)?(\d{2}[A-Z]{3}_[A-Z0-9_]+|CG\d{4}[A-Z0-9]+|[A-Z]{2,5}\d{3,}[A-Z0-9_-]*)/i
    );
    const extractedInvoice = invMatch
      ? invMatch[1].toUpperCase()
      : `${fallbackInvoice}-P${pageNum}`;

    const shopMatch = normalized.match(
      /(?:Invoiced\s*To\s*:?\s*)([A-Za-z0-9\s.&'-]{3,45}?)(?=\s+(?:Tel|Ordered|Invoice|Item|Gross|Total|\d{10}|No\.))/i
    );
    const extractedShop = shopMatch ? shopMatch[1].trim() : '';

    const totalMatch = normalized.match(
      /(?:Total\s*Value|Net\s*Total|Grand\s*Total)\s*:?\s*(?:Rs\.?|LKR)?\s*([\d,]+\.\d{2}|[\d,]+)/i
    );
    const extractedAmount = totalMatch ? totalMatch[1].replace(/,/g, '') : '';

    return {
      invoiceNo: extractedInvoice,
      shopName: extractedShop,
      amount: extractedAmount
    };
  };

  const renderPdfAllPages = async (
    dataUrl: string,
    fallbackInvoice: string
  ): Promise<PdfPageBill[]> => {
    await loadExternalScript(PDFJS_CDN, 12000);
    const pdfjsLib = (window as any).pdfjsLib;
    if (!pdfjsLib) {
      throw new Error('PDF.js library unavailable');
    }
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;

    const base64Part = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    const binaryStr = atob(base64Part);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const loadingTask = pdfjsLib.getDocument({ data: bytes, disableWorker: false });
    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages || 1;
    const renderedPages: PdfPageBill[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.75 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      if (context) {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: context, viewport }).promise;
      }

      let pageText = '';
      try {
        const textContent = await page.getTextContent();
        pageText = (textContent.items || [])
          .map((item: any) => ('str' in item ? item.str : ''))
          .join(' ');
      } catch {
        pageText = '';
      }

      const extracted = extractBillDetailsFromPageText(pageText, fallbackInvoice, pageNum);
      renderedPages.push({
        pageNumber: pageNum,
        imageUrl: canvas.toDataURL('image/jpeg', 0.88),
        invoiceNo: extracted.invoiceNo,
        shopName: extracted.shopName,
        amount: extracted.amount,
        paymentStatus: 'Unpaid'
      });
    }

    return renderedPages;
  };

  const handleFilesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        if (!result) return;

        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        const cleanedName = file.name.replace(/\.[^/.]+$/, '');
        const matchInvoice = cleanedName.match(/(?:CG\d{4}[A-Z0-9]+|\d{2}[A-Z]{3}_[A-Z0-9_]+)/i);
        const baseInvoice = matchInvoice ? matchInvoice[0].toUpperCase() : cleanedName || `BILL-${idx + 1}`;
        const itemId = `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`;

        const initialItem: UploadedBillItem = {
          id: itemId,
          fileName: file.name,
          fileType: isPdf ? 'pdf' : 'image',
          dataUrl: result,
          invoiceNo: baseInvoice,
          shopName: '',
          amount: '',
          paymentStatus: 'Unpaid',
          pages: [],
          isRendering: isPdf,
          renderError: ''
        };

        setUploadedBills(prev => [initialItem, ...prev]);

        if (isPdf) {
          try {
            const pages = await renderPdfAllPages(result, baseInvoice);
            const firstPage = pages[0];
            setUploadedBills(prev =>
              prev.map(item =>
                item.id === itemId
                  ? {
                      ...item,
                      pages,
                      isRendering: false,
                      renderError: '',
                      invoiceNo: firstPage?.invoiceNo || item.invoiceNo,
                      shopName: firstPage?.shopName || item.shopName,
                      amount: firstPage?.amount || item.amount
                    }
                  : item
              )
            );
          } catch (err: any) {
            console.error('PDF page render failed:', err);
            setUploadedBills(prev =>
              prev.map(item =>
                item.id === itemId
                  ? {
                      ...item,
                      isRendering: false,
                      renderError: 'PDF පිටු ස්වයංක්‍රීයව render කිරීමට නොහැකි විය. Preview & Print ඔබා PDF එක විවෘත කරන්න.'
                    }
                  : item
              )
            );
          }
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const openPrintModalForItem = (item: UploadedBillItem) => {
    setSelectedPrintPage('ALL');
    setBillToPrintModal(item);
  };

  const updateUploadedBillField = (
    id: string,
    field: 'invoiceNo' | 'shopName' | 'amount' | 'paymentStatus',
    value: string
  ) => {
    setUploadedBills(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const updatePdfPageField = (
    billId: string,
    pageNumber: number,
    field: 'invoiceNo' | 'shopName' | 'amount' | 'paymentStatus',
    value: string
  ) => {
    setUploadedBills(prev =>
      prev.map(item => {
        if (item.id !== billId) return item;
        const updatedPages = item.pages.map(p =>
          p.pageNumber === pageNumber ? { ...p, [field]: value } : p
        );
        return { ...item, pages: updatedPages };
      })
    );

    setBillToPrintModal(prev => {
      if (!prev || prev.id !== billId) return prev;
      const updatedPages = prev.pages.map(p =>
        p.pageNumber === pageNumber ? { ...p, [field]: value } : p
      );
      return { ...prev, pages: updatedPages };
    });
  };

  const savePageOrBillToOrders = (
    invoiceNo: string,
    shopName: string,
    amountStr: string,
    paymentStatus: 'Unpaid' | 'Partially Paid' | 'Fully Paid',
    fallbackLabel: string
  ) => {
    const parsedAmount = parseFloat(amountStr) || 0;
    const newOrd: WholesaleOrder = {
      id: invoiceNo.trim() || `INV-${Date.now().toString().slice(-4)}`,
      agency: activeAgency,
      shopName: shopName.trim() || fallbackLabel,
      category: 'Wholesale',
      totalAmount: parsedAmount,
      discountPercentage: 0,
      netAmount: parsedAmount,
      date: selectedDate === 'ALL' ? todayStr : selectedDate,
      status: 'Dispatched',
      paymentStatus,
      paidAmount: paymentStatus === 'Fully Paid' ? parsedAmount : 0
    };

    setOrders(prev => [newOrd, ...prev]);
    alert(`✅ ${newOrd.id} බිල Orders & Credit Bills ලැයිස්තුවට එක් කරන ලදී.`);
  };

  const handleSyncFreelan = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      const username = activeAgency === 'Anuradhapura' ? 'CG0388' : 'CG0392';
      const syncDateLabel = selectedDate === 'ALL' ? todayStr : selectedDate;
      alert(`✅ Freelan SFA Sync තත්ත්වය:\nAgency: ${activeAgency} (${username})\nදිනය: ${syncDateLabel}\nPDF බිල් Upload කර සෑම පිටුවකටම ඒ බිලේ QR එක සමඟ Print කිරීමට "Upload PDF Bill" භාවිත කරන්න.`);
    }, 600);
  };

  const handleResetSampleData = () => {
    const fresh = getDefaultOrders();
    setOrders(fresh);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    alert('🔄 මූලික බිල් ලැයිස්තුව නැවත සකස් කරන ලදී.');
  };

  const handleAddOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShop || !newTotal || !newDiscount) return;

    const total = parseFloat(newTotal);
    const disc = parseFloat(newDiscount);
    const net = total - (total * disc) / 100;
    const orderDate = selectedDate === 'ALL' ? todayStr : selectedDate;

    const order: WholesaleOrder = {
      id: `ORD-${Date.now().toString().slice(-4)}`,
      agency: activeAgency,
      shopName: newShop,
      category: disc >= 25 ? 'Supermarket' : 'Wholesale',
      totalAmount: total,
      discountPercentage: disc,
      netAmount: net,
      date: orderDate,
      status: disc >= 25 ? 'Pending Approval' : 'Dispatched',
      paymentStatus: 'Unpaid',
      paidAmount: 0
    };

    setOrders(prev => [order, ...prev]);

    if (disc >= 25) {
      alert(`🚨 SMS SENT TO OWNER (+94781980085): High Discount Alert! Shop: ${newShop} requested ${disc}% discount. Net Amount: LKR ${net.toLocaleString()}`);
    }

    setNewShop('');
    setNewTotal('');
    setNewDiscount('');
  };

  const handleDecodedQrValue = (rawValue: string) => {
    const trimmed = rawValue.trim();
    if (!trimmed) return;
    setScannedResultText(trimmed);

    const parts = trimmed.split('|');
    const invoiceCandidate = parts[0]?.trim() || trimmed;

    const existing = orders.find(
      o => o.id.toLowerCase() === invoiceCandidate.toLowerCase()
    );

    if (existing) {
      setMatchedScannedOrder(existing);
    } else {
      const parsedAmount = parseFloat(parts[3] || '0') || 0;
      const created: WholesaleOrder = {
        id: invoiceCandidate,
        agency: parts[1] === 'CG0388' ? 'Anuradhapura' : 'Mihintale',
        shopName: `Scanned Bill (${invoiceCandidate})`,
        category: 'Wholesale',
        totalAmount: parsedAmount,
        discountPercentage: 0,
        netAmount: parsedAmount,
        date: parts[2] || todayStr,
        status: 'Dispatched',
        paymentStatus: 'Unpaid',
        paidAmount: 0
      };
      setOrders(prev => [created, ...prev]);
      setMatchedScannedOrder(created);
    }
  };

  const startCamera = async () => {
    setScanningActive(true);
    setScannedResultText('');
    setMatchedScannedOrder(null);

    try {
      await loadExternalScript(JSQR_CDN, 8000).catch(() => {});

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const BarcodeDetectorCtor = (window as any).BarcodeDetector;
      let detector: any = null;
      if (BarcodeDetectorCtor) {
        try {
          detector = new BarcodeDetectorCtor({ formats: ['qr_code'] });
        } catch {
          detector = null;
        }
      }

      if (scanIntervalRef.current) {
        window.clearInterval(scanIntervalRef.current);
      }

      scanIntervalRef.current = window.setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;

        if (detector) {
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              handleDecodedQrValue(String(barcodes[0].rawValue));
              return;
            }
          } catch {
            // fallback to jsQR
          }
        }

        const jsQR = (window as any).jsQR;
        if (jsQR && scanCanvasRef.current) {
          const canvas = scanCanvasRef.current;
          const ctx = canvas.getContext('2d');
          const vw = videoRef.current.videoWidth || 640;
          const vh = videoRef.current.videoHeight || 480;
          canvas.width = vw;
          canvas.height = vh;
          if (ctx) {
            ctx
