import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAllSessions, getAllEmployees, getEmployeeById } from '../utils/storage';
import { gregorianToEthiopian, ethiopianMonths, getDaysInEthiopianMonth, getEthiopianYears, getCurrentEthiopianDate } from '../utils/ethiopianCalendar';

const ReportScreen = ({ navigation }) => {
  const [reportData, setReportData] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Ethiopian date picker state (shared for filters)
  const currentEthDate = getCurrentEthiopianDate();
  const [ethYear, setEthYear] = useState(currentEthDate.year);
  const [ethMonth, setEthMonth] = useState(currentEthDate.month);
  const [ethDay, setEthDay] = useState(currentEthDate.day);
  const [showEthYearPicker, setShowEthYearPicker] = useState(false);
  const [showEthMonthPicker, setShowEthMonthPicker] = useState(false);
  const [showEthDayPicker, setShowEthDayPicker] = useState(false);

  // Filter state
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null); // null means "All days"
  const [totalAttendance, setTotalAttendance] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (sessions.length > 0 && selectedYear && selectedMonth !== null) {
      generateReport();
    }
  }, [sessions, selectedYear, selectedMonth, selectedDay, employees]);

  const loadData = async () => {
    const allSessions = await getAllSessions();
    const allEmployees = await getAllEmployees();

    setSessions(allSessions);
    setEmployees(allEmployees);

    // Set default to current or most recent
    if (allSessions.length > 0) {
      const mostRecentSession = allSessions[allSessions.length - 1];
      const mostRecentEthDate = gregorianToEthiopian(mostRecentSession.date);
      setSelectedYear(mostRecentEthDate.year);
      setSelectedMonth(mostRecentEthDate.month);
      setSelectedDay(null); // Show all days by default
      setEthYear(mostRecentEthDate.year);
      setEthMonth(mostRecentEthDate.month);
      setEthDay(mostRecentEthDate.day);
    }
  };

  const generateReport = () => {
    // Filter sessions by selected year, month, and day
    const filteredSessions = sessions.filter(session => {
      const ethDate = gregorianToEthiopian(session.date);
      const yearMatch = ethDate.year === selectedYear;
      const monthMatch = ethDate.month === selectedMonth;
      const dayMatch = selectedDay === null || ethDate.day === selectedDay;
      return yearMatch && monthMatch && dayMatch && session.completed;
    });

    // Count attendance by department
    const departmentCounts = {};
    let total = 0;

    filteredSessions.forEach(session => {
      // Count ID attendance
      session.idAttendance.forEach(async (attendance) => {
        const employee = employees.find(emp => emp.id === attendance.id);
        if (employee && employee.department) {
          const dept = employee.department;
          departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
          total++;
        } else {
          // Unknown department
          departmentCounts['Unknown'] = (departmentCounts['Unknown'] || 0) + 1;
          total++;
        }
      });

      // Count Forgot ID attendance
      session.forgotIdAttendance.forEach((attendance) => {
        const dept = attendance.department || 'Unknown';
        departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
        total++;
      });
    });

    // Convert to array and sort
    const reportArray = Object.entries(departmentCounts).map(([department, count]) => ({
      department,
      count,
      percentage: total > 0 ? ((count / total) * 100).toFixed(1) : 0,
    })).sort((a, b) => b.count - a.count);

    setReportData(reportArray);
    setTotalAttendance(total);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Attendance Report</Text>
          <Text style={styles.headerSubtitle}>የተገኝነት ሪፖርት</Text>
        </View>

        {/* Filter Section */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => {
              setEthYear(selectedYear || currentEthDate.year);
              setEthMonth(selectedMonth !== null ? selectedMonth : currentEthDate.month);
              setEthDay(selectedDay === null ? 1 : selectedDay);
              setShowEthYearPicker(true);
            }}
          >
            <Text style={styles.filterLabel}>ዓመት:</Text>
            <Text style={styles.filterValue}>{selectedYear || 'Select'}</Text>
            <Text style={styles.filterArrow}>▼</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => {
              setEthYear(selectedYear || currentEthDate.year);
              setEthMonth(selectedMonth !== null ? selectedMonth : currentEthDate.month);
              setEthDay(selectedDay === null ? 1 : selectedDay);
              setShowEthMonthPicker(true);
            }}
          >
            <Text style={styles.filterLabel}>ወር:</Text>
            <Text style={styles.filterValue}>
              {selectedMonth !== null ? ethiopianMonths[selectedMonth] : 'Select'}
            </Text>
            <Text style={styles.filterArrow}>▼</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => {
              setEthYear(selectedYear || currentEthDate.year);
              setEthMonth(selectedMonth !== null ? selectedMonth : currentEthDate.month);
              setEthDay(selectedDay === null ? 1 : selectedDay);
              setShowEthDayPicker(true);
            }}
          >
            <Text style={styles.filterLabel}>ቀን:</Text>
            <Text style={styles.filterValue}>{selectedDay === null ? 'ሁሉም' : selectedDay}</Text>
            <Text style={styles.filterArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* Total Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Total Attendance</Text>
          <Text style={styles.summaryNumber}>{totalAttendance}</Text>
          <Text style={styles.summarySubtitle}>
            {selectedMonth !== null ? ethiopianMonths[selectedMonth] : ''} {selectedYear}
          </Text>
        </View>

        {/* Department Reports */}
        <ScrollView style={styles.reportList} contentContainerStyle={styles.reportListContent}>
          <Text style={styles.sectionTitle}>By Department (በክፍል)</Text>

          {reportData.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={styles.emptyText}>No attendance data for this period</Text>
            </View>
          ) : (
            reportData.map((item, index) => (
              <View key={index} style={styles.reportCard}>
                <View style={styles.reportCardLeft}>
                  <Text style={styles.departmentName}>{item.department}</Text>
                  <Text style={styles.departmentPercentage}>{item.percentage}% of total</Text>
                </View>
                <View style={styles.reportCardRight}>
                  <Text style={styles.departmentCount}>{item.count}</Text>
                  <Text style={styles.departmentLabel}>attendees</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>

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
                      setSelectedYear(year);
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
                      setSelectedMonth(index);
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
                <TouchableOpacity
                  style={[
                    styles.pickerItem,
                    selectedDay === null && styles.pickerItemSelected
                  ]}
                  onPress={() => {
                    setSelectedDay(null);
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
                {getDaysInEthiopianMonth(ethMonth).map(day => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.pickerItem,
                      ethDay === day && styles.pickerItemSelected
                    ]}
                    onPress={() => {
                      setEthDay(day);
                      setSelectedDay(day);
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
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    color: '#93c5fd',
    fontSize: 16,
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
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  filterLabel: {
    fontSize: 14,
    color: '#64748b',
    marginRight: 8,
  },
  filterValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  filterArrow: {
    fontSize: 12,
    color: '#94a3b8',
  },
  summaryCard: {
    backgroundColor: '#3b82f6',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  summaryTitle: {
    fontSize: 14,
    color: '#dbeafe',
    marginBottom: 8,
  },
  summaryNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  summarySubtitle: {
    fontSize: 14,
    color: '#dbeafe',
  },
  reportList: {
    flex: 1,
  },
  reportListContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  reportCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  reportCardLeft: {
    flex: 1,
  },
  departmentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  departmentPercentage: {
    fontSize: 12,
    color: '#64748b',
  },
  reportCardRight: {
    alignItems: 'flex-end',
  },
  departmentCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: 2,
  },
  departmentLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '50%',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  pickerScroll: {
    maxHeight: 300,
  },
  pickerItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  pickerItemSelected: {
    backgroundColor: '#dbeafe',
  },
  pickerItemText: {
    fontSize: 16,
    color: '#1e293b',
    textAlign: 'center',
  },
  pickerItemTextSelected: {
    color: '#3b82f6',
    fontWeight: '600',
  },
});

export default ReportScreen;
