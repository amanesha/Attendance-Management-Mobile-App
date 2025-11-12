import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { getAttendanceStats } from '../utils/storage';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const StatisticsScreen = () => {
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const data = await getAttendanceStats();
    setStats(data);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const exportToExcel = async (type) => {
    if (!stats) return;

    try {
      let data, filename;

      if (type === 'quick') {
        if (stats.quickData.length === 0) {
          Alert.alert('No Data', 'No Quick ID attendance records to export');
          return;
        }
        data = stats.quickData.map((item) => ({
          ID: item.id,
          Date: formatDate(item.date),
        }));
        filename = `Quick_ID_Attendance_${Date.now()}.xlsx`;
      } else {
        if (stats.fullData.length === 0) {
          Alert.alert('No Data', 'No Full Registration records to export');
          return;
        }
        data = stats.fullData.map((item) => ({
          'Full Name': item.fullName || 'N/A',
          Department: item.department || 'N/A',
          'Phone Number': item.phoneNumber || 'N/A',
          Date: formatDate(item.date),
        }));
        filename = `Full_Registration_Attendance_${Date.now()}.xlsx`;
      }

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(data);

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

      // Generate Excel file
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

      // Save to file system
      const uri = FileSystem.documentDirectory + filename;
      await FileSystem.writeAsStringAsync(uri, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Share the file
      await Sharing.shareAsync(uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Export Attendance',
        UTI: 'com.microsoft.excel.xlsx',
      });

      Alert.alert('Success', 'Attendance exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export attendance data');
    }
  };

  if (!stats) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Attendance Statistics</Text>
        <Text style={styles.headerSubtitle}>Overview of all records</Text>
      </View>

      {/* Today's Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Attendance</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.todayCard]}>
            <Text style={styles.statNumber}>{stats.todayAll}</Text>
            <Text style={styles.statLabel}>Total Today</Text>
          </View>
          <View style={[styles.statCard, styles.quickCard]}>
            <Text style={styles.statNumber}>{stats.todayQuick}</Text>
            <Text style={styles.statLabel}>Quick ID</Text>
          </View>
          <View style={[styles.statCard, styles.fullCard]}>
            <Text style={styles.statNumber}>{stats.todayFull}</Text>
            <Text style={styles.statLabel}>Full Registration</Text>
          </View>
        </View>
      </View>

      {/* Overall Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>All Time Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.totalCard]}>
            <Text style={styles.statNumber}>{stats.totalAll}</Text>
            <Text style={styles.statLabel}>Total Records</Text>
          </View>
          <View style={[styles.statCard, styles.quickCard]}>
            <Text style={styles.statNumber}>{stats.totalQuick}</Text>
            <Text style={styles.statLabel}>Quick ID</Text>
          </View>
          <View style={[styles.statCard, styles.fullCard]}>
            <Text style={styles.statNumber}>{stats.totalFull}</Text>
            <Text style={styles.statLabel}>Full Registration</Text>
          </View>
        </View>
      </View>

      {/* Export Buttons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Export Data</Text>
        <TouchableOpacity
          style={[styles.exportButton, styles.quickExportButton]}
          onPress={() => exportToExcel('quick')}
        >
          <Text style={styles.exportButtonText}>
            📊 Export Quick ID to Excel
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.exportButton, styles.fullExportButton]}
          onPress={() => exportToExcel('full')}
        >
          <Text style={styles.exportButtonText}>
            📊 Export Full Registration to Excel
          </Text>
        </TouchableOpacity>
      </View>

      {/* Recent Quick ID Entries */}
      {stats.quickData.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Recent Quick ID Entries ({stats.quickData.length})
          </Text>
          {stats.quickData.slice(-10).reverse().map((item, index) => (
            <View key={index} style={styles.entryCard}>
              <View style={styles.entryHeader}>
                <Text style={styles.entryId}>ID: {item.id}</Text>
              </View>
              <Text style={styles.entryDate}>{formatDate(item.date)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Recent Full Registration Entries */}
      {stats.fullData.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Recent Full Registrations ({stats.fullData.length})
          </Text>
          {stats.fullData.slice(-10).reverse().map((item, index) => (
            <View key={index} style={styles.entryCard}>
              <View style={styles.entryHeader}>
                <Text style={styles.entryName}>
                  {item.fullName || 'No Name'}
                </Text>
              </View>
              {item.department && (
                <Text style={styles.entryDetail}>Dept: {item.department}</Text>
              )}
              {item.phoneNumber && (
                <Text style={styles.entryDetail}>Phone: {item.phoneNumber}</Text>
              )}
              <Text style={styles.entryDate}>{formatDate(item.date)}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 100,
  },
  header: {
    backgroundColor: '#1e3a8a',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#93c5fd',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  statCard: {
    width: '31%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  todayCard: {
    backgroundColor: '#10b981',
  },
  totalCard: {
    backgroundColor: '#6366f1',
  },
  quickCard: {
    backgroundColor: '#3b82f6',
  },
  fullCard: {
    backgroundColor: '#8b5cf6',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#ffffff',
    textAlign: 'center',
  },
  exportButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickExportButton: {
    backgroundColor: '#3b82f6',
  },
  fullExportButton: {
    backgroundColor: '#8b5cf6',
  },
  exportButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  entryCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  entryHeader: {
    marginBottom: 8,
  },
  entryId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  entryName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  entryDetail: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  entryDate: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 8,
  },
  bottomPadding: {
    height: 40,
  },
});

export default StatisticsScreen;
