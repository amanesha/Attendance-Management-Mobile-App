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
import { gregorianToEthiopian, ethiopianMonths } from '../utils/ethiopianCalendar';

const ReportScreen = ({ navigation }) => {
  const [reportData, setReportData] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [availableYears, setAvailableYears] = useState([]);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [totalAttendance, setTotalAttendance] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (sessions.length > 0 && selectedYear && selectedMonth !== null) {
      generateReport();
    }
  }, [sessions, selectedYear, selectedMonth, employees]);

  const loadData = async () => {
    const allSessions = await getAllSessions();
    const allEmployees = await getAllEmployees();

    setSessions(allSessions);
    setEmployees(allEmployees);

    // Get available years from sessions
    const ethYears = [...new Set(allSessions.map(s => gregorianToEthiopian(s.date).year))];
    setAvailableYears(ethYears.sort((a, b) => b - a));

    // Set default to current or most recent
    if (allSessions.length > 0) {
      const mostRecentSession = allSessions[allSessions.length - 1];
      const mostRecentEthDate = gregorianToEthiopian(mostRecentSession.date);
      setSelectedYear(mostRecentEthDate.year);
      setSelectedMonth(mostRecentEthDate.month);
    }
  };

  const generateReport = () => {
    // Filter sessions by selected year and month
    const filteredSessions = sessions.filter(session => {
      const ethDate = gregorianToEthiopian(session.date);
      return ethDate.year === selectedYear && ethDate.month === selectedMonth && session.completed;
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
            onPress={() => setShowYearPicker(!showYearPicker)}
          >
            <Text style={styles.filterLabel}>ዓመት:</Text>
            <Text style={styles.filterValue}>{selectedYear || 'Select'}</Text>
            <Text style={styles.filterArrow}>▼</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowMonthPicker(!showMonthPicker)}
          >
            <Text style={styles.filterLabel}>ወር:</Text>
            <Text style={styles.filterValue}>
              {selectedMonth !== null ? ethiopianMonths[selectedMonth] : 'Select'}
            </Text>
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

        {/* Year Picker Modal */}
        <Modal
          visible={showYearPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowYearPicker(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowYearPicker(false)}
          >
            <View style={styles.pickerModal}>
              <Text style={styles.pickerTitle}>Select Year</Text>
              <ScrollView style={styles.pickerScroll}>
                {availableYears.map((year) => (
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
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Month Picker Modal */}
        <Modal
          visible={showMonthPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowMonthPicker(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowMonthPicker(false)}
          >
            <View style={styles.pickerModal}>
              <Text style={styles.pickerTitle}>Select Month</Text>
              <ScrollView style={styles.pickerScroll}>
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
