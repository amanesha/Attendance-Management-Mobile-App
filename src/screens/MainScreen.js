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
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAllSessions,
  createSession,
  setActiveSession,
  deleteSession,
  getAllEmployees,
} from '../utils/storage';
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
  const [expandedSessionId, setExpandedSessionId] = useState(null);
  const [departmentStatsCache, setDepartmentStatsCache] = useState({});

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
  const [selectedDay, setSelectedDay] = useState(null); // null means "All days"
  const [isFilterMode, setIsFilterMode] = useState(false); // Track if pickers are being used for filter or create

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

    if (allSessions.length > 0) {
      // Get the most recent session's Ethiopian date
      const mostRecentSession = allSessions[0];
      const mostRecentEthDate = gregorianToEthiopian(mostRecentSession.date);

      // Set filter to most recent session's month/year
      setSelectedYear(mostRecentEthDate.year);
      setSelectedMonth(mostRecentEthDate.month);
      setSelectedDay(null); // Show all days by default

      // Filter sessions with the most recent date
      filterSessions(allSessions, mostRecentEthDate.year, mostRecentEthDate.month, null);
    } else {
      setFilteredSessions([]);
    }
  };

  const filterSessions = (allSessions, year, month, day) => {
    const filtered = allSessions.filter(session => {
      const ethDate = gregorianToEthiopian(session.date);
      const yearMatch = ethDate.year === year;
      const monthMatch = ethDate.month === month;
      const dayMatch = day === null || ethDate.day === day;
      return yearMatch && monthMatch && dayMatch;
    });
    setFilteredSessions(filtered);
  };

  useEffect(() => {
    if (sessions.length > 0) {
      filterSessions(sessions, selectedYear, selectedMonth, selectedDay);
    }
  }, [selectedYear, selectedMonth, selectedDay]);

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
    setIsFilterMode(false); // Make sure we're in create mode, not filter mode
    setShowDatePicker(true);
  };

  const handleCreateSessionWithEthDate = async () => {
    // Convert Ethiopian date to Gregorian
    const gregorianDate = ethiopianToGregorian(ethYear, ethMonth, ethDay);
    const session = await createSession(gregorianDate.toISOString());
    if (session) {
      await setActiveSession(session);

      // Update filter to show the newly created session
      setSelectedYear(ethYear);
      setSelectedMonth(ethMonth);
      setSelectedDay(ethDay);

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

      // Load all employees to get department info
      const allEmployees = await getAllEmployees();
      const employeeMap = {};
      allEmployees.forEach(emp => {
        if (emp.id) {
          employeeMap[emp.id] = emp;
        }
      });

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Group attendance by department
      const departmentData = {};

      // Process ID attendance
      session.idAttendance.forEach(attendance => {
        const employee = employeeMap[attendance.id];
        const dept = employee?.department || 'Unknown';

        if (!departmentData[dept]) {
          departmentData[dept] = [];
        }

        departmentData[dept].push({
          No: departmentData[dept].length + 1,
          ID: attendance.id,
          'Full Name': employee?.fullName || 'N/A',
          Department: dept,
          'Phone Number': employee?.phoneNumber || 'N/A',
          Time: new Date(attendance.timestamp).toLocaleString(),
        });
      });

      // Process Forgot ID attendance
      session.forgotIdAttendance.forEach(attendance => {
        const dept = attendance.department || 'Unknown';

        if (!departmentData[dept]) {
          departmentData[dept] = [];
        }

        departmentData[dept].push({
          No: departmentData[dept].length + 1,
          ID: 'N/A',
          'Full Name': attendance.fullName || 'N/A',
          Department: dept,
          'Phone Number': attendance.phoneNumber || 'N/A',
          Time: new Date(attendance.timestamp).toLocaleString(),
        });
      });

      // Create a summary sheet
      const summaryData = Object.entries(departmentData)
        .map(([dept, records]) => ({
          Department: dept,
          'Total Attendance': records.length,
          Percentage: ((records.length / (session.idAttendance.length + session.forgotIdAttendance.length)) * 100).toFixed(1) + '%',
        }))
        .sort((a, b) => b['Total Attendance'] - a['Total Attendance']);

      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

      // Create a sheet for each department
      Object.entries(departmentData)
        .sort(([deptA], [deptB]) => deptA.localeCompare(deptB))
        .forEach(([dept, records]) => {
          // Renumber the records for each department sheet
          const numberedRecords = records.map((record, index) => ({
            ...record,
            No: index + 1,
          }));

          const ws = XLSX.utils.json_to_sheet(numberedRecords);
          // Limit sheet name to 31 characters (Excel limitation)
          const sheetName = dept.substring(0, 31);
          XLSX.utils.book_append_sheet(wb, ws, sheetName);
        });

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

  const calculateDepartmentStats = async (session) => {
    const allEmployees = await getAllEmployees();
    const employeeMap = {};
    allEmployees.forEach(emp => {
      if (emp.id) {
        employeeMap[emp.id] = emp;
      }
    });

    const departmentCounts = {};
    const totalCount = session.idAttendance.length + session.forgotIdAttendance.length;

    // Process ID attendance
    session.idAttendance.forEach(attendance => {
      const employee = employeeMap[attendance.id];
      const dept = employee?.department || 'Unknown';
      departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
    });

    // Process Forgot ID attendance
    session.forgotIdAttendance.forEach(attendance => {
      const dept = attendance.department || 'Unknown';
      departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
    });

    // Convert to array and sort by count
    return Object.entries(departmentCounts)
      .map(([dept, count]) => ({
        department: dept,
        count: count,
        percentage: ((count / totalCount) * 100).toFixed(1),
      }))
      .sort((a, b) => b.count - a.count);
  };

  const toggleSessionExpansion = (sessionId) => {
    setExpandedSessionId(expandedSessionId === sessionId ? null : sessionId);
  };

  const renderSession = ({ item }) => {
    const totalCount = item.idAttendance.length + item.forgotIdAttendance.length;
    const isExpanded = expandedSessionId === item.id;
    const departmentStats = departmentStatsCache[item.id] || [];

    // Show creation time for in-progress, completion time for finished sessions
    const displayTime = item.completed && item.completedAt
      ? formatTime(item.completedAt)
      : formatTime(item.createdAt || item.date);

    const handleDropdownToggle = async () => {
      if (!isExpanded && totalCount > 0 && !departmentStatsCache[item.id]) {
        const stats = await calculateDepartmentStats(item);
        setDepartmentStatsCache(prev => ({
          ...prev,
          [item.id]: stats
        }));
      }
      toggleSessionExpansion(item.id);
    };

    return (
      <View style={styles.sessionCard}>
        <TouchableOpacity
          onPress={() => handleSessionPress(item)}
          activeOpacity={0.7}
        >
          <View style={styles.sessionHeader}>
            <View style={styles.sessionDateContainer}>
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
        </TouchableOpacity>

        {totalCount > 0 && (
          <TouchableOpacity
            style={styles.dropdownToggle}
            onPress={handleDropdownToggle}
            activeOpacity={0.7}
          >
            <Text style={styles.dropdownToggleText}>
              {isExpanded ? '▲ Hide Department Summary' : '▼ Show Department Summary'}
            </Text>
          </TouchableOpacity>
        )}

        {isExpanded && departmentStats.length > 0 && (
          <View style={styles.departmentSummary}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>Department Summary</Text>
            </View>

            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.deptColumn]}>Department</Text>
                <Text style={[styles.tableHeaderText, styles.countColumn]}>Total</Text>
                <Text style={[styles.tableHeaderText, styles.percentColumn]}>Percentage</Text>
              </View>

              {departmentStats.map((stat, index) => (
                <View
                  key={index}
                  style={[
                    styles.tableRow,
                    index % 2 === 0 && styles.tableRowEven
                  ]}
                >
                  <Text style={[styles.tableCell, styles.deptColumn]}>{stat.department}</Text>
                  <Text style={[styles.tableCell, styles.countColumn]}>{stat.count}</Text>
                  <Text style={[styles.tableCell, styles.percentColumn]}>{stat.percentage}%</Text>
                </View>
              ))}
            </View>
          </View>
        )}

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
              {item.completed ? '📊 ያጋሩ' : '🔒 በሂደት ላይ'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteSession(item.id)}
          >
            <Text style={styles.deleteButtonText}>🗑 ሰርዝ</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('@user_authenticated');
              navigation.replace('Login');
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>የምዝገባ ክፍለ ጊዜዎች</Text>
            <Text style={styles.headerSubtitle}>
              ጠቅላላ {sessions.length} {sessions.length === 1 ? 'ክፍለ ጊዜ' : 'ክፍለ ጊዜዎች'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>⎋ Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.manageButton]}
            onPress={() => navigation.navigate('EmployeeManagement')}
          >
            <Text style={styles.actionButtonText}>👥 Manage Database</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.reportButton]}
            onPress={() => navigation.navigate('Report')}
          >
            <Text style={styles.actionButtonText}>📊 View Report</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Section */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => {
            setIsFilterMode(true);
            setEthYear(selectedYear);
            setEthMonth(selectedMonth);
            setEthDay(selectedDay === null ? 1 : selectedDay);
            setShowEthYearPicker(true);
          }}
        >
          <Text style={styles.filterLabel}>ዓመት:</Text>
          <Text style={styles.filterValue}>{selectedYear}</Text>
          <Text style={styles.filterArrow}>▼</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => {
            setIsFilterMode(true);
            setEthYear(selectedYear);
            setEthMonth(selectedMonth);
            setEthDay(selectedDay === null ? 1 : selectedDay);
            setShowEthMonthPicker(true);
          }}
        >
          <Text style={styles.filterLabel}>ወር:</Text>
          <Text style={styles.filterValue}>{ethiopianMonths[selectedMonth]}</Text>
          <Text style={styles.filterArrow}>▼</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => {
            setIsFilterMode(true);
            setEthYear(selectedYear);
            setEthMonth(selectedMonth);
            setEthDay(selectedDay === null ? 1 : selectedDay);
            setShowEthDayPicker(true);
          }}
        >
          <Text style={styles.filterLabel}>ቀን:</Text>
          <Text style={styles.filterValue}>{selectedDay === null ? 'ሁሉም' : selectedDay}</Text>
          <Text style={styles.filterArrow}>▼</Text>
        </TouchableOpacity>

        <View style={styles.filterInfo}>
          <Text style={styles.filterInfoText}>
            {filteredSessions.length}
          </Text>
        </View>
      </View>

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
                    if (isFilterMode) {
                      setSelectedYear(year);
                      setIsFilterMode(false);
                    }
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
                    if (isFilterMode) {
                      setSelectedMonth(index);
                      setIsFilterMode(false);
                    }
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
              {isFilterMode && (
                <TouchableOpacity
                  style={[
                    styles.pickerItem,
                    selectedDay === null && styles.pickerItemSelected
                  ]}
                  onPress={() => {
                    setSelectedDay(null);
                    setIsFilterMode(false);
                    setShowEthDayPicker(false);
                  }}
                >
                  <Text style={[
                    styles.pickerItemText,
                    selectedDay === null && styles.pickerItemTextSelected
                  ]}>
                    ሁሉም ቀናት (All Days)
                  </Text>
                </TouchableOpacity>
              )}
              {getDaysInEthiopianMonth(ethMonth).map(day => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.pickerItem,
                    ethDay === day && styles.pickerItemSelected
                  ]}
                  onPress={() => {
                    setEthDay(day);
                    if (isFilterMode) {
                      setSelectedDay(day);
                      setIsFilterMode(false);
                    }
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
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerTitleContainer: {
    flex: 1,
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
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
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
  sessionDateContainer: {
    flex: 1,
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
  dropdownIndicator: {
    fontSize: 12,
    color: '#3b82f6',
    marginTop: 4,
  },
  dropdownToggle: {
    backgroundColor: '#eff6ff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  dropdownToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e3a8a',
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
    backgroundColor: '#f59e0b',
    opacity: 1,
  },
  exportButtonTextDisabled: {
    color: '#ffffff',
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
  departmentSummary: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  summaryHeader: {
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  tableContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableRowEven: {
    backgroundColor: '#ffffff',
  },
  tableCell: {
    fontSize: 13,
    color: '#1e293b',
  },
  deptColumn: {
    flex: 2,
  },
  countColumn: {
    flex: 1,
    textAlign: 'center',
  },
  percentColumn: {
    flex: 1,
    textAlign: 'right',
  },
});

export default MainScreen;
