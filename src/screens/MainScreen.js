import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  getAllSessions,
  createSession,
  setActiveSession,
  deleteSession,
  saveEmployees,
  getAllEmployees,
} from '../utils/storage';
import * as DocumentPicker from 'expo-document-picker';
import {
  ethiopianMonths,
  gregorianToEthiopian,
  ethiopianToGregorian,
  getCurrentEthiopianDate,
  getEthiopianYears,
  getDaysInEthiopianMonth,
  formatEthiopianDate,
} from '../utils/ethiopianCalendar';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const MainScreen = ({ navigation }) => {
  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Ethiopian date picker state
  const currentEthDate = getCurrentEthiopianDate();
  const [ethYear, setEthYear] = useState(currentEthDate.year);
  const [ethMonth, setEthMonth] = useState(currentEthDate.month);
  const [ethDay, setEthDay] = useState(currentEthDate.day);
  const [showEthYearPicker, setShowEthYearPicker] = useState(false);
  const [showEthMonthPicker, setShowEthMonthPicker] = useState(false);
  const [showEthDayPicker, setShowEthDayPicker] = useState(false);

  // Filter state (using Ethiopian calendar for filtering)
  const [selectedYear, setSelectedYear] = useState(getCurrentEthiopianDate().year);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentEthiopianDate().month);
  const [availableYears, setAvailableYears] = useState([]);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  useEffect(() => {
    loadSessions();

    // Add listener to reload when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      loadSessions();
    });

    return unsubscribe;
  }, [navigation]);

  const loadSessions = async () => {
    const allSessions = await getAllSessions();
    setSessions(allSessions.reverse());

    // Extract unique Ethiopian years from sessions
    const ethYears = [...new Set(allSessions.map(s => gregorianToEthiopian(s.date).year))];
    setAvailableYears(ethYears.sort((a, b) => b - a));

    if (allSessions.length > 0) {
      // Get the most recent session's Ethiopian date
      const mostRecentSession = allSessions[0];
      const mostRecentEthDate = gregorianToEthiopian(mostRecentSession.date);

      // Set filter to most recent session's month/year
      setSelectedYear(mostRecentEthDate.year);
      setSelectedMonth(mostRecentEthDate.month);

      // Filter sessions with the most recent date
      filterSessions(allSessions, mostRecentEthDate.year, mostRecentEthDate.month);
    } else {
      setFilteredSessions([]);
    }
  };

  const filterSessions = (allSessions, year, month) => {
    const filtered = allSessions.filter(session => {
      const ethDate = gregorianToEthiopian(session.date);
      return ethDate.year === year && ethDate.month === month;
    });
    setFilteredSessions(filtered);
  };

  useEffect(() => {
    if (sessions.length > 0) {
      filterSessions(sessions, selectedYear, selectedMonth);
    }
  }, [selectedYear, selectedMonth]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSessions();
    setRefreshing(false);
  };

  const handleAddSession = () => {
    const currentEth = getCurrentEthiopianDate();
    setEthYear(currentEth.year);
    setEthMonth(currentEth.month);
    setEthDay(currentEth.day);
    setShowDatePicker(true);
  };

  const handleCreateSessionWithEthDate = async () => {
    // Convert Ethiopian date to Gregorian
    const gregorianDate = ethiopianToGregorian(ethYear, ethMonth, ethDay);
    const session = await createSession(gregorianDate.toISOString());
    if (session) {
      await setActiveSession(session);
      await loadSessions();
      setShowDatePicker(false);
      navigation.navigate('AttendanceEntry');
    }
  };

  const handleSessionPress = async (session) => {
    await setActiveSession(session);
    navigation.navigate('AttendanceEntry');
  };

  const handleDeleteSession = (sessionId) => {
    Alert.alert(
      'Delete Session',
      'Are you sure you want to delete this session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteSession(sessionId);
            await loadSessions();
          },
        },
      ]
    );
  };

  const handleExportSession = async (session) => {
    try {
      if (session.idAttendance.length === 0 && session.forgotIdAttendance.length === 0) {
        Alert.alert('No Data', 'This session has no attendance records to export');
        return;
      }

      // Create workbook
      const wb = XLSX.utils.book_new();

      // ID Attendance Sheet
      if (session.idAttendance.length > 0) {
        const idData = session.idAttendance.map((item, index) => ({
          No: index + 1,
          ID: item.id,
          Time: new Date(item.timestamp).toLocaleString(),
        }));
        const wsId = XLSX.utils.json_to_sheet(idData);
        XLSX.utils.book_append_sheet(wb, wsId, 'ID Attendance');
      }

      // Forgot ID Attendance Sheet
      if (session.forgotIdAttendance.length > 0) {
        const forgotData = session.forgotIdAttendance.map((item, index) => ({
          No: index + 1,
          'Full Name': item.fullName || 'N/A',
          Department: item.department || 'N/A',
          'Phone Number': item.phoneNumber || 'N/A',
          Time: new Date(item.timestamp).toLocaleString(),
        }));
        const wsForgot = XLSX.utils.json_to_sheet(forgotData);
        XLSX.utils.book_append_sheet(wb, wsForgot, 'Forgot ID');
      }

      // Generate Excel file as base64
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const ethDate = gregorianToEthiopian(session.date);
      const filename = `Attendance_${ethDate.day}_${ethDate.monthName}_${ethDate.year}_${Date.now()}.xlsx`;
      const fileUri = FileSystem.cacheDirectory + filename;

      // Write file using legacy API
      await FileSystem.writeAsStringAsync(fileUri, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Share the file
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Save Attendance File',
        UTI: 'com.microsoft.excel.xlsx',
      });
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Error', error.message || 'Failed to export attendance data. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    const ethDate = gregorianToEthiopian(dateString);
    return `${ethDate.day} ${ethDate.monthName} ${ethDate.year}`;
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleUploadExcel = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel'
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const fileUri = result.assets[0].uri;
      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: 'base64',
      });

      // Parse Excel file
      const workbook = XLSX.read(fileContent, { type: 'base64' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Transform data to match our structure
      // Expected columns: NameAmharic, Full Name, Phone, ID, Department
      const employees = jsonData.map((row) => ({
        id: String(row.ID || row.id || '').trim(),
        nameAmharic: String(row.NameAmharic || row['Name Amharic'] || '').trim(),
        fullName: String(row['Full Name'] || row.FullName || row.Name || '').trim(),
        phoneNumber: String(row.Phone || row.PhoneNumber || row['Phone Number'] || '').trim(),
        department: String(row.Department || row.Dept || '').trim(),
      })).filter(emp => emp.id || emp.phoneNumber); // Keep only valid records

      if (employees.length === 0) {
        Alert.alert('ስህተት', 'የተሳካ መረጃ ከማግኘት አልተቻለም። እባክዎ ፋይሉን ያረጋግጡ።\n\nError: No valid data found in Excel file.');
        return;
      }

      // Save to database
      const success = await saveEmployees(employees);

      if (success) {
        Alert.alert(
          'ተሳክቷል!',
          `${employees.length} ሰራተኞች/ተማሪዎች ተጭነዋል።\n\n${employees.length} employees/students imported successfully!`,
          [{ text: 'እሺ' }]
        );
      } else {
        Alert.alert('ስህተት', 'መረጃን ማስቀመጥ አልተቻለም።\n\nFailed to save data.');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert(
        'የማስመጣት ስህተት',
        error.message || 'ፋይሉን ማስመጣት አልተቻለም። እባክዎ እንደገና ይሞክሩ።\n\nFailed to import file. Please try again.'
      );
    }
  };

  const renderSession = ({ item }) => {
    const totalCount = item.idAttendance.length + item.forgotIdAttendance.length;
    // Show creation time for in-progress, completion time for finished sessions
    const displayTime = item.completed && item.completedAt
      ? formatTime(item.completedAt)
      : formatTime(item.createdAt || item.date);

    return (
      <TouchableOpacity
        style={styles.sessionCard}
        onPress={() => handleSessionPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.sessionHeader}>
          <View>
            <Text style={styles.sessionDate}>{formatDate(item.date)}</Text>
            <Text style={styles.sessionStatus}>
              {item.completed ? `✓ ተጠናቀቀ ${displayTime}` : `⏱ በሂደት ላይ ${displayTime}`}
            </Text>
          </View>
          <View style={styles.sessionStats}>
            <Text style={styles.sessionTotal}>{totalCount}</Text>
            <Text style={styles.sessionTotalLabel}>ጠቅላላ</Text>
          </View>
        </View>

        <View style={styles.sessionCounts}>
          <View style={styles.countBox}>
            <Text style={styles.countNumber}>{item.idAttendance.length}</Text>
            <Text style={styles.countLabel}>መታወቂያ ያላቸው</Text>
          </View>
          <View style={styles.countBox}>
            <Text style={styles.countNumber}>{item.forgotIdAttendance.length}</Text>
            <Text style={styles.countLabel}>መታወቂያ የረሱ</Text>
          </View>
        </View>

        <View style={styles.sessionActions}>
          <TouchableOpacity
            style={[
              styles.exportButton,
              !item.completed && styles.exportButtonDisabled
            ]}
            onPress={() => handleExportSession(item)}
            disabled={!item.completed}
          >
            <Text style={[
              styles.exportButtonText,
              !item.completed && styles.exportButtonTextDisabled
            ]}>
              📊 ያጋሩ
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteSession(item.id)}
          >
            <Text style={styles.deleteButtonText}>🗑 ሰርዝ</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>የምዝገባ ክፍለ ጊዜዎች</Text>
        <Text style={styles.headerSubtitle}>
          ጠቅላላ {sessions.length} {sessions.length === 1 ? 'ክፍለ ጊዜ' : 'ክፍለ ጊዜዎች'}
        </Text>

        {/* Action Buttons */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.uploadButton]}
            onPress={handleUploadExcel}
          >
            <Text style={styles.actionButtonText}>📂 Upload</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.manageButton]}
            onPress={() => navigation.navigate('EmployeeManagement')}
          >
            <Text style={styles.actionButtonText}>👥 Manage</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.reportButton]}
            onPress={() => navigation.navigate('Report')}
          >
            <Text style={styles.actionButtonText}>📊 Report</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Section */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowYearPicker(!showYearPicker)}
        >
          <Text style={styles.filterLabel}>ዓመት:</Text>
          <Text style={styles.filterValue}>{selectedYear}</Text>
          <Text style={styles.filterArrow}>▼</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowMonthPicker(!showMonthPicker)}
        >
          <Text style={styles.filterLabel}>ወር:</Text>
          <Text style={styles.filterValue}>{ethiopianMonths[selectedMonth]}</Text>
          <Text style={styles.filterArrow}>▼</Text>
        </TouchableOpacity>

        <View style={styles.filterInfo}>
          <Text style={styles.filterInfoText}>
            {filteredSessions.length} {filteredSessions.length === 1 ? 'ክፍለ ጊዜ' : 'ክፍለ ጊዜዎች'}
          </Text>
        </View>
      </View>

      {/* Year Picker Modal */}
      <Modal
        visible={showYearPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowYearPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowYearPicker(false)}
        >
          <View style={styles.pickerModal}>
            <Text style={styles.pickerTitle}>ዓመት ይምረጡ</Text>
            {availableYears.map(year => (
              <TouchableOpacity
                key={year}
                style={[
                  styles.pickerItem,
                  selectedYear === year && styles.pickerItemSelected
                ]}
                onPress={() => {
                  setSelectedYear(year);
                  setShowYearPicker(false);
                }}
              >
                <Text style={[
                  styles.pickerItemText,
                  selectedYear === year && styles.pickerItemTextSelected
                ]}>
                  {year}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Month Picker Modal */}
      <Modal
        visible={showMonthPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMonthPicker(false)}
        >
          <View style={styles.pickerModal}>
            <Text style={styles.pickerTitle}>ወር ይምረጡ</Text>
            <ScrollView style={styles.pickerScrollView}>
              {ethiopianMonths.map((month, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.pickerItem,
                    selectedMonth === index && styles.pickerItemSelected
                  ]}
                  onPress={() => {
                    setSelectedMonth(index);
                    setShowMonthPicker(false);
                  }}
                >
                  <Text style={[
                    styles.pickerItemText,
                    selectedMonth === index && styles.pickerItemTextSelected
                  ]}>
                    {month}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <FlatList
        data={filteredSessions}
        renderItem={renderSession}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>ገና ምንም ክፍለ ጊዜ የለም</Text>
            <Text style={styles.emptySubtext}>ለመጀመር + ቁልፉን ጫን</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      <TouchableOpacity style={styles.fab} onPress={handleAddSession}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Ethiopian Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.ethDatePickerModal}>
            <Text style={styles.ethDatePickerTitle}>ቀን ይምረጡ (Select Date)</Text>

            <View style={styles.ethDateDisplay}>
              <Text style={styles.ethDateDisplayText}>
                {ethDay} {ethiopianMonths[ethMonth]} {ethYear}
              </Text>
            </View>

            <View style={styles.ethDatePickerRow}>
              <TouchableOpacity
                style={styles.ethDatePickerButton}
                onPress={() => setShowEthDayPicker(true)}
              >
                <Text style={styles.ethDatePickerLabel}>ቀን (Day)</Text>
                <Text style={styles.ethDatePickerValue}>{ethDay}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.ethDatePickerButton}
                onPress={() => setShowEthMonthPicker(true)}
              >
                <Text style={styles.ethDatePickerLabel}>ወር (Month)</Text>
                <Text style={styles.ethDatePickerValue}>{ethiopianMonths[ethMonth]}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.ethDatePickerButton}
                onPress={() => setShowEthYearPicker(true)}
              >
                <Text style={styles.ethDatePickerLabel}>ዓመት (Year)</Text>
                <Text style={styles.ethDatePickerValue}>{ethYear}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.ethDatePickerActions}>
              <TouchableOpacity
                style={styles.ethDateCancelButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.ethDateCancelText}>ሰርዝ (Cancel)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.ethDateConfirmButton}
                onPress={handleCreateSessionWithEthDate}
              >
                <Text style={styles.ethDateConfirmText}>ፍጠር (Create)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Ethiopian Year Picker */}
      <Modal
        visible={showEthYearPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEthYearPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowEthYearPicker(false)}
        >
          <View style={styles.pickerModal}>
            <Text style={styles.pickerTitle}>ዓመት ይምረጡ</Text>
            <ScrollView style={styles.pickerScrollView}>
              {getEthiopianYears(20).map(year => (
                <TouchableOpacity
                  key={year}
                  style={[
                    styles.pickerItem,
                    ethYear === year && styles.pickerItemSelected
                  ]}
                  onPress={() => {
                    setEthYear(year);
                    setShowEthYearPicker(false);
                  }}
                >
                  <Text style={[
                    styles.pickerItemText,
                    ethYear === year && styles.pickerItemTextSelected
                  ]}>
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Ethiopian Month Picker */}
      <Modal
        visible={showEthMonthPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEthMonthPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowEthMonthPicker(false)}
        >
          <View style={styles.pickerModal}>
            <Text style={styles.pickerTitle}>ወር ይምረጡ</Text>
            <ScrollView style={styles.pickerScrollView}>
              {ethiopianMonths.map((month, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.pickerItem,
                    ethMonth === index && styles.pickerItemSelected
                  ]}
                  onPress={() => {
                    setEthMonth(index);
                    setEthDay(1); // Reset day to 1 when month changes
                    setShowEthMonthPicker(false);
                  }}
                >
                  <Text style={[
                    styles.pickerItemText,
                    ethMonth === index && styles.pickerItemTextSelected
                  ]}>
                    {month}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Ethiopian Day Picker */}
      <Modal
        visible={showEthDayPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEthDayPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowEthDayPicker(false)}
        >
          <View style={styles.pickerModal}>
            <Text style={styles.pickerTitle}>ቀን ይምረጡ</Text>
            <ScrollView style={styles.pickerScrollView}>
              {getDaysInEthiopianMonth(ethMonth).map(day => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.pickerItem,
                    ethDay === day && styles.pickerItemSelected
                  ]}
                  onPress={() => {
                    setEthDay(day);
                    setShowEthDayPicker(false);
                  }}
                >
                  <Text style={[
                    styles.pickerItemText,
                    ethDay === day && styles.pickerItemTextSelected
                  ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1e3a8a',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#1e3a8a',
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#93c5fd',
    marginBottom: 12,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  uploadButton: {
    backgroundColor: '#10b981',
  },
  manageButton: {
    backgroundColor: '#8b5cf6',
  },
  reportButton: {
    backgroundColor: '#3b82f6',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  sessionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sessionDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  sessionStatus: {
    fontSize: 12,
    color: '#64748b',
  },
  sessionStats: {
    alignItems: 'center',
  },
  sessionTotal: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  sessionTotalLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  sessionCounts: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  countBox: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    minWidth: 100,
  },
  countNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  countLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  sessionActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  exportButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  exportButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  exportButtonDisabled: {
    backgroundColor: '#94a3b8',
    opacity: 0.5,
  },
  exportButtonTextDisabled: {
    color: '#cbd5e1',
  },
  downloadButton: {
    flex: 1,
    backgroundColor: '#10b981',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  downloadButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  downloadButtonDisabled: {
    backgroundColor: '#94a3b8',
    opacity: 0.5,
  },
  downloadButtonTextDisabled: {
    color: '#cbd5e1',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 32,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  filterLabel: {
    fontSize: 14,
    color: '#64748b',
    marginRight: 6,
  },
  filterValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginRight: 4,
  },
  filterArrow: {
    fontSize: 10,
    color: '#64748b',
  },
  filterInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  filterInfoText: {
    fontSize: 12,
    color: '#64748b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModal: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center',
  },
  pickerScrollView: {
    maxHeight: 400,
  },
  pickerItem: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f8fafc',
  },
  pickerItemSelected: {
    backgroundColor: '#3b82f6',
  },
  pickerItemText: {
    fontSize: 16,
    color: '#1e293b',
    textAlign: 'center',
  },
  pickerItemTextSelected: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  ethDatePickerModal: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  ethDatePickerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginBottom: 20,
    textAlign: 'center',
  },
  ethDateDisplay: {
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  ethDateDisplayText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e3a8a',
    textAlign: 'center',
  },
  ethDatePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  ethDatePickerButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  ethDatePickerLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  ethDatePickerValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  ethDatePickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ethDateCancelButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    padding: 14,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  ethDateCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  ethDateConfirmButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    padding: 14,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
  },
  ethDateConfirmText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});

export default MainScreen;
