import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../context/AuthContext';

type PrintBillRouteProp = RouteProp<RootStackParamList, 'PrintBill'>;
type PrintBillNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PrintBill'>;

export interface BillItem {
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface BillData {
  saleId: string;
  date: string;
  items: BillItem[];
  subtotal: number;
  discount?: number;
  totalAmount: number;
  paymentType: 'cash' | 'UPI';
  isPaid: boolean;
  cashierName?: string;
}

const PrintBillScreen: React.FC = () => {
  const navigation = useNavigation<PrintBillNavigationProp>();
  const route = useRoute<PrintBillRouteProp>();
  const { user } = useAuth();
  const [printing, setPrinting] = useState(false);
  const [sharing, setSharing] = useState(false);

  const billData: BillData = route.params?.billData;

  useEffect(() => {
    if (!billData) {
      Alert.alert('Error', 'No bill data found');
      navigation.goBack();
    }
  }, [billData]);

  if (!billData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a1a2e" />
      </View>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return `₹${Number(amount).toFixed(2)}`;
  };

  // Generate HTML for thermal receipt (58mm width optimized)
  const generateReceiptHTML = () => {
    const itemsHTML = billData.items
      .map(
        (item, index) => `
        <tr>
          <td style="text-align: left; padding: 2px 0; font-size: 11px;">${item.name}</td>
          <td style="text-align: center; padding: 2px 0; font-size: 11px;">${item.quantity}</td>
          <td style="text-align: right; padding: 2px 0; font-size: 11px;">${formatCurrency(item.subtotal)}</td>
        </tr>
      `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          @page {
            size: 58mm auto;
            margin: 0;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            width: 58mm;
            padding: 4mm;
            background: #fff;
            color: #000;
          }
          .receipt {
            width: 100%;
          }
          .header {
            text-align: center;
            margin-bottom: 8px;
            padding-bottom: 8px;
            border-bottom: 1px dashed #000;
          }
          .shop-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 4px;
          }
          .shop-info {
            font-size: 10px;
            color: #333;
          }
          .meta {
            font-size: 10px;
            margin-bottom: 8px;
            padding-bottom: 8px;
            border-bottom: 1px dashed #000;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
          }
          .items-header {
            border-bottom: 1px solid #000;
            font-weight: bold;
          }
          .items-header th {
            padding: 4px 0;
            font-size: 10px;
            text-transform: uppercase;
          }
          .totals {
            border-top: 1px dashed #000;
            padding-top: 8px;
            margin-top: 8px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
            font-size: 11px;
          }
          .grand-total {
            font-size: 14px;
            font-weight: bold;
            border-top: 1px solid #000;
            padding-top: 6px;
            margin-top: 6px;
          }
          .payment-info {
            text-align: center;
            margin: 8px 0;
            padding: 6px;
            background: #f5f5f5;
            border-radius: 4px;
          }
          .payment-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
          }
          .paid {
            background: #d4edda;
            color: #155724;
          }
          .pending {
            background: #fff3cd;
            color: #856404;
          }
          .footer {
            text-align: center;
            margin-top: 12px;
            padding-top: 8px;
            border-top: 1px dashed #000;
            font-size: 10px;
          }
          .footer-thanks {
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 4px;
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <!-- Header -->
          <div class="header">
            <div class="shop-name">YUKI STORE</div>
            <div class="shop-info">Your Trusted Business Partner</div>
          </div>

          <!-- Meta Information -->
          <div class="meta">
            <div class="meta-row">
              <span>Bill No:</span>
              <span>${billData.saleId.substring(0, 8).toUpperCase()}</span>
            </div>
            <div class="meta-row">
              <span>Date:</span>
              <span>${formatDate(billData.date)}</span>
            </div>
            <div class="meta-row">
              <span>Cashier:</span>
              <span>${billData.cashierName || user?.name || 'Staff'}</span>
            </div>
          </div>

          <!-- Items Table -->
          <table class="items-table">
            <thead class="items-header">
              <tr>
                <th style="text-align: left; width: 50%;">Item</th>
                <th style="text-align: center; width: 20%;">Qty</th>
                <th style="text-align: right; width: 30%;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>

          <!-- Totals -->
          <div class="totals">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>${formatCurrency(billData.subtotal)}</span>
            </div>
            ${billData.discount ? `
            <div class="total-row">
              <span>Discount:</span>
              <span>-${formatCurrency(billData.discount)}</span>
            </div>
            ` : ''}
            <div class="total-row grand-total">
              <span>GRAND TOTAL:</span>
              <span>${formatCurrency(billData.totalAmount)}</span>
            </div>
          </div>

          <!-- Payment Info -->
          <div class="payment-info">
            <div style="margin-bottom: 4px; font-size: 10px;">Payment: <strong>${billData.paymentType.toUpperCase()}</strong></div>
            <span class="payment-badge ${billData.isPaid ? 'paid' : 'pending'}">
              ${billData.isPaid ? '✓ PAID' : '⏳ PENDING'}
            </span>
          </div>

          <!-- Footer -->
          <div class="footer">
            <div class="footer-thanks">Thank you for your purchase!</div>
            <div>Visit us again</div>
            <div style="margin-top: 8px; font-size: 9px; color: #666;">
              Powered by Yuki Business App
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const handlePrint = async () => {
    try {
      setPrinting(true);
      const html = generateReceiptHTML();
      
      await Print.printAsync({
        html,
        width: 226, // 58mm in points (58 * 72 / 28.35)
      });
    } catch (error: any) {
      Alert.alert('Print Error', error.message || 'Failed to print receipt');
    } finally {
      setPrinting(false);
    }
  };

  const handleSharePDF = async () => {
    try {
      setSharing(true);
      const html = generateReceiptHTML();
      
      const { uri } = await Print.printToFileAsync({
        html,
        width: 226,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Receipt',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Sharing Not Available', 'Sharing is not available on this device');
      }
    } catch (error: any) {
      Alert.alert('Share Error', error.message || 'Failed to share receipt');
    } finally {
      setSharing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Receipt Preview */}
      <ScrollView style={styles.previewContainer} contentContainerStyle={styles.previewContent}>
        <View style={styles.receipt}>
          {/* Header */}
          <View style={styles.receiptHeader}>
            <Text style={styles.shopName}>YUKI STORE</Text>
            <Text style={styles.shopInfo}>Your Trusted Business Partner</Text>
          </View>

          <View style={styles.divider} />

          {/* Meta */}
          <View style={styles.metaSection}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Bill No:</Text>
              <Text style={styles.metaValue}>{billData.saleId.substring(0, 8).toUpperCase()}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Date:</Text>
              <Text style={styles.metaValue}>{formatDate(billData.date)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Cashier:</Text>
              <Text style={styles.metaValue}>{billData.cashierName || user?.name || 'Staff'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Items Header */}
          <View style={styles.itemsHeader}>
            <Text style={[styles.itemHeaderText, { flex: 2 }]}>ITEM</Text>
            <Text style={[styles.itemHeaderText, { flex: 0.5, textAlign: 'center' }]}>QTY</Text>
            <Text style={[styles.itemHeaderText, { flex: 1, textAlign: 'right' }]}>AMT</Text>
          </View>

          {/* Items */}
          {billData.items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <Text style={[styles.itemText, { flex: 2 }]} numberOfLines={2}>{item.name}</Text>
              <Text style={[styles.itemText, { flex: 0.5, textAlign: 'center' }]}>{item.quantity}</Text>
              <Text style={[styles.itemText, { flex: 1, textAlign: 'right' }]}>{formatCurrency(item.subtotal)}</Text>
            </View>
          ))}

          <View style={styles.divider} />

          {/* Totals */}
          <View style={styles.totalsSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal:</Text>
              <Text style={styles.totalValue}>{formatCurrency(billData.subtotal)}</Text>
            </View>
            {billData.discount && billData.discount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount:</Text>
                <Text style={[styles.totalValue, { color: '#28a745' }]}>-{formatCurrency(billData.discount)}</Text>
              </View>
            )}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>GRAND TOTAL:</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(billData.totalAmount)}</Text>
            </View>
          </View>

          {/* Payment Info */}
          <View style={styles.paymentSection}>
            <Text style={styles.paymentMethod}>Payment: {billData.paymentType.toUpperCase()}</Text>
            <View style={[styles.paymentBadge, billData.isPaid ? styles.paidBadge : styles.pendingBadge]}>
              <Text style={[styles.paymentBadgeText, billData.isPaid ? styles.paidText : styles.pendingText]}>
                {billData.isPaid ? '✓ PAID' : '⏳ PENDING'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Footer */}
          <View style={styles.receiptFooter}>
            <Text style={styles.thanksText}>Thank you for your purchase!</Text>
            <Text style={styles.visitText}>Visit us again</Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.shareButton]}
          onPress={handleSharePDF}
          disabled={sharing || printing}
        >
          {sharing ? (
            <ActivityIndicator color="#1a1a2e" />
          ) : (
            <>
              <Text style={styles.shareButtonIcon}>📤</Text>
              <Text style={styles.shareButtonText}>Share PDF</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.printButton]}
          onPress={handlePrint}
          disabled={printing || sharing}
        >
          {printing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.printButtonIcon}>🖨️</Text>
              <Text style={styles.printButtonText}>Print Receipt</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Done Button */}
      <TouchableOpacity
        style={styles.doneButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.doneButtonText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f5',
  },
  previewContainer: {
    flex: 1,
  },
  previewContent: {
    padding: 16,
    alignItems: 'center',
  },
  receipt: {
    backgroundColor: '#fff',
    width: '100%',
    maxWidth: 320,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  receiptHeader: {
    alignItems: 'center',
    paddingBottom: 12,
  },
  shopName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  shopInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
    borderStyle: 'dashed',
  },
  metaSection: {
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    fontSize: 12,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  metaValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  itemsHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    marginBottom: 8,
  },
  itemHeaderText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333',
    textTransform: 'uppercase',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  itemRow: {
    flexDirection: 'row',
    paddingVertical: 6,
  },
  itemText: {
    fontSize: 12,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  totalsSection: {
    gap: 6,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 12,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  totalValue: {
    fontSize: 12,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 8,
    marginTop: 8,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a2e',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a2e',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  paymentSection: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginTop: 12,
  },
  paymentMethod: {
    fontSize: 11,
    color: '#666',
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  paymentBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  paidBadge: {
    backgroundColor: '#d4edda',
  },
  pendingBadge: {
    backgroundColor: '#fff3cd',
  },
  paymentBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  paidText: {
    color: '#155724',
  },
  pendingText: {
    color: '#856404',
  },
  receiptFooter: {
    alignItems: 'center',
    paddingTop: 8,
  },
  thanksText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1a1a2e',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  visitText: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  shareButton: {
    backgroundColor: '#f0f0f5',
    borderWidth: 2,
    borderColor: '#1a1a2e',
  },
  printButton: {
    backgroundColor: '#1a1a2e',
  },
  shareButtonIcon: {
    fontSize: 18,
  },
  printButtonIcon: {
    fontSize: 18,
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  printButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  doneButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 14,
    backgroundColor: '#28a745',
    borderRadius: 10,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default PrintBillScreen;

