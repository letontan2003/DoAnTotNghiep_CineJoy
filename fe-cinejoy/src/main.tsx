import '@ant-design/v5-patch-for-react-19';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AlertContextProvider } from 'context/alert.context';
import Layout from 'components/layout';
import AppProvider from 'components/appProvider';
import HomePage from 'pages/client/Home';
import Movies from 'pages/client/Movies';
import MoviesDetail from 'pages/client/MoviesDetail';
import Select from 'pages/client/SelectSeat';
import Members from 'pages/client/Members';
import Payment from 'pages/client/Payment';
import PaymentSuccess from 'pages/client/PaymentSuccess';
import PaymentCancel from '@/pages/client/PaymentCancel';
import Error from 'pages/client/Error';
import Dashboard from 'pages/admin/AdminDaskboard';
import VoucherDetail from 'pages/admin/VoucherDetail';
import PromotionReport from 'pages/admin/PromotionReport';
import SalesReportByDay from 'pages/admin/SalesReportByDay';
import SalesReportByCustomer from 'pages/admin/SalesReportByCustomer';
import SalesChartReport from 'pages/admin/SalesChartReport';
import AdminLayout from 'components/admin/AdminLayout';
import { ToastContainer } from 'react-toastify';
import Contact from 'pages/client/Contact';
import NewsPage from 'pages/client/News';
import NewsDetailPage from 'pages/client/NewsDetail';
import BookingHistory from 'pages/client/BookingHistory';
import TransactionDetails from 'pages/client/TransactionDetails';
import OrderInvoicePage from 'pages/admin/OrderInvoice';
import ReturnedInvoicePage from 'pages/admin/ReturnedInvoice';
import RefundReport from 'pages/admin/RefundReport';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <HomePage />
      },
      {
        path: "/news",
        element: <NewsPage />
      },
      {
        path: "/news/:blogCode",
        element: <NewsDetailPage />
      },
      {
        path: "/contact",
        element: <Contact />
      },
      {
        path: "/movies",
        element: <Movies />
      },
      {
        path: "/movies/:id",
        element: <MoviesDetail />
      },
      {
        path: "/selectSeat",
        element: <Select />
      },
      {
        path: "/members",
        element: <Members />
      },
      {
        path: "/booking-history",
        element: <BookingHistory />
      },
      {
        path: "/transaction-details/:orderId",
        element: <TransactionDetails />
      },
      {
        path: "/payment",
        element: <Payment />
      },
      {
        path: "/payment/success",
        element: <PaymentSuccess />
      },
      {
        path: "/payment/cancel",
        element: <PaymentCancel />
      }
    ]
  },
  {
    path: "/admin",
    element: <Dashboard />
  },
  {
    path: "/admin/orders/invoice/:email",
    element: <OrderInvoicePage />
  },
  {
    path: "/admin/orders/returned/:email",
    element: <ReturnedInvoicePage />
  },
  {
    path: "/admin/vouchers/:id",
    element: <VoucherDetail />
  },
  {
    path: "/admin/promotion-report",
    element: <AdminLayout><PromotionReport /></AdminLayout>
  },
  {
    path: "/admin/sales-report-by-day",
    element: <AdminLayout><SalesReportByDay /></AdminLayout>
  },
  {
    path: "/admin/sales-report-by-customer",
    element: <AdminLayout><SalesReportByCustomer /></AdminLayout>
  },
  {
    path: "/admin/sales-chart-report",
    element: <AdminLayout><SalesChartReport /></AdminLayout>
  },
  {
    path: "/admin/refund-report",
    element: <AdminLayout><RefundReport /></AdminLayout>
  },
  {
    path: "*",
    element: <Error />
  }
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AlertContextProvider>
      <AppProvider>
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="light" />
        <RouterProvider router={router} />
      </AppProvider>
    </AlertContextProvider>
  </StrictMode>,
);
